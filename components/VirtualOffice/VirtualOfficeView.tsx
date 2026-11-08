import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { OfficeSimulator } from './officeSimulator';
import type { RenderVals, HiveState, OfficeState } from './officeSimulator';
import { normalizeBase, saveOfficeBackend } from './officeBackend';
import { CommandCenter } from './CommandCenter';
import type { CommandTab } from './CommandCenter';
import { AgentCards } from './AgentCards';
import type { AgentCardData } from './AgentCards';
import { postJson, useEventStream, usePolling } from './officeApi';
import type { AgentStatus, AuthState, RosterResponse } from './officeApi';
import {
  AGENT_NAMES, AGENT_ORDER, AGENT_ROLES, BAD_FG, FONT, GATE_NAMES, INK, LINE, MONO, MUTED, WYLIE, WYLIE_DARK, WYLIE_TINT, inputStyle,
} from './officeTheme';
import './virtualOffice.css';

interface VirtualOfficeViewProps {
  teamLabel?: string;
  autoApprove?: boolean;
  initialSpeed?: number;
  /** 지정 시 이 URL의 상태 JSON을 2초 폴링해 실제 에이전트 상태를 반영(내부 데모 정지).
   *  스키마: OfficeState. 미지정 시 자체 시뮬레이션으로 동작. */
  stateUrl?: string;
  /** 외부 상태 폴링 주기(ms). 기본 2000. */
  pollMs?: number;
  /** 브리핑 제출 대상(백엔드 API). 지정 시 브리핑을 POST(경로 B). 미지정 시 복사/다운로드(경로 A). */
  instructUrl?: string;
  /** 연결된 백엔드 기준 주소(표시용). ''=같은 오리진, undefined=미연결 */
  backendBase?: string;
  /** 백엔드 주소를 어디서 정했는지(표시용) */
  backendSource?: 'query' | 'saved' | 'local' | 'none';
}

function fallbackVals(teamLabel: string, initialSpeed: number, autoApprove: boolean): RenderVals {
  const gates = GATE_NAMES.map((name, i) => ({
    num: 'G' + (i + 1), name, label: '대기', pct: '0%',
    bg: 'transparent', fg: MUTED, barColor: '#2D8C4E',
    opacity: i === 0 ? 1 : 0.55, anim: 'none', showMini: false,
    showLink: i > 0, linkColor: LINE,
  }));
  return {
    teamLabel, clock: 'DAY 1 · 09:00', playLabel: '⏸ 일시정지', speedLabel: `속도 ${initialSpeed}×`,
    auto: autoApprove, gates, showApprovalCard: false, approvalDesc: '', approvalFile: '', approvalScore: '',
    feed: [], feedEmpty: true, artifacts: [], artifactsEmpty: true,
    toastMsg: '', toastOpacity: 0, toastTransform: 'translateX(-50%) translateY(20px)',
  };
}

const SIM_TO_STATUS: Record<string, AgentStatus> = { working: '진행', waiting: '승인대기', idle: '대기' };

const chip = { fontWeight: 700, fontSize: 11.5, padding: '1px 8px', borderRadius: 4, whiteSpace: 'nowrap' } as const;
const bar = { margin: '8px 12px 0', borderRadius: 6, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5 } as const;

/**
 * Wylie AX Office — 팀장이 브리핑을 나눠 12 AI 에이전트에게 배정하고, hive 상태를 픽셀 사무실로 보여 주는 화면.
 * 배치는 Munder Difflin 과 같다: 상단 바 · [왼쪽 사무실 | 오른쪽 커맨드 센터(탭·대기열·브리핑 입력)] · 하단 에이전트 바.
 * 창 전체를 고정 배치로 쓰고(페이지 스크롤 없음), 좁은 창에서는 세로로 쌓는다(virtualOffice.css).
 */
export function VirtualOfficeView({
  teamLabel = '와일리 컨버전스 · AX Office',
  autoApprove = false,
  initialSpeed = 1,
  stateUrl,
  pollMs = 2000,
  instructUrl,
  backendBase,
  backendSource = 'none',
}: VirtualOfficeViewProps) {
  // API 기준 주소: '/api/instruct' → ''(같은 오리진), 'https://x/api/instruct' → 'https://x', 미연결 → undefined
  const apiBase = instructUrl !== undefined ? instructUrl.replace(/\/api\/instruct$/, '') : undefined;

  // 공개 사이트(GitHub Pages)에서 PC 서버에 붙기 위한 주소 입력 — 저장 후 새로고침하면 officeBackend 가 읽는다.
  const [serverInput, setServerInput] = useState(backendBase || '');
  const [serverMsg, setServerMsg] = useState('');
  const connectServer = () => {
    const base = normalizeBase(serverInput);
    if (!base) { setServerMsg('https:// 로 시작하는 서버 주소를 넣어 주세요.'); return; }
    saveOfficeBackend(base);
    const url = new URL(window.location.href);
    url.searchParams.delete('api');
    window.location.href = url.toString(); // 저장한 주소로 다시 연결
  };
  const disconnectServer = () => {
    saveOfficeBackend(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('api');
    window.location.href = url.toString();
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<OfficeSimulator | null>(null);
  const [, setVersion] = useState(0);
  const [ext, setExt] = useState<OfficeState | null>(null);
  const [tab, setTab] = useState<CommandTab>('tasks');
  const [selected, setSelected] = useState<string | null>(null);

  // 카드·책상 선택. 작업/승인 탭을 보고 있었다면 그 사람의 활동 탭으로 넘긴다.
  const handleSelect = useCallback((id: string | null) => {
    setSelected(id);
    if (id) setTab((t) => (t === 'tasks' || t === 'approvals' ? 'activity' : t));
  }, []);
  // 시뮬레이터는 한 번만 만들어지므로, 책상 클릭 콜백은 최신 선택값을 ref 로 읽는다.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    if (!svgRef.current) return;
    const sim = new OfficeSimulator(svgRef.current, {
      teamLabel, autoApprove, initialSpeed,
      onRender: () => setVersion(v => v + 1),
      onSelectAgent: (id) => handleSelect(selectedRef.current === id ? null : id),
    });
    simRef.current = sim;
    return () => { sim.destroy(); simRef.current = null; };
    // 프로퍼티는 초기 설정값(디자인의 constructor props와 동일 의미) — 1회만 구성.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { simRef.current?.highlightAgent(selected); }, [selected]);

  // 실전 연동: stateUrl 지정 시 상태 JSON을 폴링해 applyOfficeState로 주입.
  useEffect(() => {
    if (!stateUrl) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(stateUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as OfficeState;
        if (!alive) return;
        simRef.current?.applyOfficeState(data);
        setExt(data);
      } catch {
        // 폴링 실패는 무시하고 다음 주기에 재시도(네트워크 일시 오류 내성).
      }
    };
    poll();
    const iv = setInterval(poll, pollMs);
    return () => { alive = false; clearInterval(iv); };
  }, [stateUrl, pollMs]);

  // 서버 API — 명단(상태·사용량·스킬), 로그인 여부, 이벤트 증분
  const roster = usePolling<RosterResponse>(apiBase !== undefined ? `${apiBase}/api/roster` : undefined, 3000);
  const auth = usePolling<AuthState>(apiBase !== undefined ? `${apiBase}/api/auth` : undefined, 60000);
  const events = useEventStream(apiBase, 3000);

  // [로그인] — 새 PowerShell 창을 띄우고, 로그인이 확인될 때까지 5초마다 다시 묻는다(최대 3분).
  const [loginMsg, setLoginMsg] = useState('');
  const [loginWatch, setLoginWatch] = useState(false);
  const startLogin = async () => {
    if (apiBase === undefined) return;
    setLoginMsg('로그인 창을 여는 중…');
    const r = await postJson(`${apiBase}/api/auth/login`, {});
    if (!r.ok) { setLoginMsg(`로그인 창을 열지 못했습니다: ${r.error}`); return; }
    setLoginMsg('PowerShell 창이 열렸습니다. 브라우저에서 승인한 뒤 화면의 코드를 그 창에 붙여 넣으세요. 끝나면 이 배너가 사라집니다.');
    setLoginWatch(true);
  };
  const refreshAuth = auth.refresh;
  useEffect(() => {
    if (!loginWatch || apiBase === undefined) return;
    const started = Date.now();
    const iv = setInterval(async () => {
      try { await fetch(`${apiBase}/api/auth?refresh=1`, { cache: 'no-store' }); } catch { /* 다음 주기 */ }
      refreshAuth();
      if (Date.now() - started > 180000) setLoginWatch(false);
    }, 5000);
    return () => clearInterval(iv);
  }, [loginWatch, apiBase, refreshAuth]);
  useEffect(() => { if (auth.data?.loggedIn) { setLoginWatch(false); setLoginMsg(''); } }, [auth.data?.loggedIn]);

  const onSubmitted = useCallback((title: string) => simRef.current?.noteInstruction(title), []);

  const sim = simRef.current;
  const rv: RenderVals = sim ? sim.getRenderVals() : fallbackVals(teamLabel, initialSpeed, autoApprove);
  const hive: HiveState | null = sim ? sim.getHive() : null;
  const question = sim ? sim.getQuestion() : '';
  const connected = Boolean(hive) && apiBase !== undefined;

  // 서버 연결 시 명단 API, 데모일 때는 시뮬레이터 자리 상태로 카드를 만든다(13장이라 매번 계산해도 가볍다).
  const demoStates = sim && !connected ? sim.getAgentStates() : null;
  const cards: AgentCardData[] = connected && roster.data
    ? roster.data.members.map((m) => ({ id: m.id, name: m.name, role: AGENT_ROLES[m.id] ?? m.dept, status: m.status, task: m.task, usd: m.usd }))
    : AGENT_ORDER.map((id) => {
      const s = demoStates?.[id];
      return { id, name: AGENT_NAMES[id], role: AGENT_ROLES[id], status: SIM_TO_STATUS[s?.state ?? 'idle'], task: s?.state === 'idle' ? '' : (s?.task ?? ''), usd: 0 };
    });

  const demo = useMemo(() => ({
    feed: rv.feed, showApproval: rv.showApprovalCard, approvalDesc: rv.approvalDesc, approvalFile: rv.approvalFile, approvalScore: rv.approvalScore,
    onApprove: () => simRef.current?.approveManual(),
  }), [rv.feed, rv.showApprovalCard, rv.approvalDesc, rv.approvalFile, rv.approvalScore]);

  const a = auth.data;
  const mode = roster.data?.mode ?? a?.mode;
  const showLoginBanner = Boolean(a && a.loggedIn === false);
  const showCliBanner = Boolean(a && !a.cli && mode === 'claude_code');
  const playing = !rv.playLabel.startsWith('▶');

  return (
    <div className="axo-app" style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.5 }}>
      {/* 상단 바 — 앱 이름 · 모드 · 자동 진행 · 시계 · 재생 제어 */}
      <header className="axo-top">
        <span aria-hidden style={{ width: 14, height: 14, background: WYLIE, boxShadow: 'inset -3px -3px 0 rgba(0,0,0,.2)', flexShrink: 0 }} />
        <strong style={{ fontSize: 15, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Wylie AX Office</strong>
        <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{rv.teamLabel}</span>
        {hive ? (
          <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ ...chip, color: WYLIE_DARK, background: WYLIE_TINT, border: `1px solid ${WYLIE}` }}>hive 연결{backendBase ? ` · ${backendBase.replace(/^https?:\/\//, '')}` : ''}</span>
            {mode && <span style={{ ...chip, color: INK, background: '#fff', border: `1px solid ${LINE}`, fontFamily: MONO }}>{mode}</span>}
            {ext?.concurrency && <span style={{ ...chip, color: INK, background: '#fff', border: `1px solid ${LINE}` }}>동시 {ext.concurrency.running}/{ext.concurrency.limit}</span>}
          </span>
        ) : (
          stateUrl
            ? <span style={{ ...chip, color: '#A14A2A', background: '#FBEFE9', border: '1px solid #E3B39F' }}>서버 응답 없음{backendBase ? ` · ${backendBase.replace(/^https?:\/\//, '')}` : ''}</span>
            : <span style={{ ...chip, color: MUTED, background: '#fff', border: `1px solid ${LINE}` }}>데모</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED, fontWeight: 600, fontFamily: MONO, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{rv.clock}</span>
        <button type="button" className="axo-iconbtn" onClick={() => sim?.togglePlay()} title="사무실 애니메이션 일시정지·재생(작업 진행과는 무관)">
          {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}{playing ? '일시정지' : '재생'}
        </button>
        <button type="button" className="axo-iconbtn" onClick={() => sim?.cycleSpeed()}>{rv.speedLabel}</button>
        {!hive && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: MUTED, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={rv.auto} onChange={(e) => sim?.setAuto(e.target.checked)} style={{ accentColor: '#2D8C4E', width: 14, height: 14, cursor: 'pointer' }} />
            자동 결재(데모)
          </label>
        )}
        {!hive && <button type="button" className="axo-iconbtn" onClick={() => sim?.reset()}>리셋</button>}
      </header>

      {/* Claude 로그인 배너 — 풀려 있으면 에이전트 실행이 '로그인 필요'로 실패한다 */}
      {showLoginBanner && (
        <section role="alert" style={{ ...bar, background: '#FBEFE9', border: '1px solid #E3B39F' }}>
          <strong style={{ color: BAD_FG }}>Claude 로그인이 풀려 있습니다</strong>
          <span style={{ flex: '1 1 320px', color: INK }}>{loginMsg || '이 상태에서는 팀장 분해·역할 실행·QA가 "로그인 필요"로 실패합니다. [로그인]을 누르면 새 PowerShell 창에서 로그인을 진행합니다.'}</span>
          <button type="button" onClick={startLogin} style={{ font: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: '5px 14px', borderRadius: 4, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff' }}>로그인</button>
        </section>
      )}
      {showCliBanner && (
        <section role="alert" style={{ ...bar, background: '#FBEFE9', border: '1px solid #E3B39F' }}>
          <strong style={{ color: BAD_FG }}>Claude Code CLI를 찾지 못했습니다.</strong>
          <span>Claude 데스크톱 앱이 설치·로그인돼 있는지 확인하세요. CLI 없이 더미로 바꿔 돌리지 않습니다.</span>
        </section>
      )}
      {/* 팀장 되물음 */}
      {question && (
        <section role="alert" style={{ ...bar, background: '#F8E3DF', border: '1px solid #D0684A' }}>
          <strong style={{ color: BAD_FG }}>팀장이 되물었습니다</strong>
          <span style={{ flex: '1 1 320px' }}>{question}</span>
          <span style={{ fontSize: 11.5, color: MUTED }}>결과 줄을 고쳐 다시 보내 주세요.</span>
        </section>
      )}
      {/* 서버 주소 — 공개 사이트에서 PC 에 띄운 서버(터널 주소)에 붙인다. 로컬(같은 오리진·설치형 앱)에서는 숨김 */}
      {backendSource !== 'local' && (
        <section aria-label="서버 연결" style={{ ...bar, background: '#FFFDF8', border: `1px solid ${LINE}` }}>
          <strong style={{ fontSize: 12, color: WYLIE_DARK, whiteSpace: 'nowrap' }}>PC 서버 주소</strong>
          <input
            value={serverInput}
            onChange={(e) => setServerInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') connectServer(); }}
            placeholder="https://xxxx.trycloudflare.com  (PC 에서 start-ax-office.ps1 이 출력한 주소)"
            style={{ ...inputStyle, marginTop: 0, flex: '1 1 300px', fontFamily: MONO, fontSize: 12, padding: '5px 9px' }}
          />
          <button type="button" className="axo-iconbtn" onClick={connectServer}>연결</button>
          {backendBase && <button type="button" className="axo-iconbtn" onClick={disconnectServer}>연결 해제</button>}
          <span style={{ fontSize: 11, color: MUTED, flexBasis: '100%' }}>
            {serverMsg || (backendSource === 'saved' ? '이 브라우저에 저장된 주소로 연결 중입니다. 터널을 새로 켜면 주소가 바뀝니다.' : '미연결이면 내부 데모만 돕니다. PC 에서 서버와 터널을 켠 뒤 그 주소를 넣으면 실제 작업을 여기서 봅니다.')}
          </span>
        </section>
      )}

      <main className="axo-main">
        {/* 왼쪽 — 게이트 현황 + 사무실 */}
        <section className="axo-left" aria-label="사무실">
          <div className="axo-gates" aria-label="파이프라인 게이트 현황">
            {rv.gates.map((g) => (
              <div key={g.num} className="axo-gate" title={`${g.num} ${g.name} — ${g.label}`} style={{ background: g.bg === 'transparent' ? '#FFFDF8' : g.bg, opacity: g.opacity, animation: g.anim }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 800, color: g.fg }}>{g.num}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{g.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: g.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.label}</span>
                </div>
                <div style={{ height: 3, background: '#EAE5D8', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: g.pct, background: g.barColor, transition: 'width .25s linear' }} />
                </div>
                {g.showMini && !hive && <button type="button" className="apex-btn--mini" style={{ marginTop: 3, padding: '1px 8px', fontSize: 11 }} onClick={() => sim?.approveManual()}>결재</button>}
              </div>
            ))}
          </div>
          <div className="axo-canvas">
            <svg id="office" ref={svgRef} viewBox="0 0 760 880" role="img" aria-label="팀장과 12명의 AI 에이전트가 메시지를 주고받으며 일하는 픽셀 사무실 평면도. 책상을 누르면 그 에이전트를 선택합니다." style={{ shapeRendering: 'crispEdges' }} />
          </div>
          <div style={{ display: 'flex', gap: 14, padding: '0 2px', fontSize: 11.5, fontWeight: 600, color: MUTED, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            <span><b style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: '#2D8C4E' }} />작업 중</span>
            <span><b style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: '#E8A33D' }} />승인·QA 대기</span>
            <span><b style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: '#6B7288' }} />대기</span>
            <span><b style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: WYLIE }} />팀장</span>
            <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{hive ? '봉투 = 메시지(배정·회신·승인 요청) · 책상을 누르면 그 사람 선택' : '데모 — 게이트마다 담당자들이 회의실에서 킥오프'}</span>
          </div>
        </section>

        {/* 오른쪽 — 커맨드 센터(탭·대기열·브리핑 입력) */}
        <CommandCenter
          tab={tab}
          onTab={setTab}
          hive={hive}
          apiBase={apiBase}
          selected={selected}
          onSelect={handleSelect}
          roster={roster.data?.members ?? null}
          events={events}
          concurrency={ext?.concurrency}
          mode={mode}
          demo={demo}
          instructUrl={instructUrl}
          onSubmitted={onSubmitted}
        />
      </main>

      {/* 하단 — 에이전트 바 */}
      <footer className="axo-bottom">
        <AgentCards members={cards} selected={selected} onSelect={handleSelect} connected={connected} />
      </footer>

      <div role="status" style={{ position: 'fixed', left: '50%', bottom: 26, background: INK, color: '#fff', fontSize: 13.5, fontWeight: 700, padding: '10px 18px', borderRadius: 8, pointerEvents: 'none', transition: 'opacity .25s ease, transform .25s ease', opacity: rv.toastOpacity, transform: rv.toastTransform }}>{rv.toastMsg}</div>
    </div>
  );
}
