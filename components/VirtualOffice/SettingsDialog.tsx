import { useEffect, useRef, useState } from 'react';
import { postJson, usePolling } from './officeApi';
import type { OfficeSettings } from './officeApi';
import { EnvCard } from './EnvCard';
import { AccountSection } from './AccountSection';
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
/** 패키지가 아닌 폴더를 골랐을 때 서버가 주는 안내(server/planning.mjs kitGuide) */
type KitGuide = { kind: 'path' | 'deliverables' | 'missing_dir' | 'nested' | 'empty' | 'partial' | 'not_kit'; suggest?: string; missing?: string[]; docs?: number } | null;

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
  const [kitDir, setKitDir] = useState('');
  const [kitMsg, setKitMsg] = useState<Msg>(null);
  const [kitGuide, setKitGuide] = useState<KitGuide>(null);
  const [kitTried, setKitTried] = useState('');
  const storageRef = useRef<HTMLElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
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
    setCap(String(Math.round(data.max_task_tokens / 1000)));
    setDaily(String(Math.round(data.agent_daily_tokens / 1000)));
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

  const setKit = async (dirValue: string) => {
    setKitMsg(null);
    setKitGuide(null);
    const r = await postJson(`${apiBase}/api/settings/plan-kit`, { dir: dirValue });
    if (!r.ok) {
      setKitMsg({ ok: false, text: String(r.error) });
      setKitGuide((r.data?.guide as KitGuide) ?? null);
      setKitTried(dirValue);
      return;
    }
    setKitMsg({ ok: true, text: dirValue ? t('set.kitOn') : t('set.kitOff') });
    setKitDir('');
    refresh();
    onSaved();
  };
  // 안내 상자의 [산출물 위치로 쓰기] — 고른 폴더를 위 '새 위치' 칸으로 옮기고 그 칸으로 이동한다(바꾸기는 사람이 누른다)
  const useAsDeliverables = () => {
    setDir(kitTried);
    setKitDir('');
    setKitGuide(null);
    setKitMsg(null);
    storageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => dirInputRef.current?.focus(), 250);
  };

  const pickKit = async () => {
    if (!desktop) return;
    const chosen = await desktop.pickFolder(kitDir.trim() || data?.plan_kit_dir || '');
    if (chosen) setKitDir(chosen);
  };

  const saveCost = async () => {
    setCostMsg(null);
    // 입력은 천 토큰 단위 — 서버에는 토큰으로 보낸다
    const r = await postJson(`${apiBase}/api/settings`, { max_task_tokens: Math.round(Number(cap) * 1000), agent_daily_tokens: Math.round(Number(daily) * 1000) });
    if (!r.ok) { setCostMsg({ ok: false, text: String(r.error) }); return; }
    setCap(String(Math.round(Number(r.data?.max_task_tokens ?? Number(cap) * 1000) / 1000)));
    setDaily(String(Math.round(Number(r.data?.agent_daily_tokens ?? Number(daily) * 1000) / 1000)));
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

        {connected && apiBase !== undefined && (
          <section style={section} aria-label={t('acc.title')}>
            <h3 style={h3}>{t('acc.title')}</h3>
            <AccountSection apiBase={apiBase} running={Boolean(data?.running)} />
          </section>
        )}

        {connected && data && (
          <section ref={storageRef} style={section} aria-label={t('set.storage')}>
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
                <input ref={dirInputRef} value={dir} onChange={(e) => setDir(e.target.value)} placeholder={t('set.dirPh')} spellCheck={false}
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
          <section style={section} aria-label={t('set.kit')}>
            <h3 style={h3}>{t('set.kit')}</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: data.plan_kit?.ok ? OK_FG : MUTED, whiteSpace: 'nowrap' }}>{data.plan_kit?.ok ? t('set.kitOk') : t('set.kitNone')}</span>
              <span style={pathBox}>{data.plan_kit_dir || '—'}</span>
              {data.plan_kit_dir && <button type="button" style={btn} onClick={() => setKit('')}>{t('set.kitDisable')}</button>}
            </div>
            {!data.plan_kit?.ok && data.plan_kit?.error && data.plan_kit_dir && <p style={{ ...smallMuted, fontSize: 11.5, color: BAD_FG }}>{data.plan_kit.error}</p>}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={kitDir} onChange={(e) => setKitDir(e.target.value)} placeholder={t('set.kitPh')} spellCheck={false} aria-label={t('set.kit')}
                style={{ ...inputStyle, marginTop: 0, fontFamily: MONO, fontSize: 12, flex: 1, resize: undefined }} />
              {desktop && <button type="button" style={btn} onClick={pickKit}>{t('set.pick')}</button>}
              <button type="button" style={{ ...primary, opacity: kitDir.trim() ? 1 : 0.55 }} disabled={!kitDir.trim()} onClick={() => setKit(kitDir.trim())}>{t('set.kitApply')}</button>
            </div>
            {kitGuide ? (
              <div role="status" style={{ border: `1px solid ${WARN_FG}`, background: '#FBF3E3', borderRadius: 8, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <strong style={{ fontSize: 12.5, color: INK }}>{t('set.kgTitle')}</strong>
                <span style={{ fontSize: 12, color: INK, lineHeight: 1.55 }}>
                  {t(`set.kg.${kitGuide.kind}`, { n: kitGuide.docs ?? 0, missing: (kitGuide.missing ?? []).join(', ') })}
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(kitGuide.kind === 'empty' || kitGuide.kind === 'not_kit') && (
                    <button type="button" style={{ ...primary, padding: '5px 11px' }} onClick={useAsDeliverables}>{t('set.kgUseDeliv')}</button>
                  )}
                  {kitGuide.kind === 'nested' && kitGuide.suggest && (
                    <button type="button" style={{ ...primary, padding: '5px 11px' }} onClick={() => setKit(kitGuide.suggest || '')}>{t('set.kgUseNested', { dir: kitGuide.suggest })}</button>
                  )}
                  <button type="button" style={btn} onClick={() => { setKitGuide(null); setKitMsg(null); }}>{t('set.kgClose')}</button>
                </div>
              </div>
            ) : note(kitMsg)}
            <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('set.kitNote')}</p>
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: WYLIE_DARK }}>{t('set.kgHowTitle')}</summary>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: INK, lineHeight: 1.6 }}>
                <li>{t('set.kgHow1')}</li>
                <li>{t('set.kgHow2', { dir: data.plan_kit_dir || '—' })}</li>
                <li>{t('set.kgHow3')}</li>
                <li>{t('set.kgHow4')}</li>
              </ul>
            </details>
          </section>
        )}

        {connected && data && (
          <section style={section} aria-label={t('set.cost')}>
            <h3 style={h3}>{t('set.cost')}</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, flex: '1 1 160px' }}>
                {t('set.cap')}
                <input type="number" min={20} max={20000} step={50} value={cap} onChange={(e) => setCap(e.target.value)} style={{ ...inputStyle, marginTop: 4, resize: undefined }} />
              </label>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, flex: '1 1 160px' }}>
                {t('set.daily')}
                <input type="number" min={50} max={200000} step={100} value={daily} onChange={(e) => setDaily(e.target.value)} style={{ ...inputStyle, marginTop: 4, resize: undefined }} />
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
