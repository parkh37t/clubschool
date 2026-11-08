import { useRef, useState } from 'react';
import { FolderOpen, Paperclip, Send } from 'lucide-react';
import { useOfficeLang } from './i18n';
import { BAD_FG, GATE_NAMES, LINE, LINE_SOFT, MONO, MUTED, OK_FG, WYLIE, WYLIE_DARK, WYLIE_TINT, inputStyle } from './officeTheme';
import { SIM_TEXT } from './simText';

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
  /** 대기열이 바뀌었을 때(띠를 바로 다시 읽게) */
  onQueued?: () => void;
}

const field = { ...inputStyle, marginTop: 5, fontSize: 12.5, padding: '6px 9px' };
const smallBtn = {
  font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 9px', borderRadius: 4,
  border: `1px solid ${LINE}`, background: '#fff', color: '#24291F', display: 'inline-flex', alignItems: 'center', gap: 4,
} as const;

/**
 * 커맨드 센터 맨 아래 입력창(Munder Difflin 의 메시지 입력 자리). 두 가지 쓰임:
 *   메시지      팀장에게 보내는 말 — 대기열에 쌓여 팀장 상주 세션이 한 건씩 답한다. 일을 맡기는 말이면 팀장이 브리핑으로 정리한다
 *   브리핑 양식  4요소(과제명·결과·맥락·제약)를 직접 적어 바로 브리핑 대기열에 넣는다. 결과 줄이 없으면 팀장은 나누지 않고 되묻는다
 */
export function BriefingConsole({ instructUrl, onSubmitted, onQueued }: BriefingConsoleProps) {
  const { t, lang } = useOfficeLang();
  const apiBase = instructUrl !== undefined ? instructUrl.replace(/\/api\/instruct$/, '') : undefined;
  const [mode, setMode] = useState<'message' | 'form'>(instructUrl ? 'message' : 'form');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState('');
  const [context, setContext] = useState(''); // 맥락 + RFP·자료 전문(선택)
  const [constraints, setConstraints] = useState('');
  const [policy, setPolicy] = useState('');
  const [gates, setGates] = useState<boolean[]>([false, false, false, false, false, false]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
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
      if (!res.ok || !data.ok) throw new Error(data.error || `${t('bc.uploadFailed')} (${res.status})`);
      setAttachments((a) => a.map((x) => (x.id === id ? { ...x, status: 'done', path: data.path } : x)));
    } catch (e) {
      setAttachments((a) => a.map((x) => (x.id === id ? { ...x, status: 'error', error: (e as Error).message } : x)));
    }
  };
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setMode('form');
    Array.from(files).forEach(uploadFile);
  };

  const say = (ok: boolean, text: string) => { setFailed(!ok); setStatus(text); };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text) { say(false, t('bc.needMsg')); return; }
    setBusy(true); setStatus('');
    try {
      const res = await fetch(`${apiBase}/api/queue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { say(true, t('bc.queued', { id: data.item?.id ?? '' })); setMessage(''); onQueued?.(); }
      else say(false, t('bc.failed', { s: res.status, e: data.error || '' }));
    } catch {
      say(false, t('bc.error'));
    } finally {
      setBusy(false);
    }
  };

  const sendBriefing = async () => {
    const ti = title.trim();
    if (!ti) { say(false, t('bc.needTitle')); return; }
    if (!result.trim()) { say(false, t('bc.needResult')); return; }
    const briefing = {
      title: ti,
      result: result.trim(),
      goal: result.trim(), // 구 지시 형식 호환
      context: context.trim(),
      brief: context.trim(),
      constraints: constraints.split('\n').map((s) => s.trim()).filter(Boolean),
      question_policy: policy.trim() || t('bc.policyDefault'),
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
        if (res.ok) { say(true, t('bc.queuedBrief', { id: data.queued ?? '', pos: data.position ?? 1 })); setAttachments([]); onQueued?.(); }
        else say(false, t('bc.failed', { s: res.status, e: data.error || '' }));
      } else {
        try { await navigator.clipboard.writeText(json); } catch { /* clipboard 권한/https 아님 → 다운로드로 대체 */ }
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'briefing.json'; a.click();
        URL.revokeObjectURL(url);
        say(true, t('bc.downloaded'));
      }
      onSubmitted(ti);
    } catch {
      say(false, t('bc.error'));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => (mode === 'message' ? sendMessage() : sendBriefing());
  const tabBtn = (m: 'message' | 'form', label: string) => (
    <button type="button" onClick={() => { setMode(m); setStatus(''); }} disabled={m === 'message' && !instructUrl} aria-pressed={mode === m}
      style={{ font: 'inherit', fontSize: 11.5, fontWeight: 800, cursor: m === 'message' && !instructUrl ? 'not-allowed' : 'pointer', padding: '1px 8px', borderRadius: 999, border: `1px solid ${mode === m ? WYLIE : LINE}`, background: mode === m ? WYLIE_TINT : '#fff', color: mode === m ? WYLIE_DARK : MUTED, opacity: m === 'message' && !instructUrl ? 0.5 : 1 }}>
      {label}
    </button>
  );

  return (
    <section
      aria-label={t('bc.title')}
      onDragOver={(e) => { if (uploadUrl) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { if (uploadUrl) { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); } }}
      style={{ borderTop: `1px solid ${LINE}`, padding: '8px 10px 10px', background: dragOver ? WYLIE_TINT : 'transparent', transition: 'background .15s ease' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', color: WYLIE_DARK, whiteSpace: 'nowrap' }}>{t('bc.title')} · {SIM_TEXT[lang].names.lead}</span>
        {tabBtn('message', t('bc.modeMsg'))}
        {tabBtn('form', t('bc.modeForm'))}
      </div>
      <div style={{ fontSize: 10.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {!instructUrl ? t('bc.offline') : mode === 'message' ? t('bc.hintMsg') : t('bc.hintForm')}
      </div>

      {mode === 'message' ? (
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} aria-label={t('bc.modeMsg')}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
          placeholder={t('bc.msgPlaceholder')} style={field} />
      ) : (
        <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('bc.titlePh')} aria-label={t('bc.titlePh')} style={{ ...field, resize: undefined }} />
          <textarea value={result} onChange={(e) => setResult(e.target.value)} rows={2} aria-label={t('bc.resultPh')}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
            placeholder={t('bc.resultPh')} style={field} />
          {open && (
            <div>
              <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} aria-label={t('bc.contextPh')} placeholder={t('bc.contextPh')} style={{ ...field, fontSize: 12 }} />
              <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} aria-label={t('bc.constraintsPh')} placeholder={t('bc.constraintsPh')} style={{ ...field, fontSize: 12 }} />
              <input value={policy} onChange={(e) => setPolicy(e.target.value)} placeholder={`${t('bc.policyPh')} — ${t('bc.policyDefault')}`} aria-label={t('bc.policyPh')} style={{ ...field, fontSize: 12, resize: undefined }} />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, color: MUTED, marginRight: 2 }}>{t('bc.stages')}</span>
                {GATE_NAMES.map((n, i) => (
                  <button key={n} type="button" title={SIM_TEXT[lang].gates[i]} onClick={() => setGates((g) => g.map((v, j) => (j === i ? !v : v)))}
                    style={{ font: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '1px 7px', borderRadius: 999, background: gates[i] ? WYLIE_TINT : '#F2EFE7', color: gates[i] ? WYLIE_DARK : '#9A968A', border: '1px solid ' + (gates[i] ? WYLIE : LINE) }}>
                    {'G' + (i + 1)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!open && context.trim() && <p style={{ fontSize: 10.5, color: OK_FG, fontWeight: 600, margin: '3px 0 0' }}>{t('bc.contextLen', { n: context.trim().length.toLocaleString() })}</p>}
        </>
      )}
      {attachments.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '5px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {attachments.map((a) => (
            <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, background: '#fff', border: `1px solid ${LINE_SOFT}`, borderRadius: 4, padding: '2px 6px', maxWidth: '100%' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150, fontWeight: 600 }}>{a.name}</span>
              <span style={{ color: a.status === 'error' ? BAD_FG : a.status === 'done' ? OK_FG : MUTED, whiteSpace: 'nowrap' }}>
                {a.status === 'uploading' ? t('bc.uploading') : a.status === 'error' ? (a.error || t('bc.uploadFailed')) : `${Math.max(1, Math.round(a.size / 1024)).toLocaleString()}KB`}
              </span>
              <button type="button" onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))} aria-label={`${a.name} ${t('bc.remove')}`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: MUTED, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </li>
          ))}
        </ul>
      )}
      <input ref={fileInputRef} type="file" multiple onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
        {mode === 'form' && <button type="button" style={smallBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? t('bc.less') : t('bc.more')}</button>}
        <button type="button" style={{ ...smallBtn, opacity: uploadUrl ? 1 : 0.5 }} disabled={!uploadUrl} onClick={() => fileInputRef.current?.click()} title={uploadUrl ? t('bc.fileTitle') : t('bc.fileOff')}>
          <Paperclip size={13} aria-hidden />{t('bc.file')}
        </button>
        <button type="button" style={{ ...smallBtn, opacity: 0.5, cursor: 'not-allowed' }} disabled title={t('bc.folderTitle')}>
          <FolderOpen size={13} aria-hidden />{t('bc.folder')}
        </button>
        <span style={{ fontSize: 10.5, color: MUTED }} title={t('bc.voiceTitle')}>{t('bc.voice')}</span>
        <button type="button" onClick={submit} disabled={busy}
          style={{ marginLeft: 'auto', font: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', padding: '5px 12px', borderRadius: 4, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: busy ? 0.6 : 1 }}>
          {busy ? t('bc.sending') : t('bc.send')}<Send size={13} aria-hidden />
        </button>
      </div>
      {status && <p style={{ fontSize: 11.5, color: failed ? BAD_FG : OK_FG, fontWeight: 600, margin: '5px 0 0' }}>{status}</p>}
    </section>
  );
}
