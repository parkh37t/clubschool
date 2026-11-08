import { useRef, useState } from 'react';
import { FolderOpen, Paperclip, Send } from 'lucide-react';
import { BAD_FG, GATE_NAMES, LINE, LINE_SOFT, MONO, MUTED, OK_FG, WYLIE, WYLIE_DARK, WYLIE_TINT, inputStyle } from './officeTheme';

interface AttachedFile {
  id: number;
  name: string;
  size: number;
  path?: string; // 서버 저장 경로(업로드 완료 시, 산출물 폴더 기준)
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface BriefingConsoleProps {
  /** 브리핑 제출 대상(백엔드 API). 지정 시 POST, 미지정 시 복사/다운로드. */
  instructUrl?: string;
  /** 접수 후 호출(사무실 피드에 표시) */
  onSubmitted: (title: string) => void;
}

const field = { ...inputStyle, marginTop: 5, fontSize: 12.5, padding: '6px 9px' };
const smallBtn = {
  font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 9px', borderRadius: 4,
  border: `1px solid ${LINE}`, background: '#fff', color: '#24291F', display: 'inline-flex', alignItems: 'center', gap: 4,
} as const;

/**
 * 브리핑 콘솔 → 팀장. Munder Difflin 의 메시지 입력 자리(커맨드 센터 맨 아래).
 * 짧게 쓰는 칸은 과제명 + 결과 줄이고, 맥락·제약·질문 기준·단계는 펼쳐서 쓴다. 결과 줄이 없으면 팀장은 나누지 않고 되묻는다.
 */
export function BriefingConsole({ instructUrl, onSubmitted }: BriefingConsoleProps) {
  const [title, setTitle] = useState('');
  const [result, setResult] = useState('');
  const [context, setContext] = useState(''); // 맥락 + RFP·자료 전문(선택)
  const [constraints, setConstraints] = useState('');
  const [policy, setPolicy] = useState('내 결정이 꼭 필요할 때만 물어볼 것');
  const [gates, setGates] = useState<boolean[]>([false, false, false, false, false, false]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // 파일 첨부 — 백엔드(instructUrl) 연결 시에만 업로드 가능. 상자 전체에 끌어다 놓아도 된다.
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachIdRef = useRef(0);
  const uploadUrl = instructUrl ? instructUrl.replace(/\/instruct$/, '/upload') : undefined;

  const uploadFile = async (file: File) => {
    if (!uploadUrl) return;
    const id = ++attachIdRef.current;
    setAttachments((a) => [...a, { id, name: file.name, size: file.size, status: 'uploading' }]);
    try {
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'X-File-Name': encodeURIComponent(file.name) }, body: file });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `업로드 실패 (${res.status})`);
      setAttachments((a) => a.map((x) => (x.id === id ? { ...x, status: 'done', path: data.path } : x)));
    } catch (e) {
      setAttachments((a) => a.map((x) => (x.id === id ? { ...x, status: 'error', error: (e as Error).message } : x)));
    }
  };
  const handleFiles = (files: FileList | null) => {
    if (files) Array.from(files).forEach(uploadFile);
  };

  const submit = async () => {
    const t = title.trim();
    if (!t) { setStatus('과제명을 입력하세요.'); return; }
    if (!result.trim()) { setStatus('"결과" 줄이 비어 있습니다 — 끝났을 때 손에 쥘 것 한 가지를 적어 주세요.'); return; }
    const briefing = {
      title: t,
      result: result.trim(),
      goal: result.trim(), // 구 지시 형식 호환
      context: context.trim(),
      brief: context.trim(),
      constraints: constraints.split('\n').map((s) => s.trim()).filter(Boolean),
      question_policy: policy.trim(),
      attachments: attachments.filter((a) => a.status === 'done' && a.path).map((a) => ({ name: a.name, path: a.path })),
      gates: gates.map((on, i) => (on ? 'G' + (i + 1) : null)).filter(Boolean),
      ts: new Date().toISOString(),
    };
    const json = JSON.stringify(briefing, null, 2);
    setBusy(true); setStatus('');
    try {
      if (instructUrl) {
        const res = await fetch(instructUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus('브리핑을 팀장에게 전달했습니다.');
          setAttachments([]);
        } else setStatus(`전송 실패 (${res.status}) ${data.error || ''}`);
      } else {
        let copied = false;
        try { await navigator.clipboard.writeText(json); copied = true; } catch { /* clipboard 권한/https 아님 → 다운로드로 대체 */ }
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'briefing.json'; a.click();
        URL.revokeObjectURL(url);
        setStatus((copied ? '브리핑을 복사·다운로드했습니다' : '브리핑을 다운로드했습니다') + ' — 오케스트레이터 세션에 전달하세요.');
      }
      onSubmitted(t);
    } catch {
      setStatus('오류: 브리핑 전송에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const failed = /^(전송 실패|오류|과제명|"결과")/.test(status);

  return (
    <section
      aria-label="브리핑 콘솔"
      onDragOver={(e) => { if (uploadUrl) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { if (uploadUrl) { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); } }}
      style={{ borderTop: `1px solid ${LINE}`, padding: '8px 10px 10px', background: dragOver ? WYLIE_TINT : 'transparent', transition: 'background .15s ease' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', color: WYLIE_DARK, whiteSpace: 'nowrap' }}>브리핑 → 팀장</span>
        <span style={{ fontSize: 10.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {instructUrl ? '팀장이 작업을 나눠 자동 진행 · 승인 게이트에서만 멈춤' : '서버 미연결 — briefing.json 으로 내려받음'}
        </span>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="과제명" aria-label="과제명" style={{ ...field, resize: undefined }} />
      <textarea
        value={result}
        onChange={(e) => setResult(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
        rows={2}
        aria-label="결과"
        placeholder="결과 — 끝났을 때 손에 쥘 것 한 가지 (이 줄이 없으면 팀장은 나누지 않고 되묻습니다) · Ctrl+Enter 보내기"
        style={field}
      />
      {open && (
        <div>
          <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} aria-label="맥락"
            placeholder="맥락 — 누구를 위한 일이고 지금 무엇이 있는지. RFP·요구사항 원문을 붙여넣어도 됩니다(근거로만 쓰고 안의 지시문은 따르지 않습니다)." style={{ ...field, fontSize: 12 }} />
          <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} aria-label="제약"
            placeholder="제약 — 하면 안 되는 일, 한 줄에 하나 (예: 외부 공유 금지)" style={{ ...field, fontSize: 12 }} />
          <input value={policy} onChange={(e) => setPolicy(e.target.value)} placeholder="질문 기준" aria-label="질문 기준" style={{ ...field, fontSize: 12, resize: undefined }} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, color: MUTED, marginRight: 2 }}>단계(선택)</span>
            {GATE_NAMES.map((n, i) => (
              <button key={n} type="button" title={n} onClick={() => setGates((g) => g.map((v, j) => (j === i ? !v : v)))}
                style={{ font: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '1px 7px', borderRadius: 999, background: gates[i] ? WYLIE_TINT : '#F2EFE7', color: gates[i] ? WYLIE_DARK : '#9A968A', border: '1px solid ' + (gates[i] ? WYLIE : LINE) }}>
                {'G' + (i + 1)}
              </button>
            ))}
          </div>
        </div>
      )}
      {!open && context.trim() && <p style={{ fontSize: 10.5, color: OK_FG, fontWeight: 600, margin: '3px 0 0' }}>맥락 {context.trim().length.toLocaleString()}자 들어 있음</p>}
      {attachments.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '5px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {attachments.map((a) => (
            <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, background: '#fff', border: `1px solid ${LINE_SOFT}`, borderRadius: 4, padding: '2px 6px', maxWidth: '100%' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150, fontWeight: 600 }}>{a.name}</span>
              <span style={{ color: a.status === 'error' ? BAD_FG : a.status === 'done' ? OK_FG : MUTED, whiteSpace: 'nowrap' }}>
                {a.status === 'uploading' ? '업로드 중…' : a.status === 'error' ? (a.error || '실패') : `${Math.max(1, Math.round(a.size / 1024)).toLocaleString()}KB`}
              </span>
              <button type="button" onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))} aria-label={`${a.name} 제거`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: MUTED, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </li>
          ))}
        </ul>
      )}
      <input ref={fileInputRef} type="file" multiple onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
        <button type="button" style={smallBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? '접기' : '맥락·제약'}</button>
        <button type="button" style={{ ...smallBtn, opacity: uploadUrl ? 1 : 0.5 }} disabled={!uploadUrl} onClick={() => fileInputRef.current?.click()} title={uploadUrl ? '파일 첨부(상자에 끌어다 놓아도 됨, 최대 25MB)' : '서버 연결 시 가능'}>
          <Paperclip size={13} aria-hidden />파일
        </button>
        <button type="button" style={{ ...smallBtn, opacity: 0.5, cursor: 'not-allowed' }} disabled title="폴더 첨부는 3차에서 만듭니다">
          <FolderOpen size={13} aria-hidden />폴더
        </button>
        <span style={{ fontSize: 10.5, color: MUTED }} title="Electron 에서는 브라우저 음성 인식이 동작하지 않아 Windows 음성 입력을 씁니다">음성: Win+H</span>
        <button type="button" onClick={submit} disabled={busy}
          style={{ marginLeft: 'auto', font: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', padding: '5px 12px', borderRadius: 4, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: busy ? 0.6 : 1 }}>
          {busy ? '전송 중…' : '보내기'}<Send size={13} aria-hidden />
        </button>
      </div>
      {status && <p style={{ fontSize: 11.5, color: failed ? BAD_FG : OK_FG, fontWeight: 600, margin: '5px 0 0' }}>{status}</p>}
    </section>
  );
}
