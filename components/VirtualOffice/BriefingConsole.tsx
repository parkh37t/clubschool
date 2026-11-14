import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { BookmarkPlus, FolderOpen, LayoutTemplate, Mic, Paperclip, Send } from 'lucide-react';
import { postJson } from './officeApi';
import type { BriefingPrefill } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, GATE_NAMES, LINE, LINE_SOFT, MUTED, OK_FG, WYLIE, WYLIE_DARK, WYLIE_TINT } from './officeTheme';
import { SIM_TEXT } from './simText';

interface AttachedFile {
  id: number;
  name: string; // 파일 이름. 폴더 첨부면 폴더 안 상대경로('자료/RFP.pdf')
  size: number;
  path?: string; // 서버 저장 경로(업로드 완료 시, 산출물 폴더 기준)
  status: 'uploading' | 'done' | 'error';
  error?: string;
  folder?: string; // 폴더 첨부 묶음 id — 화면에는 폴더 하나당 칩 하나로 보인다
  folderName?: string;
}

/** 폴더에서 고르거나 끌어다 놓은 파일 하나. rel 은 맨 위 폴더 이름부터 시작하는 상대경로('자료/하위/파일.pdf'). */
interface PickedFile { file: File; rel: string; }

// 폴더 첨부는 문서만 올린다 — 실행 파일·압축·숨김 폴더는 건너뛴다. 서버 상한(25MB/파일)과 맞춘다.
const DOC_EXT = /\.(pdf|docx?|hwpx?|xlsx?|xlsm|csv|pptx?|md|markdown|txt|rtf|json|xml|html?|png|jpe?g|gif|webp|svg)$/i;
const SKIP_PATH = /(^|\/)(\.[^/]*|node_modules|__MACOSX|\$RECYCLE\.BIN|~\$[^/]*)(\/|$)/i;
const MAX_FOLDER_FILES = 40;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FOLDER_BYTES = 200 * 1024 * 1024;
const MAX_WALK = 2000; // 끌어다 놓은 폴더를 훑을 때 볼 항목 수 상한(아주 큰 폴더에서 멈추지 않게)

function readDir(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const all: FileSystemEntry[] = [];
  return new Promise((resolve) => {
    const next = () => reader.readEntries((batch) => {
      if (!batch.length) { resolve(all); return; }
      all.push(...batch);
      next();
    }, () => resolve(all));
    next();
  });
}

/** 끌어다 놓은 폴더를 훑어 파일 목록을 만든다. 숨김·건너뛸 폴더는 들어가지 않는다. */
async function walkEntry(entry: FileSystemEntry, out: PickedFile[]): Promise<void> {
  if (out.length >= MAX_WALK) return;
  const rel = entry.fullPath.replace(/^\/+/, '');
  if (SKIP_PATH.test(rel)) return;
  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => (entry as FileSystemFileEntry).file(resolve, () => resolve(null)));
    if (file) out.push({ file, rel });
  } else if (entry.isDirectory) {
    for (const child of await readDir(entry as FileSystemDirectoryEntry)) await walkEntry(child, out);
  }
}

interface BriefingConsoleProps {
  /** 브리핑 제출 대상(백엔드 API). 지정 시 POST, 미지정 시 복사/다운로드. */
  instructUrl?: string;
  /** 접수 후 호출(사무실 피드에 표시) */
  onSubmitted: (title: string) => void;
  /** 대기열이 바뀌었을 때(띠를 바로 다시 읽게) */
  onQueued?: () => void;
  /** 템플릿 탭의 [이 템플릿으로 쓰기] — nonce 가 바뀌면 브리핑 양식에 한 번 채운다(보내기는 사람이 누른다) */
  prefill?: BriefingPrefill | null;
  /** 입력창 도구 막대의 [템플릿] — 템플릿 탭을 연다 */
  onOpenTemplates?: () => void;
}

/** 한글 등 IME 조합 중의 Enter 는 글자 확정용이다 — 이때 보내면 마지막 글자가 잘리거나 두 번 보내진다. */
const composing = (e: ReactKeyboardEvent) => e.nativeEvent.isComposing || e.key === 'Process' || e.keyCode === 229;
const MAX_INPUT_PX = 168; // 입력칸 자동 높이 상한(약 7줄) — 넘으면 안에서 스크롤


/**
 * 커맨드 센터 맨 아래 입력창 — 채팅 입력창(ChatGPT·Claude·Slack) 방식: 둥근 상자 안에 입력칸·첨부·도구·보내기를 함께 둔다.
 * 메시지는 Enter 로 보내고 Shift+Enter 로 줄을 바꾼다(IME 조합 중 Enter 는 무시). 브리핑 양식은 칸이 여러 개라 Ctrl+Enter 로 보낸다.
 * 두 가지 쓰임:
 *   메시지      팀장에게 보내는 말 — 대기열에 쌓여 팀장 상주 세션이 한 건씩 답한다. 일을 맡기는 말이면 팀장이 브리핑으로 정리한다
 *   브리핑 양식  4요소(과제명·결과·맥락·제약)를 직접 적어 바로 브리핑 대기열에 넣는다. 결과 줄이 없으면 팀장은 나누지 않고 되묻는다
 *               템플릿 탭에서 고르면 채워지고(prefill), 지금 양식은 [템플릿으로 저장]으로 남긴다
 */
export function BriefingConsole({ instructUrl, onSubmitted, onQueued, prefill, onOpenTemplates }: BriefingConsoleProps) {
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

  // 템플릿 채우기 — 같은 nonce 는 한 번만(언어를 바꿔 t 가 바뀌어도 사람이 고친 내용을 덮지 않게).
  const filledNonce = useRef(0);
  useEffect(() => {
    if (!prefill || prefill.nonce === filledNonce.current) return;
    filledNonce.current = prefill.nonce;
    setMode('form');
    setTitle(prefill.title);
    setResult(prefill.result);
    setContext(prefill.context);
    setConstraints(prefill.constraints.join('\n'));
    setOpen(Boolean(prefill.context || prefill.constraints.length));
    setFailed(false);
    setStatus(t('bc.prefilled'));
  }, [prefill, t]);

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
  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    setMode('form');
    Array.from(files).forEach(uploadFile);
  };

  const say = (ok: boolean, text: string) => { setFailed(!ok); setStatus(text); };

  // 폴더 첨부 — 문서만 골라 폴더 구조 그대로 올린다(서버: _inbox/<묶음>/<상대경로>). 한 번에 3개씩 보낸다.
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const uploadFolderFile = async (id: number, folder: string, p: PickedFile) => {
    if (!uploadUrl) return;
    const inner = p.rel.split('/').slice(1).join('/') || p.file.name; // 맨 위 폴더 이름은 묶음 id 에 이미 들어 있다
    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'X-File-Name': encodeURIComponent(p.file.name), 'X-Rel-Path': encodeURIComponent(inner), 'X-Folder-Id': encodeURIComponent(folder) },
        body: p.file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `${t('bc.uploadFailed')} (${res.status})`);
      setAttachments((a) => a.map((x) => (x.id === id ? { ...x, status: 'done', path: data.path } : x)));
    } catch (e) {
      setAttachments((a) => a.map((x) => (x.id === id ? { ...x, status: 'error', error: (e as Error).message } : x)));
    }
  };
  const addFolder = async (picked: PickedFile[]) => {
    if (!uploadUrl || !picked.length) return;
    setMode('form');
    // 맨 위 폴더별로 나눠 묶음 하나씩 만든다(폴더 여러 개를 한꺼번에 끌어다 놓을 수 있다).
    const groups = new Map<string, PickedFile[]>();
    for (const p of picked) {
      const top = p.rel.includes('/') ? p.rel.split('/')[0] : '';
      if (!top) continue;
      groups.set(top, [...(groups.get(top) ?? []), p]);
    }
    const notes: string[] = [];
    for (const [top, files] of groups) {
      const docs = files.filter((p) => !SKIP_PATH.test(p.rel) && DOC_EXT.test(p.rel) && p.file.size > 0 && p.file.size <= MAX_FILE_BYTES);
      const take: PickedFile[] = [];
      let total = 0;
      for (const p of docs) {
        if (take.length >= MAX_FOLDER_FILES || total + p.file.size > MAX_FOLDER_BYTES) break;
        take.push(p);
        total += p.file.size;
      }
      const skipped = files.length - take.length;
      if (!take.length) { notes.push(t('bc.folderNone', { name: top })); continue; }
      const folder = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}__${top}`;
      const jobs = take.map((p) => ({ id: ++attachIdRef.current, p }));
      setAttachments((a) => [...a, ...jobs.map(({ id, p }) => ({ id, name: p.rel, size: p.file.size, status: 'uploading' as const, folder, folderName: top }))]);
      notes.push(t('bc.folderAdded', { name: top, n: take.length, skipped }));
      let cursor = 0;
      const worker = async () => {
        while (cursor < jobs.length) {
          const job = jobs[cursor++];
          await uploadFolderFile(job.id, folder, job.p);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    }
    if (notes.length) say(true, notes.join(' · '));
  };
  const onFolderPicked = (files: FileList | null) => {
    if (!files?.length) return;
    // webkitRelativePath = '맨위폴더/하위/파일'
    addFolder(Array.from(files).map((file) => ({ file, rel: file.webkitRelativePath || file.name })));
  };
  const onDrop = (dt: DataTransfer) => {
    // 항목은 drop 순간에만 읽을 수 있으므로 먼저 모두 꺼내 둔다.
    const entries = Array.from(dt.items ?? []).map((it) => (it.kind === 'file' ? it.webkitGetAsEntry() : null)).filter((x): x is FileSystemEntry => Boolean(x));
    const dirs = entries.filter((x) => x.isDirectory);
    if (!dirs.length) { handleFiles(dt.files); return; }
    const plain = entries.filter((x) => x.isFile);
    (async () => {
      const picked: PickedFile[] = [];
      for (const d of dirs) await walkEntry(d, picked);
      const loose: File[] = [];
      for (const f of plain) {
        const file = await new Promise<File | null>((resolve) => (f as FileSystemFileEntry).file(resolve, () => resolve(null)));
        if (file) loose.push(file);
      }
      if (loose.length) handleFiles(loose);
      await addFolder(picked);
    })();
  };

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

  // 지금 양식을 템플릿으로 저장(hive/templates.json). 첨부는 과제마다 다르므로 저장하지 않는다.
  const saveTemplate = async () => {
    if (apiBase === undefined) return; // ''(같은 오리진)도 연결된 것이다
    if (!title.trim()) { say(false, t('bc.needTitle')); return; }
    if (!result.trim()) { say(false, t('bc.needResult')); return; }
    const r = await postJson(`${apiBase}/api/templates`, {
      title: title.trim(), result: result.trim(), context: context.trim(),
      constraints: constraints.split('\n').map((x) => x.trim()).filter(Boolean),
    });
    const tpl = (r.data?.template ?? null) as { id?: string } | null;
    say(r.ok, r.ok ? t('bc.tplSaved', { id: tpl?.id ?? '' }) : String(r.error));
  };

  const canSend = !busy && (mode === 'message' ? Boolean(message.trim()) : Boolean(title.trim() && result.trim()));
  const submit = () => { if (busy) return; if (mode === 'message') sendMessage(); else sendBriefing(); };

  // 입력칸 자동 높이 — 글이 늘면 커지고 상한을 넘으면 안에서 스크롤
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    for (const el of [msgRef.current, resultRef.current]) {
      if (!el) continue;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_PX)}px`;
    }
  }, [message, result, mode]);

  // 키 — 메시지: Enter 보내기 · Shift+Enter 줄바꿈. 브리핑 양식: Ctrl/⌘+Enter 보내기, 과제명 칸의 Enter 는 결과 칸으로.
  const onMessageKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || composing(e) || e.shiftKey) return;
    e.preventDefault();
    if (canSend) submit();
  };
  const onFormKey = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter' || composing(e) || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    if (canSend) submit();
  };
  const onTitleKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || composing(e)) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) { if (canSend) submit(); } else resultRef.current?.focus();
  };

  const segBtn = (m: 'message' | 'form', label: string, hint: string) => (
    <button type="button" role="radio" aria-checked={mode === m} title={hint} disabled={m === 'message' && !instructUrl}
      onClick={() => { setMode(m); setStatus(''); }}>
      {label}
    </button>
  );
  const chip = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, background: '#FCFAF5', border: `1px solid ${LINE_SOFT}`, borderRadius: 6, padding: '2px 7px', maxWidth: '100%' } as const;

  return (
    <section
      aria-label={t('bc.title')}
      onDragOver={(e) => { if (uploadUrl) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { if (uploadUrl) { e.preventDefault(); setDragOver(false); onDrop(e.dataTransfer); } }}
      style={{ borderTop: `1px solid ${LINE}`, padding: '8px 10px 10px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: WYLIE_DARK, whiteSpace: 'nowrap' }}>{t('bc.title')}</span>
        <span role="radiogroup" aria-label={t('bc.title')} className="axo-seg">
          {segBtn('message', t('bc.modeMsg'), t('bc.hintMsg'))}
          {segBtn('form', t('bc.modeForm'), t('bc.hintForm'))}
        </span>
        {mode === 'form' && (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
            style={{ marginLeft: 'auto', font: 'inherit', fontSize: 11.5, fontWeight: 700, color: WYLIE_DARK, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
            {open ? t('bc.less') : t('bc.more')}
          </button>
        )}
      </div>

      <div className="axo-composer" data-drag={dragOver}>
        {mode === 'message' ? (
          <textarea ref={msgRef} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={onMessageKey} rows={2}
            aria-label={t('bc.modeMsg')} placeholder={t('bc.msgPlaceholder')} className="axo-composer-input" />
        ) : (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onTitleKey} placeholder={t('bc.titlePh')} aria-label={t('bc.titlePh')}
              className="axo-composer-field" style={{ fontWeight: 700 }} />
            <textarea ref={resultRef} value={result} onChange={(e) => setResult(e.target.value)} onKeyDown={onFormKey} rows={2}
              aria-label={t('bc.resultPh')} placeholder={t('bc.resultPh')} className="axo-composer-field" />
            {open && (
              <>
                <textarea value={context} onChange={(e) => setContext(e.target.value)} onKeyDown={onFormKey} rows={3} aria-label={t('bc.contextPh')} placeholder={t('bc.contextPh')} className="axo-composer-field" />
                <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} onKeyDown={onFormKey} rows={2} aria-label={t('bc.constraintsPh')} placeholder={t('bc.constraintsPh')} className="axo-composer-field" />
                <input value={policy} onChange={(e) => setPolicy(e.target.value)} onKeyDown={onFormKey} placeholder={`${t('bc.policyPh')} — ${t('bc.policyDefault')}`} aria-label={t('bc.policyPh')} className="axo-composer-field" />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 12px', alignItems: 'center', borderBottom: `1px solid ${LINE_SOFT}` }}>
                  <span style={{ fontSize: 10.5, color: MUTED, marginRight: 2 }}>{t('bc.stages')}</span>
                  {GATE_NAMES.map((n, i) => (
                    <button key={n} type="button" title={SIM_TEXT[lang].gates[i]} aria-pressed={gates[i]} onClick={() => setGates((g) => g.map((v, j) => (j === i ? !v : v)))}
                      style={{ font: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '1px 7px', borderRadius: 999, background: gates[i] ? WYLIE_TINT : '#F2EFE7', color: gates[i] ? WYLIE_DARK : '#9A968A', border: '1px solid ' + (gates[i] ? WYLIE : LINE) }}>
                      {'G' + (i + 1)}
                    </button>
                  ))}
                </div>
              </>
            )}
            {!open && context.trim() && <p style={{ fontSize: 10.5, color: OK_FG, fontWeight: 600, margin: 0, padding: '4px 12px' }}>{t('bc.contextLen', { n: context.trim().length.toLocaleString() })}</p>}
          </>
        )}

        {attachments.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: '6px 10px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {/* 폴더 첨부는 폴더 하나당 칩 하나(올린 수/전체·실패 수) */}
            {[...new Set(attachments.filter((a) => a.folder).map((a) => a.folder as string))].map((folder) => {
              const items = attachments.filter((a) => a.folder === folder);
              const done = items.filter((a) => a.status === 'done').length;
              const bad = items.filter((a) => a.status === 'error').length;
              const label = items[0]?.folderName ?? folder;
              return (
                <li key={folder} title={items.map((a) => `${a.name}${a.status === 'error' ? ` — ${a.error ?? ''}` : ''}`).join('\n')} style={chip}>
                  <FolderOpen size={12} aria-hidden />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140, fontWeight: 600 }}>{label}</span>
                  <span style={{ color: bad ? BAD_FG : done === items.length ? OK_FG : MUTED, whiteSpace: 'nowrap' }}>
                    {t('bc.folderFiles', { done, n: items.length })}{bad ? ` · ${t('bc.folderBad', { n: bad })}` : ''}
                  </span>
                  <button type="button" onClick={() => setAttachments((x) => x.filter((y) => y.folder !== folder))} aria-label={`${label} ${t('bc.remove')}`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: MUTED, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                </li>
              );
            })}
            {attachments.filter((a) => !a.folder).map((a) => (
              <li key={a.id} style={chip}>
                <Paperclip size={11} aria-hidden />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150, fontWeight: 600 }}>{a.name}</span>
                <span style={{ color: a.status === 'error' ? BAD_FG : a.status === 'done' ? OK_FG : MUTED, whiteSpace: 'nowrap' }}>
                  {a.status === 'uploading' ? t('bc.uploading') : a.status === 'error' ? (a.error || t('bc.uploadFailed')) : `${Math.max(1, Math.round(a.size / 1024)).toLocaleString()}KB`}
                </span>
                <button type="button" onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))} aria-label={`${a.name} ${t('bc.remove')}`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: MUTED, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
              </li>
            ))}
          </ul>
        )}

        {/* 도구 막대 — 첨부·폴더·템플릿(·템플릿으로 저장) | 단축키 안내 | 보내기 */}
        <div className="axo-composer-bar">
          <button type="button" className="axo-icon-btn" disabled={!uploadUrl} onClick={() => fileInputRef.current?.click()} title={uploadUrl ? t('bc.fileTitle') : t('bc.fileOff')} aria-label={t('bc.file')}>
            <Paperclip size={16} aria-hidden />
          </button>
          <button type="button" className="axo-icon-btn" disabled={!uploadUrl} onClick={() => folderInputRef.current?.click()} title={uploadUrl ? t('bc.folderTitle') : t('bc.fileOff')} aria-label={t('bc.folder')}>
            <FolderOpen size={16} aria-hidden />
          </button>
          {onOpenTemplates && (
            <button type="button" className="axo-icon-btn" onClick={onOpenTemplates} title={t('bc.templates')} aria-label={t('bc.templates')}>
              <LayoutTemplate size={16} aria-hidden />
            </button>
          )}
          {mode === 'form' && (
            <button type="button" className="axo-icon-btn" disabled={apiBase === undefined} onClick={saveTemplate} title={apiBase !== undefined ? t('bc.tplSaveTitle') : t('bc.tplOff')} aria-label={t('bc.tplSave')}>
              <BookmarkPlus size={16} aria-hidden />
            </button>
          )}
          <span className="axo-icon-btn" title={t('bc.voiceTitle')} aria-label={t('bc.voice')} role="img" style={{ cursor: 'help' }}>
            <Mic size={15} aria-hidden />
          </span>
          <span className="axo-kbd-hint">{mode === 'message' ? t('bc.hintEnter') : t('bc.hintCtrlEnter')}</span>
          <button type="button" className="axo-send" onClick={submit} disabled={!canSend} aria-label={t('bc.send')}>
            {busy ? t('bc.sending') : t('bc.send')}<Send size={14} aria-hidden />
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
      {/* webkitdirectory 는 React 속성 타입에 없어 ref 로 붙인다 — Electron·크롬에서 폴더 선택 창이 뜬다 */}
      <input
        ref={(el) => { folderInputRef.current = el; if (el) { el.setAttribute('webkitdirectory', ''); el.setAttribute('directory', ''); } }}
        type="file" multiple onChange={(e) => { onFolderPicked(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} aria-hidden tabIndex={-1}
      />
      {!instructUrl && <p style={{ fontSize: 10.5, color: MUTED, margin: '5px 2px 0' }}>{t('bc.offline')}</p>}
      {status && <p role="status" style={{ fontSize: 11.5, color: failed ? BAD_FG : OK_FG, fontWeight: 600, margin: '5px 2px 0' }}>{status}</p>}
    </section>
  );
}
