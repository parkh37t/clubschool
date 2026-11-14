import { useEffect, useRef, useState } from 'react';
import { postJson, usePolling } from './officeApi';
import type { OfficeSettings } from './officeApi';
import { EnvCard } from './EnvCard';
import { useOfficeLang } from './i18n';
import type { Lang } from './i18n';
import { BAD_FG, FONT, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, WYLIE, WYLIE_DARK, WYLIE_TINT, inputStyle, smallMuted } from './officeTheme';

interface SettingsDialogProps {
  apiBase?: string;
  lang: Lang;
  onLang: (l: Lang) => void;
  onClose: () => void;
  onSaved: () => void;
}

/** 설치형 앱(desktop/preload.cjs)만 내보내는 폴더 선택 창. 브라우저에서는 없다. */
type DesktopBridge = { pickFolder: (defaultPath?: string) => Promise<string> };
const desktopBridge = (): DesktopBridge | undefined => (window as unknown as { axoDesktop?: DesktopBridge }).axoDesktop;

type Msg = { ok: boolean; text: string } | null;

const btn = { font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '5px 11px', borderRadius: 6, border: `1px solid ${LINE}`, background: '#fff', color: INK, whiteSpace: 'nowrap' } as const;
const primary = { ...btn, fontWeight: 800, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff' } as const;
const section = { border: `1px solid ${LINE}`, borderRadius: 10, padding: '11px 13px', background: PAPER, display: 'flex', flexDirection: 'column', gap: 7 } as const;
const h3 = { fontSize: 13, fontWeight: 800, color: WYLIE_DARK, margin: 0 } as const;
const pathBox = { fontFamily: MONO, fontSize: 12, background: '#fff', border: `1px solid ${LINE_SOFT}`, borderRadius: 6, padding: '5px 8px', overflowWrap: 'anywhere', flex: '1 1 240px', minWidth: 0 } as const;

/**
 * 설정 — 산출물 저장 위치(바꾸기·열기·기존 산출물 복사), 비용 한도, QA 자동 보완·동시 작업 수, 언어, 환경 점검, 작업 기록 위치.
 * 값은 서버의 hive/settings.json 에 남는다(산출물 위치는 /api/settings/deliverables 가 쓰기 시험을 한 뒤에만 바꾼다).
 */
export function SettingsDialog({ apiBase, lang, onLang, onClose, onSaved }: SettingsDialogProps) {
  const { t } = useOfficeLang();
  const connected = apiBase !== undefined;
  const { data, error, refresh } = usePolling<OfficeSettings>(connected ? `${apiBase}/api/settings` : undefined, 4000);
  const [dir, setDir] = useState('');
  const [copy, setCopy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [storageMsg, setStorageMsg] = useState<Msg>(null);
  const [cap, setCap] = useState('');
  const [daily, setDaily] = useState('');
  const [costMsg, setCostMsg] = useState<Msg>(null);
  const [behaviorMsg, setBehaviorMsg] = useState<Msg>(null);
  const loaded = useRef(false);
  const desktop = desktopBridge();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // 비용 칸은 처음 받은 값으로 한 번만 채운다(입력 중에 4초 갱신이 덮어쓰지 않게)
  useEffect(() => {
    if (!data || loaded.current) return;
    loaded.current = true;
    setCap(String(data.max_task_usd));
    setDaily(String(data.agent_daily_usd));
  }, [data]);

  const open = async (body: Record<string, unknown>, setMsg: (m: Msg) => void) => {
    const r = await postJson(`${apiBase}/api/open`, body);
    if (!r.ok) setMsg({ ok: false, text: String(r.error) });
  };

  const changeDir = async (reset: boolean) => {
    setBusy(true);
    setStorageMsg(null);
    const r = await postJson(`${apiBase}/api/settings/deliverables`, reset ? { reset: true, copy } : { dir: dir.trim(), copy });
    setBusy(false);
    if (!r.ok) { setStorageMsg({ ok: false, text: String(r.error) }); return; }
    const now = String(r.data?.deliverables_dir ?? '');
    setStorageMsg({ ok: true, text: t(r.data?.copied ? 'set.changedCopy' : 'set.changed', { dir: now }) });
    setDir('');
    refresh();
    onSaved();
  };

  const pick = async () => {
    if (!desktop) return;
    const chosen = await desktop.pickFolder(dir.trim() || data?.deliverables_dir || '');
    if (chosen) setDir(chosen);
  };

  const saveCost = async () => {
    setCostMsg(null);
    const r = await postJson(`${apiBase}/api/settings`, { max_task_usd: Number(cap), agent_daily_usd: Number(daily) });
    if (!r.ok) { setCostMsg({ ok: false, text: String(r.error) }); return; }
    setCap(String(r.data?.max_task_usd ?? cap));
    setDaily(String(r.data?.agent_daily_usd ?? daily));
    setCostMsg({ ok: true, text: t('set.saved') });
    refresh();
    onSaved();
  };

  const saveBehavior = async (patch: Record<string, unknown>) => {
    setBehaviorMsg(null);
    const r = await postJson(`${apiBase}/api/settings`, patch);
    setBehaviorMsg(r.ok ? { ok: true, text: t('set.saved') } : { ok: false, text: String(r.error) });
    refresh();
    onSaved();
  };

  const note = (m: Msg) => m && <p role="status" style={{ fontSize: 12, fontWeight: 600, margin: 0, color: m.ok ? OK_FG : BAD_FG, overflowWrap: 'anywhere' }}>{m.text}</p>;
  const running = Boolean(data?.running);

  return (
    <div role="dialog" aria-modal="true" aria-label={t('set.title')} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(27,31,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(680px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#FFFDF8', borderRadius: 12, border: `1px solid ${LINE}`, boxShadow: '0 18px 50px rgba(20,24,36,.28)', padding: '16px 18px', fontFamily: FONT, color: INK, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 16 }}>{t('set.title')}</strong>
          {data?.mode && <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, border: `1px solid ${LINE}`, borderRadius: 4, padding: '0 6px' }}>{data.mode}</span>}
          <button type="button" onClick={onClose} style={{ ...btn, marginLeft: 'auto' }}>{t('set.close')}</button>
        </div>
        {!connected && <p style={smallMuted}>{t('set.offline')}</p>}
        {connected && error && !data && <p style={{ ...smallMuted, color: BAD_FG }}>{t('set.loadFail')}</p>}

        {connected && data && (
          <section style={section} aria-label={t('set.storage')}>
            <h3 style={h3}>{t('set.storage')}</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, whiteSpace: 'nowrap' }}>{t('set.current')}</span>
              <span style={pathBox}>{data.deliverables_dir}</span>
              <button type="button" style={btn} onClick={() => open({ target: 'deliverables' }, setStorageMsg)}>{t('set.openFolder')}</button>
            </div>
            {data.deliverables_custom && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11.5, color: MUTED }}>
                <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{t('set.default')}</span>
                <span style={{ ...pathBox, background: 'transparent' }}>{data.deliverables_default}</span>
                <button type="button" style={btn} disabled={busy || running} onClick={() => changeDir(true)}>{t('set.reset')}</button>
              </div>
            )}
            <label style={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>
              {t('set.newDir')}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={dir} onChange={(e) => setDir(e.target.value)} placeholder={t('set.dirPh')} spellCheck={false}
                  style={{ ...inputStyle, marginTop: 4, fontFamily: MONO, fontSize: 12, flex: 1, resize: undefined }} />
                {desktop && <button type="button" style={{ ...btn, marginTop: 4 }} onClick={pick}>{t('set.pick')}</button>}
              </div>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} style={{ accentColor: WYLIE, marginTop: 2 }} />
              <span>{t('set.copy')}</span>
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" style={{ ...primary, opacity: !dir.trim() || busy || running ? 0.55 : 1 }} disabled={!dir.trim() || busy || running} onClick={() => changeDir(false)}>{t('set.apply')}</button>
              {running && <span style={{ fontSize: 12, color: WARN_FG, fontWeight: 700 }}>{t('set.running')}</span>}
            </div>
            {note(storageMsg)}
            <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('set.storageNote')}</p>
          </section>
        )}

        {connected && data && (
          <section style={section} aria-label={t('set.cost')}>
            <h3 style={h3}>{t('set.cost')}</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, flex: '1 1 160px' }}>
                {t('set.cap')}
                <input type="number" min={0.05} max={100} step={0.5} value={cap} onChange={(e) => setCap(e.target.value)} style={{ ...inputStyle, marginTop: 4, resize: undefined }} />
              </label>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, flex: '1 1 160px' }}>
                {t('set.daily')}
                <input type="number" min={0.1} max={1000} step={1} value={daily} onChange={(e) => setDaily(e.target.value)} style={{ ...inputStyle, marginTop: 4, resize: undefined }} />
              </label>
              <button type="button" style={primary} onClick={saveCost}>{t('set.save')}</button>
            </div>
            {note(costMsg)}
            <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('set.costNote')}</p>
          </section>
        )}

        {connected && data && (
          <section style={section} aria-label={t('set.behavior')}>
            <h3 style={h3}>{t('set.behavior')}</h3>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={data.auto_revise} onChange={(e) => saveBehavior({ auto_revise: e.target.checked })} style={{ accentColor: WYLIE }} />
              {t('set.autoRevise')}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>
              <span>{t('set.concurrency')}</span>
              <span role="group" aria-label={t('set.concurrency')} style={{ display: 'inline-flex', border: `1px solid ${LINE}`, borderRadius: 6, overflow: 'hidden' }}>
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" aria-pressed={data.concurrency === n} onClick={() => saveBehavior({ concurrency: n })}
                    style={{ font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '4px 12px', border: 'none', borderLeft: n > 1 ? `1px solid ${LINE}` : 'none', background: data.concurrency === n ? WYLIE_TINT : '#fff', color: data.concurrency === n ? WYLIE_DARK : INK }}>
                    {n}
                  </button>
                ))}
              </span>
            </div>
            {note(behaviorMsg)}
            <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('set.concurrencyNote')}</p>
          </section>
        )}

        <section style={section} aria-label={t('set.lang')}>
          <h3 style={h3}>{t('set.lang')}</h3>
          <span role="group" aria-label={t('set.lang')} style={{ display: 'inline-flex', alignSelf: 'flex-start', border: `1px solid ${LINE}`, borderRadius: 6, overflow: 'hidden' }}>
            {(['ko', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => onLang(l)}
                style={{ font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '4px 14px', border: 'none', borderLeft: l === 'en' ? `1px solid ${LINE}` : 'none', background: lang === l ? WYLIE_TINT : '#fff', color: lang === l ? WYLIE_DARK : INK }}>
                {l === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </span>
        </section>

        {connected && (
          <section style={section} aria-label={t('set.env')}>
            <h3 style={h3}>{t('set.env')}</h3>
            <EnvCard apiBase={apiBase} />
          </section>
        )}

        {connected && data && (
          <section style={section} aria-label={t('set.data')}>
            <h3 style={h3}>{t('set.data')}</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={pathBox}>{data.hive_dir}</span>
              <button type="button" style={btn} onClick={() => open({ target: 'hive' }, setStorageMsg)}>{t('set.openFolder')}</button>
            </div>
            <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('set.dataNote')}</p>
          </section>
        )}
      </div>
    </div>
  );
}
