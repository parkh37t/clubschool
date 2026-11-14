import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, FolderOpen } from 'lucide-react';
import type { HiveState, HiveTask } from './officeSimulator';
import { postJson } from './officeApi';
import { PixelAvatar } from './PixelAvatar';
import { gateLabel, statusLabel, useOfficeLang } from './i18n';
import { BAD_FG, GATE_COLOR, INK, LINE, LINE_SOFT, MONO, MUTED, STATUS_COLOR, WARN_FG, WYLIE, WYLIE_DARK, WYLIE_TINT, h2Style, smallMuted, tok } from './officeTheme';

interface TasksTabProps {
  connected: boolean;
  hive: HiveState | null;
  selected: string | null;
  concurrency?: { limit: number; running: number };
  apiBase?: string;
}

// 상태 묶음 순서 — 재하가 손댈 것(승인 대기)과 지금 도는 것이 위, 끝난 것이 아래(이슈 트래커의 상태별 묶음과 같은 방식).
const GROUP_ORDER = ['승인대기', '진행', '검수', '대기', '실패', '보류', '완료'];

/** 브리핑 id '20261114-1626_과제_이름' → { title: '과제 이름', when: '11/14 16:26' } */
function briefingLabel(id: string): { title: string; when: string } {
  const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})_(.*)$/.exec(id);
  if (!m) return { title: id.replace(/_/g, ' '), when: '' };
  return { title: m[6].replace(/_/g, ' '), when: `${Number(m[2])}/${Number(m[3])} ${m[4]}:${m[5]}` };
}

/** 작업 탭 — 이번 브리핑의 작업 원장. 진행률·비용 요약, 상태별 묶음(완료는 접힘), 산출물 열기. 선택한 사람의 작업만 진하게. */
export function TasksTab({ connected, hive, selected, concurrency, apiBase }: TasksTabProps) {
  const { t, lang } = useOfficeLang();
  const [doneOpen, setDoneOpen] = useState<boolean | null>(null); // null = 자동(진행 중인 작업이 있으면 접음)
  if (!connected || !hive) return <p style={smallMuted}>{t('tasks.offline')}</p>;
  const tasks = hive.tasks;
  const done = tasks.filter((x) => x.status === '완료').length;
  const used = tasks.reduce((n, x) => n + (x.tokens || 0) + (x.qa_tokens || 0), 0); // 사용 토큰(실행 + QA)
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const showDone = doneOpen ?? done === tasks.length;
  const known = new Set(GROUP_ORDER);
  const groups = [...GROUP_ORDER.map((s) => ({ s, items: tasks.filter((x) => x.status === s) })), { s: '', items: tasks.filter((x) => !known.has(x.status)) }].filter((g) => g.items.length);
  const b = hive.briefing ? briefingLabel(hive.briefing) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={h2Style}>{t('tasks.title')}</h2>
        {concurrency && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: WYLIE_DARK, background: WYLIE_TINT, border: `1px solid ${WYLIE}`, borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>{t('top.concurrency', { r: concurrency.running, l: concurrency.limit })}</span>}
      </div>
      {b && (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: '9px 11px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <strong title={b.title} style={{ fontSize: 13, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</strong>
            {b.when && <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED, fontFamily: MONO, whiteSpace: 'nowrap' }}>{b.when}</span>}
          </div>
          {tasks.length > 0 && (
            <>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('tasks.progress', { d: done, n: tasks.length })}
                style={{ height: 6, borderRadius: 999, background: LINE_SOFT, overflow: 'hidden', marginTop: 7 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: WYLIE, borderRadius: 999, transition: 'width .3s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 11.5, color: MUTED, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: WYLIE_DARK }}>{t('tasks.progress', { d: done, n: tasks.length })}</span>
                {used > 0 && <span title={t('tasks.tokenNote')}>{t('tasks.cost', { v: tok(used) })}</span>}
              </div>
            </>
          )}
        </div>
      )}
      {!tasks.length && <p style={smallMuted}>{t('tasks.empty')}</p>}
      {groups.map((g) => {
        const sc = STATUS_COLOR[g.s] ?? STATUS_COLOR['대기'];
        const isDone = g.s === '완료';
        const open = !isDone || showDone;
        const label = g.s ? statusLabel(lang, g.s) : '—';
        return (
          <section key={g.s || 'etc'} aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: sc.fg }}>
              {isDone ? (
                <button type="button" onClick={() => setDoneOpen(!showDone)} aria-expanded={open}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: 'inherit', fontSize: 11.5, fontWeight: 800, color: sc.fg, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  {open ? <ChevronDown size={13} aria-hidden /> : <ChevronRight size={13} aria-hidden />}{label}
                </button>
              ) : (
                <><span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: sc.fg }} />{label}</>
              )}
              <span style={{ fontWeight: 700, color: MUTED }}>{g.items.length}</span>
              <span aria-hidden style={{ flex: 1, height: 1, background: LINE_SOFT }} />
            </div>
            {open && g.items.map((task) => (
              <TaskCard key={task.id} task={task} apiBase={apiBase} dim={Boolean(selected) && task.owner !== selected && !(selected === 'go' && task.status === '검수')} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** 작업 한 건. 산출물은 서버가 이 PC 의 기본 앱·탐색기로 연다(산출물 폴더 안의 문서만, POST /api/open). */
function TaskCard({ task, dim, apiBase }: { task: HiveTask; dim: boolean; apiBase?: string }) {
  const { t, lang, name } = useOfficeLang();
  const [openErr, setOpenErr] = useState('');
  const sc = STATUS_COLOR[task.status] ?? STATUS_COLOR['대기'];
  const file = task.output ? task.output.split('/').pop() : '';
  const gateColor = GATE_COLOR[task.gate] ?? MUTED;
  const open = async (rel: string, select = false) => {
    setOpenErr('');
    const r = await postJson(`${apiBase}/api/open`, { path: rel, select });
    if (!r.ok) setOpenErr(t('tasks.openFail', { e: String(r.error) }));
  };
  const action = { display: 'inline-flex', alignItems: 'center', gap: 3, font: 'inherit', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: '2px 7px', borderRadius: 5, border: `1px solid ${LINE}`, background: '#fff', color: WYLIE_DARK, whiteSpace: 'nowrap' } as const;
  return (
    <article style={{ border: `1px solid ${LINE}`, borderLeft: `3px solid ${sc.fg}`, borderRadius: 8, padding: '7px 10px 8px', background: '#fff', fontSize: 12.5, opacity: dim ? 0.42 : 1, transition: 'opacity .2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: MUTED }}>{task.id}</span>
        <PixelAvatar id={task.owner} size={18} />
        <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{name(task.owner)}</span>
        {task.stage && <span style={{ fontSize: 10.5, color: MUTED, fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.stage}</span>}
        <span title={t('tasks.gate', { g: gateLabel(lang, task.gate) })} style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, color: gateColor, border: `1px solid ${gateColor}55`, borderRadius: 4, padding: '0 5px', whiteSpace: 'nowrap' }}>
          {gateLabel(lang, task.gate)}
        </span>
      </div>
      <div style={{ fontWeight: 650, lineHeight: 1.4, marginTop: 4, color: INK, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={task.title}>{task.title}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 5, fontSize: 11, color: MUTED, alignItems: 'center', flexWrap: 'wrap' }}>
        {task.needs_approval && <span style={{ whiteSpace: 'nowrap', color: WARN_FG, fontWeight: 800 }}>{t('tasks.needsApproval')}</span>}
        {task.depends_on && task.depends_on.length > 0 && <span style={{ whiteSpace: 'nowrap', fontFamily: MONO }}>← {task.depends_on.join(', ')}</span>}
        {Boolean(task.tokens) && <span style={{ whiteSpace: 'nowrap' }} title={t('tasks.tokenNote')}>{t('tasks.tokens', { v: tok((task.tokens || 0) + (task.qa_tokens || 0)) })}</span>}
        {task.output && apiBase !== undefined && (
          <span style={{ display: 'inline-flex', gap: 4, marginLeft: 'auto' }}>
            <button type="button" style={action} onClick={() => open(task.output || '')} title={file}><FileText size={12} aria-hidden />{t('tasks.open')}</button>
            {task.docx && <button type="button" style={action} onClick={() => open(task.docx || '')} title={task.docx.split('/').pop()}>{t('tasks.word')}</button>}
            {task.xlsx && <button type="button" style={action} onClick={() => open(task.xlsx || '')} title={task.xlsx.split('/').pop()}>{t('tasks.excel')}</button>}
            <button type="button" style={action} onClick={() => open(task.output || '', true)} aria-label={t('tasks.folder')} title={t('tasks.folder')}><FolderOpen size={12} aria-hidden /></button>
          </span>
        )}
      </div>
      {task.qa_summary && ['실패', '보류'].includes(task.status) && <div style={{ fontSize: 11, color: task.status === '실패' ? BAD_FG : MUTED, marginTop: 4, lineHeight: 1.45 }}>{task.qa_summary}</div>}
      {openErr && <div role="status" style={{ fontSize: 11, color: BAD_FG, marginTop: 4 }}>{openErr}</div>}
    </article>
  );
}
