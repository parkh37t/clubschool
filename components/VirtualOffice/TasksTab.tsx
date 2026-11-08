import type { HiveState, HiveTask } from './officeSimulator';
import { gateLabel, statusLabel, useOfficeLang } from './i18n';
import { BAD_FG, GATE_COLOR, LINE, MONO, MUTED, PAPER, STATUS_COLOR, WARN_FG, WYLIE, WYLIE_DARK, WYLIE_TINT, h2Style, smallMuted, usd } from './officeTheme';

interface TasksTabProps {
  connected: boolean;
  hive: HiveState | null;
  selected: string | null;
  concurrency?: { limit: number; running: number };
}

/** 작업 탭 — 이번 브리핑의 작업 원장(선행·게이트·비용·상한). 선택한 사람의 작업만 진하게. */
export function TasksTab({ connected, hive, selected, concurrency }: TasksTabProps) {
  const { t } = useOfficeLang();
  if (!connected || !hive) return <p style={smallMuted}>{t('tasks.offline')}</p>;
  const tasks = hive.tasks;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <h2 style={h2Style}>{t('tasks.title')}</h2>
        {hive.briefing && <span style={{ fontSize: 11.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={hive.briefing}>{hive.briefing}</span>}
        {concurrency && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: WYLIE_DARK, background: WYLIE_TINT, border: `1px solid ${WYLIE}`, borderRadius: 999, padding: '1px 8px' }}>{t('top.concurrency', { r: concurrency.running, l: concurrency.limit })}</span>}
      </div>
      {!tasks.length && <p style={smallMuted}>{t('tasks.empty')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {tasks.map((task) => <TaskCard key={task.id} task={task} dim={Boolean(selected) && task.owner !== selected && !(selected === 'go' && task.status === '검수')} />)}
      </div>
    </div>
  );
}

function TaskCard({ task, dim }: { task: HiveTask; dim: boolean }) {
  const { t, lang, name } = useOfficeLang();
  const sc = STATUS_COLOR[task.status] ?? STATUS_COLOR['대기'];
  const file = task.output ? task.output.split('/').pop() : '';
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px', background: PAPER, fontSize: 12.5, opacity: dim ? 0.42 : 1, transition: 'opacity .2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: WYLIE_DARK }}>{task.id}</span>
        <span style={{ fontWeight: 700 }}>{name(task.owner)}</span>
        {task.stage && <span style={{ fontSize: 10.5, color: MUTED, fontFamily: MONO }}>{task.stage}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: sc.bg, color: sc.fg }}>{statusLabel(lang, task.status)}</span>
      </div>
      <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{task.title}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: MUTED, alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, color: GATE_COLOR[task.gate] ?? MUTED, whiteSpace: 'nowrap' }}>{t('tasks.gate', { g: gateLabel(lang, task.gate) })}</span>
        {task.needs_approval && <span style={{ whiteSpace: 'nowrap', color: WARN_FG, fontWeight: 700 }}>{t('tasks.needsApproval')}</span>}
        {task.depends_on && task.depends_on.length > 0 && <span style={{ whiteSpace: 'nowrap', fontFamily: MONO }}>← {task.depends_on.join(', ')}</span>}
        {Boolean(task.cost_usd) && <span style={{ whiteSpace: 'nowrap' }}>{usd(task.cost_usd)}</span>}
        {file && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '1 1 120px' }} title={task.output}>{file}</span>}
      </div>
      {task.qa_summary && ['실패', '보류'].includes(task.status) && <div style={{ fontSize: 11, color: task.status === '실패' ? BAD_FG : MUTED, marginTop: 3, lineHeight: 1.4 }}>{task.qa_summary}</div>}
    </div>
  );
}
