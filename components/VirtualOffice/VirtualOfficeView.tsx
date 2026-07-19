import { useEffect, useRef, useState } from 'react';
import { OfficeSimulator } from './officeSimulator';
import type { RenderVals } from './officeSimulator';
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
  /** 지시 콘솔 제출 대상(백엔드 API). 지정 시 지시를 POST(경로 B). 미지정 시 복사/다운로드(경로 A). */
  instructUrl?: string;
}

const GATE_NAMES = ['영업/평가', '기획', '디자인', '구현', '검증/배포', '그로스'];

const FONT = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono',Consolas,monospace";

function fallbackVals(teamLabel: string, initialSpeed: number, autoApprove: boolean): RenderVals {
  const gates = ['영업/평가', '기획', '디자인', '구현', '검증/배포', '그로스'].map((name, i) => ({
    num: 'G' + (i + 1), name, label: '대기', pct: '0%',
    bg: 'transparent', fg: '#8B877B', barColor: '#2D8C4E',
    opacity: i === 0 ? 1 : 0.55, anim: 'none', showMini: false,
    showLink: i > 0, linkColor: '#DDD6C8',
  }));
  return {
    teamLabel, clock: 'DAY 1 · 09:00', playLabel: '⏸ 일시정지', speedLabel: `속도 ${initialSpeed}×`,
    auto: autoApprove, gates, showApprovalCard: false, approvalDesc: '', approvalFile: '', approvalScore: '',
    feed: [], feedEmpty: true, artifacts: [], artifactsEmpty: true,
    toastMsg: '', toastOpacity: 0, toastTransform: 'translateX(-50%) translateY(20px)',
  };
}

/** APEX 가상 사무실 — 12 AI 에이전트가 G1~G6 게이트 파이프라인을 진행하는 픽셀 오피스 대시보드. */
export function VirtualOfficeView({
  teamLabel = '컨버전스1팀 · 파일럿',
  autoApprove = false,
  initialSpeed = 1,
  stateUrl,
  pollMs = 2000,
  instructUrl,
}: VirtualOfficeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<OfficeSimulator | null>(null);
  const [, setVersion] = useState(0);

  // 지시 콘솔 폼 상태
  const [instrTitle, setInstrTitle] = useState('');
  const [instrGoal, setInstrGoal] = useState('');
  const [instrGates, setInstrGates] = useState<boolean[]>([true, true, true, true, true, true]);
  const [instrStatus, setInstrStatus] = useState('');
  const [instrBusy, setInstrBusy] = useState(false);

  useEffect(() => {
    if (!svgRef.current) return;
    const sim = new OfficeSimulator(svgRef.current, {
      teamLabel, autoApprove, initialSpeed,
      onRender: () => setVersion(v => v + 1),
    });
    simRef.current = sim;
    return () => { sim.destroy(); simRef.current = null; };
    // 프로퍼티는 초기 설정값(디자인의 constructor props와 동일 의미) — 1회만 구성.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 실전 연동: stateUrl 지정 시 상태 JSON을 폴링해 applyOfficeState로 주입.
  useEffect(() => {
    if (!stateUrl) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(stateUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) simRef.current?.applyOfficeState(data);
      } catch {
        // 폴링 실패는 무시하고 다음 주기에 재시도(네트워크 일시 오류 내성).
      }
    };
    poll();
    const iv = setInterval(poll, pollMs);
    return () => { alive = false; clearInterval(iv); };
  }, [stateUrl, pollMs]);

  const toggleGate = (i: number) => setInstrGates(g => g.map((v, j) => (j === i ? !v : v)));

  const submitInstruction = async () => {
    const title = instrTitle.trim();
    if (!title) { setInstrStatus('과제명을 입력하세요.'); return; }
    const gates = instrGates.map((on, i) => (on ? 'G' + (i + 1) : null)).filter(Boolean);
    const instruction = { title, goal: instrGoal.trim(), gates, ts: new Date().toISOString() };
    const json = JSON.stringify(instruction, null, 2);
    setInstrBusy(true); setInstrStatus('');
    try {
      if (instructUrl) {
        const res = await fetch(instructUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json,
        });
        setInstrStatus(res.ok ? '지시를 오케스트레이터에 전송했습니다.' : `전송 실패 (${res.status})`);
      } else {
        let copied = false;
        try { await navigator.clipboard.writeText(json); copied = true; } catch { /* clipboard 권한/https 아님 → 다운로드로 대체 */ }
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'instruction.json'; a.click();
        URL.revokeObjectURL(url);
        setInstrStatus((copied ? '지시를 복사·다운로드했습니다' : '지시를 다운로드했습니다') + ' — 오케스트레이터 세션에 전달하세요.');
      }
      simRef.current?.noteInstruction(title);
    } catch {
      setInstrStatus('오류: 지시 전송에 실패했습니다.');
    } finally {
      setInstrBusy(false);
    }
  };

  const sim = simRef.current;
  const rv: RenderVals = sim ? sim.getRenderVals() : fallbackVals(teamLabel, initialSpeed, autoApprove);

  return (
    <div style={{ padding: '18px clamp(12px,3vw,32px) 40px', minHeight: '100%', boxSizing: 'border-box', fontFamily: FONT, color: '#24291F', background: '#EFEAE0', fontSize: 15, lineHeight: 1.6 }}>
      {/* 상단 바 */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '10px 4px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 19, letterSpacing: '-0.01em' }}>
          <span style={{ width: 12, height: 12, background: '#2D8C4E', boxShadow: 'inset -3px -3px 0 rgba(0,0,0,.18)', display: 'inline-block', flexShrink: 0 }} />
          <span>APEX 가상 사무실</span>
          <span style={{ fontWeight: 600, fontSize: 12.5, color: '#8B877B', background: '#FFFFFF', border: '1px solid #DDD6C8', padding: '3px 9px', borderRadius: 999 }}>{rv.teamLabel}</span>
        </div>
        <div style={{ fontSize: 13, color: '#8B877B', fontWeight: 600, fontFamily: MONO, letterSpacing: '.06em' }}>{rv.clock}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="apex-btn apex-btn--primary" onClick={() => sim?.togglePlay()}>{rv.playLabel}</button>
          <button className="apex-btn apex-btn--ghost" onClick={() => sim?.cycleSpeed()}>{rv.speedLabel}</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#8B877B', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={rv.auto} onChange={(e) => sim?.setAuto(e.target.checked)} style={{ accentColor: '#2D8C4E', width: 15, height: 15, cursor: 'pointer' }} />
            <span>자동 결재</span>
          </label>
          <button className="apex-btn apex-btn--ghost" onClick={() => sim?.reset()}>리셋</button>
        </div>
      </header>

      {/* 게이트 보드 */}
      <section aria-label="파이프라인 게이트 현황" style={{ background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {rv.gates.map((g, i) => (
          <div key={i} style={{ display: 'contents' }}>
            {g.showLink && <div style={{ width: 26, minWidth: 26, height: 2, background: g.linkColor }} />}
            <div style={{ minWidth: 110, flex: 1, position: 'relative', padding: '6px 8px 8px', borderRadius: 10, textAlign: 'center', background: g.bg, opacity: g.opacity, animation: g.anim }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.12em', color: g.fg, fontFamily: MONO }}>{g.num}</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 1 }}>{g.name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 3, color: g.fg, minHeight: 17 }}>{g.label}</div>
              <div style={{ height: 5, background: '#EAE5D8', borderRadius: 99, marginTop: 7, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: g.pct, background: g.barColor, borderRadius: 99, transition: 'width .25s linear' }} />
              </div>
              {g.showMini && <button className="apex-btn--mini" onClick={() => sim?.approveManual()}>결재</button>}
            </div>
          </div>
        ))}
      </section>

      <main style={{ display: 'flex', gap: 14, alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* 사무실 평면도 */}
        <section style={{ flex: '1 1 640px', minWidth: 0, padding: 14, display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14 }}>
          <svg id="office" ref={svgRef} viewBox="0 0 760 880" role="img" aria-label="12명의 AI 에이전트가 걸어다니며 일하는 픽셀 사무실 평면도" style={{ width: '100%', height: 'auto', display: 'block', shapeRendering: 'crispEdges', borderRadius: 10, background: '#1B1F2E' }} />
          <div style={{ display: 'flex', gap: 18, marginTop: 12, padding: '0 4px', fontSize: 12.5, fontWeight: 600, color: '#8B877B', flexWrap: 'wrap', alignItems: 'center' }}>
            <span><b style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: '#2D8C4E', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.15)' }} />작업 중</span>
            <span><b style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: '#E8A33D', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.15)' }} />게이트 대기</span>
            <span><b style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: '#6B7288', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.15)' }} />대기</span>
            <span style={{ marginLeft: 'auto', fontWeight: 500 }}>게이트 시작 시 담당자들이 회의실로 모여 킥오프를 합니다</span>
          </div>
        </section>

        {/* 우측 패널 */}
        <aside style={{ width: 330, minWidth: 290, flex: '1 1 290px', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 지시 콘솔 — 여기서 직접 업무 지시 */}
          <section style={{ background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14, padding: '13px 16px 15px' }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#4F46E5', margin: '0 0 9px' }}>지시 콘솔</h2>
            <input
              value={instrTitle}
              onChange={(e) => setInstrTitle(e.target.value)}
              placeholder="과제명 (예: IBK 랜딩 개편)"
              style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: 13.5, padding: '8px 10px', border: '1px solid #DDD6C8', borderRadius: 8, outline: 'none' }}
            />
            <textarea
              value={instrGoal}
              onChange={(e) => setInstrGoal(e.target.value)}
              placeholder="목표·요구 (한두 줄)"
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: 13, padding: '8px 10px', border: '1px solid #DDD6C8', borderRadius: 8, outline: 'none', marginTop: 7, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '9px 0' }}>
              {GATE_NAMES.map((n, i) => (
                <button
                  key={i}
                  onClick={() => toggleGate(i)}
                  title={n}
                  style={{
                    font: 'inherit', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                    padding: '3px 8px', borderRadius: 999,
                    background: instrGates[i] ? '#DFF2E6' : '#F2EFE7',
                    color: instrGates[i] ? '#1F6B3A' : '#9A968A',
                    border: '1px solid ' + (instrGates[i] ? '#2D8C4E' : '#DDD6C8'),
                  }}
                >{'G' + (i + 1)}</button>
              ))}
            </div>
            <button
              className="apex-btn--approve"
              onClick={submitInstruction}
              disabled={instrBusy}
              style={{ opacity: instrBusy ? 0.6 : 1 }}
            >{instrBusy ? '전송 중…' : '지시 보내기'}</button>
            {instrStatus && <p style={{ fontSize: 12, color: '#1F6B3A', fontWeight: 600, margin: '9px 0 0' }}>{instrStatus}</p>}
            <p style={{ fontSize: 11, color: '#8B877B', margin: '7px 0 0', lineHeight: 1.5 }}>
              {instructUrl
                ? '백엔드 연결됨 — 지시가 자동 실행됩니다.'
                : '백엔드 미연결 — 지시(instruction.json)를 오케스트레이터 세션이 실행합니다.'}
            </p>
          </section>

          {rv.showApprovalCard && (
            <section style={{ background: '#FBEED6', border: '1px solid #E8A33D', borderRadius: 14 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#A96F15', padding: '13px 16px 0', margin: 0 }}>결재 요청</h2>
              <div style={{ padding: '10px 16px 14px' }}>
                <p style={{ fontSize: 13, color: '#A96F15', fontWeight: 600, margin: 0 }}>{rv.approvalDesc}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#fff', border: '1px solid #DDD6C8', borderRadius: 9, padding: '9px 12px', margin: '8px 0 12px', fontSize: 13.5, fontWeight: 700 }}>
                  <span>{rv.approvalFile}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1F6B3A', background: '#DFF2E6', padding: '2px 9px', borderRadius: 999 }}>{rv.approvalScore}</span>
                </div>
                <button className="apex-btn--approve" onClick={() => sim?.approveManual()}>결재하기</button>
              </div>
            </section>
          )}

          <section style={{ flex: 1, minHeight: 180, display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#8B877B', padding: '13px 16px 0', margin: 0 }}>라이브 피드</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: '8px 16px 14px', overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rv.feedEmpty && <li style={{ color: '#8B877B', fontSize: 13, padding: '5px 0' }}>시뮬레이션이 시작되면 활동이 기록됩니다.</li>}
              {rv.feed.map((f, i) => (
                <li key={f.t + f.who + i} style={{ fontSize: 13, padding: '5px 0', borderBottom: '1px dashed #EEE9DD', display: 'flex', gap: 9, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11.5, color: '#8B877B', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: MONO, letterSpacing: '.06em' }}>{f.t}</span>
                  <span style={{ fontWeight: 800, color: f.whoColor }}>{f.who}</span>
                  <span>{f.msg}</span>
                </li>
              ))}
            </ul>
          </section>

          <section style={{ background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#8B877B', padding: '13px 16px 0', margin: 0 }}>산출물</h2>
            <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rv.artifactsEmpty && <span style={{ color: '#8B877B', fontSize: 13 }}>게이트를 통과한 산출물이 여기 쌓입니다.</span>}
              {rv.artifacts.map((a, i) => (
                <div key={a.g + i} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #DDD6C8', borderRadius: 9, padding: '8px 12px', fontSize: 13, background: '#FCFAF5', animation: 'apex-slidein .4s ease' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: '#fff', background: '#2D8C4E', padding: '2px 7px', borderRadius: 6, fontFamily: MONO }}>{a.g}</span>
                  <span style={{ fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.f}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1F6B3A' }}>{a.s}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <div role="status" style={{ position: 'fixed', left: '50%', bottom: 26, background: '#24291F', color: '#fff', fontSize: 13.5, fontWeight: 700, padding: '10px 18px', borderRadius: 10, pointerEvents: 'none', transition: 'opacity .25s ease, transform .25s ease', opacity: rv.toastOpacity, transform: rv.toastTransform }}>{rv.toastMsg}</div>
    </div>
  );
}
