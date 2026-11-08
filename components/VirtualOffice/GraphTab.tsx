import { useMemo, useState } from 'react';
import { usePolling } from './officeApi';
import type { LedgerTask } from './officeApi';
import { gateLabel, statusLabel, useOfficeLang } from './i18n';
import { BAD_FG, GATE_COLOR, INK, LINE, MONO, MUTED, OK_FG, STATUS_COLOR, WYLIE, h2Style, inputStyle, smallMuted } from './officeTheme';

interface GraphTabProps {
  connected: boolean;
  apiBase?: string;
  /** 지금 도는 브리핑 id(있으면 처음에 그 브리핑을 보여 준다) */
  currentBriefing?: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

// 커맨드 센터는 좁고 길어서 단계를 위에서 아래로 쌓는다(한 줄 = 선행 단계 깊이 하나).
const W = 150; // 노드 너비
const H = 58; // 노드 높이
const SIB_GAP = 14; // 같은 단계 노드 사이
const LEVEL_GAP = 30; // 단계 사이(선이 지나가는 자리)
const PAD = 12;

/** 'YYYYMMDD-HHmm_제목' → '11-08 16:14 제목' */
function briefingLabel(id: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})_(.*)$/.exec(id);
  return m ? `${m[2]}-${m[3]} ${m[4]}:${m[5]} ${m[6].replace(/_/g, ' ')}` : id;
}

/** 제목을 노드 안 두 줄로 자른다(한글 기준 대략 11자). */
function twoLines(s: string): [string, string] {
  const n = 11;
  if (s.length <= n) return [s, ''];
  const second = s.slice(n, n * 2);
  return [s.slice(0, n), s.length > n * 2 ? `${second.slice(0, n - 1)}…` : second];
}

/**
 * 관계도 탭 — 브리핑 하나의 작업 선후관계(depends_on)와 진행 상태를 그래프로 보여 준다.
 * 줄 = 선행 단계 깊이(맨 위가 바로 시작할 수 있는 작업). 선은 선행 → 후행, 선행이 완료면 실선.
 * 노드를 누르면 그 담당자가 선택된다(사무실 책상 강조·다른 탭 필터).
 */
export function GraphTab({ connected, apiBase, currentBriefing, selected, onSelect }: GraphTabProps) {
  const { t, lang, name } = useOfficeLang();
  const { data } = usePolling<{ tasks: LedgerTask[] }>(connected ? `${apiBase}/api/hive` : undefined, 5000);
  const [pick, setPick] = useState('');

  // 브리핑 목록 — 마지막 작업이 만들어진 순서(최근 것이 위)
  const briefings = useMemo(() => {
    const last = new Map<string, string>();
    for (const x of data?.tasks ?? []) {
      if (!x.briefing) continue;
      const c = x.created || '';
      if (!last.has(x.briefing) || (last.get(x.briefing) ?? '') < c) last.set(x.briefing, c);
    }
    return [...last.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([id]) => id);
  }, [data]);
  const briefing = pick && briefings.includes(pick) ? pick : currentBriefing && briefings.includes(currentBriefing) ? currentBriefing : briefings[0] ?? '';

  const layout = useMemo(() => {
    const tasks = (data?.tasks ?? []).filter((x) => x.briefing === briefing);
    const byId = new Map(tasks.map((x) => [x.id, x]));
    const depth = new Map<string, number>();
    const visiting = new Set<string>();
    const depthOf = (id: string): number => {
      const known = depth.get(id);
      if (known !== undefined) return known;
      if (visiting.has(id)) return 0; // 순환 참조 방어
      visiting.add(id);
      const deps = (byId.get(id)?.depends_on ?? []).filter((d) => byId.has(d));
      const v = deps.length ? 1 + Math.max(...deps.map(depthOf)) : 0;
      visiting.delete(id);
      depth.set(id, v);
      return v;
    };
    tasks.forEach((x) => depthOf(x.id));
    const levels: LedgerTask[][] = [];
    for (const x of [...tasks].sort((a, b) => (a.id < b.id ? -1 : 1))) {
      const d = depth.get(x.id) ?? 0;
      (levels[d] ||= []).push(x);
    }
    const widest = Math.max(1, ...levels.map((l) => l?.length ?? 0));
    const rowWidth = (n: number) => n * W + Math.max(0, n - 1) * SIB_GAP;
    const pos = new Map<string, { x: number; y: number }>();
    levels.forEach((row, li) => {
      const offset = (rowWidth(widest) - rowWidth(row.length)) / 2; // 줄마다 가운데 맞춤
      row.forEach((x, i) => pos.set(x.id, { x: PAD + offset + i * (W + SIB_GAP), y: PAD + li * (H + LEVEL_GAP) }));
    });
    const width = PAD * 2 + rowWidth(widest);
    const height = PAD * 2 + Math.max(1, levels.length) * H + Math.max(0, levels.length - 1) * LEVEL_GAP;
    const edges = tasks.flatMap((x) => (x.depends_on ?? []).filter((d) => byId.has(d)).map((d) => ({ from: d, to: x.id, done: byId.get(d)?.status === '완료', broken: ['실패', '보류'].includes(byId.get(d)?.status ?? '') })));
    return { tasks, pos, width, height, edges, cols: levels.length };
  }, [data, briefing]);

  if (!connected) return <p style={smallMuted}>{t('gr.offline')}</p>;
  if (!briefings.length) return <p style={smallMuted}>{t('gr.empty')}</p>;

  const count = (ss: string[]) => layout.tasks.filter((x) => ss.includes(x.status)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ ...h2Style, margin: 0 }}>{t('gr.title')}</h2>
        <select value={briefing} onChange={(e) => setPick(e.target.value)} aria-label={t('gr.briefing')}
          style={{ ...inputStyle, marginTop: 0, flex: '1 1 200px', minWidth: 0, fontSize: 12, padding: '4px 6px', resize: undefined }}>
          {briefings.map((b) => <option key={b} value={b}>{briefingLabel(b)}{b === currentBriefing ? ` · ${t('gr.current')}` : ''}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 11.5, color: MUTED }}>
        {t('gr.summary', { n: layout.tasks.length, done: count(['완료']), run: count(['진행', '검수']), wait: count(['승인대기']), closed: count(['보류', '실패']), cols: layout.cols })}
      </div>
      <div style={{ flex: 1, minHeight: 120, overflow: 'auto', border: `1px solid ${LINE}`, borderRadius: 8, background: '#FFFDF8' }}>
        <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={t('gr.title')} style={{ display: 'block' }}>
          <defs>
            <marker id="axo-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill={MUTED} />
            </marker>
            <marker id="axo-arrow-ok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill={OK_FG} />
            </marker>
          </defs>
          {layout.edges.map((e) => {
            const a = layout.pos.get(e.from);
            const b = layout.pos.get(e.to);
            if (!a || !b) return null;
            const x1 = a.x + W / 2; const y1 = a.y + H; const x2 = b.x + W / 2; const y2 = b.y - 2;
            const color = e.done ? OK_FG : e.broken ? BAD_FG : MUTED;
            return (
              <path key={`${e.from}-${e.to}`} d={`M${x1},${y1} C${x1},${y1 + 18} ${x2},${y2 - 18} ${x2},${y2}`} fill="none" stroke={color}
                strokeWidth={1.6} strokeDasharray={e.done ? undefined : '4 3'} markerEnd={`url(#${e.done ? 'axo-arrow-ok' : 'axo-arrow'})`} />
            );
          })}
          {layout.tasks.map((x) => {
            const p = layout.pos.get(x.id);
            if (!p) return null;
            const sc = STATUS_COLOR[x.status] ?? STATUS_COLOR['대기'];
            const on = selected === x.owner;
            const [l1, l2] = twoLines(x.title);
            return (
              // 위치는 인라인 style 로 준다 — 전역 CSS(`* { transform: translateZ(0) }`)가 SVG 의 transform 속성을 덮어쓰기 때문.
              <g key={x.id} onClick={() => onSelect(on ? null : x.owner)} style={{ cursor: 'pointer', transform: `translate(${p.x}px, ${p.y}px)` }}>
                <title>{`${x.id} · ${name(x.owner)}\n${x.title}\n${statusLabel(lang, x.status)} · ${gateLabel(lang, x.gate)}${x.depends_on?.length ? `\n${t('gr.after', { ids: x.depends_on.join(', ') })}` : ''}`}</title>
                <rect width={W} height={H} rx={7} fill={sc.bg} stroke={on ? WYLIE : sc.fg} strokeWidth={on ? 2.4 : 1} strokeOpacity={on ? 1 : 0.55} />
                <text x={8} y={14} fontFamily={MONO} fontSize={10.5} fontWeight={800} fill={sc.fg}>{x.id} · {name(x.owner)}</text>
                <text x={8} y={29} fontSize={11.5} fontWeight={700} fill={INK}>{l1}</text>
                {l2 && <text x={8} y={42} fontSize={11.5} fontWeight={700} fill={INK}>{l2}</text>}
                <text x={8} y={55} fontSize={10} fontWeight={700} fill={sc.fg}>{statusLabel(lang, x.status)}</text>
                <text x={W - 8} y={55} fontSize={10} fontWeight={800} textAnchor="end" fill={GATE_COLOR[x.gate] ?? MUTED}>{gateLabel(lang, x.gate)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: MUTED }}>
        <span><b style={{ display: 'inline-block', width: 16, borderTop: `2px solid ${OK_FG}`, verticalAlign: 'middle', marginRight: 4 }} />{t('gr.legendDone')}</span>
        <span><b style={{ display: 'inline-block', width: 16, borderTop: `2px dashed ${MUTED}`, verticalAlign: 'middle', marginRight: 4 }} />{t('gr.legendWait')}</span>
        <span><b style={{ display: 'inline-block', width: 16, borderTop: `2px dashed ${BAD_FG}`, verticalAlign: 'middle', marginRight: 4 }} />{t('gr.legendBroken')}</span>
        <span style={{ marginLeft: 'auto' }}>{t('gr.hint')}</span>
      </div>
    </div>
  );
}
