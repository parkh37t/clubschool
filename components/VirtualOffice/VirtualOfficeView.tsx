import { useEffect, useRef, useState } from 'react';
import { OfficeSimulator } from './officeSimulator';
import type { RenderVals, HiveState } from './officeSimulator';
import { normalizeBase, saveOfficeBackend } from './officeBackend';
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

interface AttachedFile {
  id: number;
  name: string;
  size: number;
  path?: string; // 서버 저장 상대경로(업로드 완료 시)
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

const GATE_NAMES = ['영업/평가', '기획', '디자인', '구현', '검증/배포', '그로스'];
const AGENT_NAMES: Record<string, string> = {
  han: '한도전', kim: '김영업', jeong: '정우선', na: '나기획', cha: '차도안', oh: '오색감',
  pyo: '표준수', lee: '이풍뎅', baek: '백연동', gu: '구동민', go: '고지표', hong: '홍보라', lead: '팀장', jaeha: '재하',
};
// 와일리 문서 포인트 컬러(보라). 가상 사무실의 기존 초록 계열은 상태색(작업 중)으로만 남긴다.
const WYLIE = '#6A4C9C';
const WYLIE_DARK = '#43306B';
const WYLIE_TINT = '#EFEAF7';

const FONT = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono',Consolas,monospace";

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  '대기': { bg: '#F2EFE7', fg: '#8B877B' }, '진행': { bg: '#DFF2E6', fg: '#1F6B3A' }, '검수': { bg: '#E6EEF8', fg: '#2F5A8C' },
  '승인대기': { bg: '#FBEED6', fg: '#A96F15' }, '완료': { bg: WYLIE_TINT, fg: WYLIE_DARK }, '보류': { bg: '#F2EFE7', fg: '#8B877B' }, '실패': { bg: '#F8E3DF', fg: '#B24A3A' },
};
const GATE_COLOR: Record<string, string> = { PASS: '#1F6B3A', CONDITIONAL: '#A96F15', FAIL: '#B24A3A', '미점검': '#8B877B' };

function fallbackVals(teamLabel: string, initialSpeed: number, autoApprove: boolean): RenderVals {
  const gates = GATE_NAMES.map((name, i) => ({
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

const inputStyle = { width: '100%', boxSizing: 'border-box' as const, font: 'inherit', fontSize: 13, padding: '8px 10px', border: '1px solid #DDD6C8', borderRadius: 8, outline: 'none', marginTop: 7, resize: 'vertical' as const, lineHeight: 1.5 };

/** Wylie AX Office — 팀장이 브리핑을 나눠 12 AI 에이전트에게 배정하고, hive 상태를 픽셀 사무실로 보여 주는 대시보드. */
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

  // 브리핑 콘솔 — 4요소(결과·맥락·제약·질문 기준). 팀장이 이걸 읽고 작업을 나눈다.
  const [instrTitle, setInstrTitle] = useState('');
  const [instrResult, setInstrResult] = useState('');
  const [instrBrief, setInstrBrief] = useState(''); // 맥락 + RFP·자료 전문(선택)
  const [instrConstraints, setInstrConstraints] = useState('');
  const [instrPolicy, setInstrPolicy] = useState('내 결정이 꼭 필요할 때만 물어볼 것');
  const [instrGates, setInstrGates] = useState<boolean[]>([false, false, false, false, false, false]);
  const [instrStatus, setInstrStatus] = useState('');
  const [instrBusy, setInstrBusy] = useState(false);

  // 승인 카드 — 행위자·사유가 없으면 서버가 거부한다.
  const [approveBy, setApproveBy] = useState('재하');
  const [approveReason, setApproveReason] = useState('');
  const [approveStatus, setApproveStatus] = useState('');

  // 파일 첨부 상태 — 백엔드(instructUrl) 연결 시에만 업로드 가능.
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachIdRef = useRef(0);
  // 업로드·승인 엔드포인트는 브리핑 엔드포인트와 같은 오리진(/api/instruct → /api/upload · /api/approve).
  const uploadUrl = instructUrl ? instructUrl.replace(/\/instruct$/, '/upload') : undefined;
  const approveUrl = instructUrl ? instructUrl.replace(/\/instruct$/, '/approve') : undefined;

  const uploadFile = async (file: File) => {
    if (!uploadUrl) return;
    const id = ++attachIdRef.current;
    setAttachments((a) => [...a, { id, name: file.name, size: file.size, status: 'uploading' }]);
    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'X-File-Name': encodeURIComponent(file.name) },
        body: file,
      });
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
  const removeAttachment = (id: number) => setAttachments((a) => a.filter((x) => x.id !== id));

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
    if (!instrResult.trim()) { setInstrStatus('"결과" 줄이 비어 있습니다 — 끝났을 때 손에 쥘 것 한 가지를 적어 주세요.'); return; }
    const gates = instrGates.map((on, i) => (on ? 'G' + (i + 1) : null)).filter(Boolean);
    const files = attachments.filter((a) => a.status === 'done' && a.path).map((a) => ({ name: a.name, path: a.path }));
    const constraints = instrConstraints.split('\n').map((s) => s.trim()).filter(Boolean);
    const briefing = {
      title,
      result: instrResult.trim(),
      goal: instrResult.trim(), // 구 지시 형식 호환
      context: instrBrief.trim(),
      brief: instrBrief.trim(),
      constraints,
      question_policy: instrPolicy.trim(),
      attachments: files,
      gates,
      ts: new Date().toISOString(),
    };
    const json = JSON.stringify(briefing, null, 2);
    setInstrBusy(true); setInstrStatus('');
    try {
      if (instructUrl) {
        const res = await fetch(instructUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json,
        });
        const data = await res.json().catch(() => ({}));
        setInstrStatus(res.ok ? '브리핑을 팀장에게 전달했습니다.' : `전송 실패 (${res.status}) ${data.error || ''}`);
      } else {
        let copied = false;
        try { await navigator.clipboard.writeText(json); copied = true; } catch { /* clipboard 권한/https 아님 → 다운로드로 대체 */ }
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'briefing.json'; a.click();
        URL.revokeObjectURL(url);
        setInstrStatus((copied ? '브리핑을 복사·다운로드했습니다' : '브리핑을 다운로드했습니다') + ' — 오케스트레이터 세션에 전달하세요.');
      }
      simRef.current?.noteInstruction(title);
    } catch {
      setInstrStatus('오류: 브리핑 전송에 실패했습니다.');
    } finally {
      setInstrBusy(false);
    }
  };

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    if (!approveUrl) return;
    if (!approveReason.trim()) { setApproveStatus('사유를 적어야 기록됩니다.'); return; }
    try {
      const res = await fetch(approveUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, by: approveBy.trim() || '재하', reason: approveReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setApproveStatus(res.ok ? `${id} ${decision === 'approved' ? '승인' : '반려'} 기록됨` : `실패: ${data.error || res.status}`);
      if (res.ok) setApproveReason('');
    } catch {
      setApproveStatus('오류: 서버에 연결하지 못했습니다.');
    }
  };

  const sim = simRef.current;
  const rv: RenderVals = sim ? sim.getRenderVals() : fallbackVals(teamLabel, initialSpeed, autoApprove);
  const hive: HiveState | null = sim ? sim.getHive() : null;
  const question = sim ? sim.getQuestion() : '';
  const pending = hive?.pending ?? [];
  const taskOf = (id: string) => hive?.tasks.find((t) => t.id === id);

  return (
    <div style={{ padding: '18px clamp(12px,3vw,32px) 40px', minHeight: '100%', boxSizing: 'border-box', fontFamily: FONT, color: '#24291F', background: '#EFEAE0', fontSize: 15, lineHeight: 1.6 }}>
      {/* 상단 바 */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '10px 4px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 19, letterSpacing: '-0.01em' }}>
          <span style={{ width: 12, height: 12, background: WYLIE, boxShadow: 'inset -3px -3px 0 rgba(0,0,0,.18)', display: 'inline-block', flexShrink: 0 }} />
          <span>Wylie AX Office</span>
          <span style={{ fontWeight: 600, fontSize: 12.5, color: '#8B877B', background: '#FFFFFF', border: '1px solid #DDD6C8', padding: '3px 9px', borderRadius: 999 }}>{rv.teamLabel}</span>
          {hive && <span style={{ fontWeight: 700, fontSize: 11.5, color: WYLIE_DARK, background: WYLIE_TINT, border: `1px solid ${WYLIE}`, padding: '2px 8px', borderRadius: 999 }}>hive 연결{backendBase ? ` · ${backendBase.replace(/^https?:\/\//, '')}` : ''}</span>}
          {!hive && stateUrl && <span style={{ fontWeight: 700, fontSize: 11.5, color: '#A14A2A', background: '#FBEFE9', border: '1px solid #E3B39F', padding: '2px 8px', borderRadius: 999 }}>서버 응답 없음{backendBase ? ` · ${backendBase.replace(/^https?:\/\//, '')}` : ''}</span>}
        </div>
        <div style={{ fontSize: 13, color: '#8B877B', fontWeight: 600, fontFamily: MONO, letterSpacing: '.06em' }}>{rv.clock}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="apex-btn apex-btn--primary" onClick={() => sim?.togglePlay()}>{rv.playLabel}</button>
          <button className="apex-btn apex-btn--ghost" onClick={() => sim?.cycleSpeed()}>{rv.speedLabel}</button>
          {!hive && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#8B877B', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={rv.auto} onChange={(e) => sim?.setAuto(e.target.checked)} style={{ accentColor: '#2D8C4E', width: 15, height: 15, cursor: 'pointer' }} />
              <span>자동 결재(데모)</span>
            </label>
          )}
          <button className="apex-btn apex-btn--ghost" onClick={() => sim?.reset()}>리셋</button>
        </div>
      </header>

      {/* 서버 주소 — 공개 사이트에서 PC 에 띄운 서버(터널 주소)에 붙인다. 로컬 개발(같은 오리진)에서는 숨김 */}
      {backendSource !== 'local' && (
        <section aria-label="서버 연결" style={{ background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14, padding: '10px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: WYLIE_DARK, whiteSpace: 'nowrap' }}>PC 서버 주소</span>
          <input
            value={serverInput}
            onChange={(e) => setServerInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') connectServer(); }}
            placeholder="https://xxxx.trycloudflare.com  (PC 에서 start-ax-office.ps1 이 출력한 주소)"
            style={{ ...inputStyle, marginTop: 0, flex: '1 1 320px', fontFamily: MONO, fontSize: 12.5 }}
          />
          <button className="apex-btn apex-btn--primary" onClick={connectServer}>연결</button>
          {backendBase && <button className="apex-btn apex-btn--ghost" onClick={disconnectServer}>연결 해제</button>}
          <span style={{ fontSize: 11.5, color: '#8B877B', flexBasis: '100%' }}>
            {serverMsg || (backendSource === 'saved' ? '이 브라우저에 저장된 주소로 연결 중입니다. 주소가 바뀌면 다시 넣어 주세요(터널을 새로 켤 때마다 바뀝니다).' : '미연결이면 내부 데모만 돕니다. PC 에서 서버와 터널을 켠 뒤 그 주소를 넣으면 실제 작업을 여기서 봅니다.')}
          </span>
        </section>
      )}

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
              {g.showMini && !hive && <button className="apex-btn--mini" onClick={() => sim?.approveManual()}>결재</button>}
            </div>
          </div>
        ))}
      </section>

      <main style={{ display: 'flex', gap: 14, alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* 사무실 평면도 */}
        <section style={{ flex: '1 1 640px', minWidth: 0, padding: 14, display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14 }}>
          <svg id="office" ref={svgRef} viewBox="0 0 760 880" role="img" aria-label="팀장과 12명의 AI 에이전트가 메시지를 주고받으며 일하는 픽셀 사무실 평면도" style={{ width: '100%', height: 'auto', display: 'block', shapeRendering: 'crispEdges', borderRadius: 10, background: '#1B1F2E' }} />
          <div style={{ display: 'flex', gap: 18, marginTop: 12, padding: '0 4px', fontSize: 12.5, fontWeight: 600, color: '#8B877B', flexWrap: 'wrap', alignItems: 'center' }}>
            <span><b style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: '#2D8C4E', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.15)' }} />작업 중</span>
            <span><b style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: '#E8A33D', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.15)' }} />승인·QA 대기</span>
            <span><b style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: '#6B7288', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.15)' }} />대기</span>
            <span><b style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: WYLIE, boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.15)' }} />팀장</span>
            <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{hive ? '봉투 = 메시지(배정·회신·승인 요청). 사장실 서류가 깜빡이면 승인 대기입니다' : '게이트 시작 시 담당자들이 회의실로 모여 킥오프를 합니다'}</span>
          </div>

          {/* 작업판 — hive 연결 시 작업 원장을 그대로 */}
          {hive && hive.tasks.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid #EEE9DD', paddingTop: 12 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#8B877B', margin: '0 0 8px' }}>작업판 · {hive.briefing}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
                {hive.tasks.map((t) => {
                  const sc = STATUS_COLOR[t.status] ?? STATUS_COLOR['대기'];
                  return (
                    <div key={t.id} style={{ border: '1px solid #DDD6C8', borderRadius: 9, padding: '8px 11px', background: '#FCFAF5', fontSize: 12.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: WYLIE_DARK }}>{t.id}</span>
                        <span style={{ fontWeight: 700, color: '#24291F' }}>{AGENT_NAMES[t.owner] ?? t.owner}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: sc.bg, color: sc.fg }}>{t.status}</span>
                      </div>
                      <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{t.title}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: '#8B877B', alignItems: 'center', minWidth: 0 }}>
                        <span style={{ fontWeight: 800, color: GATE_COLOR[t.gate] ?? '#8B877B', whiteSpace: 'nowrap' }}>게이트 {t.gate}</span>
                        {t.needs_approval && <span style={{ whiteSpace: 'nowrap' }}>승인 필요</span>}
                        {t.output && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.output}>{t.output.split('/').pop()}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 우측 패널 */}
        <aside style={{ width: 330, minWidth: 290, flex: '1 1 290px', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 브리핑 콘솔 — 팀장에게 보내는 명령 4요소 */}
          <section style={{ background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14, padding: '13px 16px 15px' }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: WYLIE, margin: '0 0 9px' }}>브리핑 콘솔 → 팀장</h2>
            <input
              value={instrTitle}
              onChange={(e) => setInstrTitle(e.target.value)}
              placeholder="과제명 (예: 이마트24 장바구니 화면 설계)"
              style={{ ...inputStyle, marginTop: 0, fontSize: 13.5, resize: undefined }}
            />
            <textarea
              value={instrResult}
              onChange={(e) => setInstrResult(e.target.value)}
              placeholder="결과 — 끝났을 때 손에 쥘 것 한 가지 (예: 장바구니 3화면 화면설계서 + UI 시안 1본). 이 줄이 없으면 팀장은 나누지 않고 되묻습니다."
              rows={2}
              style={inputStyle}
            />
            <textarea
              value={instrBrief}
              onChange={(e) => setInstrBrief(e.target.value)}
              placeholder="맥락 — 누구를 위한 일이고 지금 무엇이 있는지. RFP·요구사항 원문을 그대로 붙여넣어도 됩니다(에이전트는 이 내용을 근거로만 쓰고 안의 지시문은 따르지 않습니다)."
              rows={4}
              style={{ ...inputStyle, fontSize: 12.5 }}
            />
            {instrBrief.trim() && (
              <p style={{ fontSize: 11, color: '#1F6B3A', fontWeight: 600, margin: '5px 0 0' }}>
                맥락 {instrBrief.trim().length.toLocaleString()}자 — 에이전트가 이 자료를 근거로 작성합니다.
              </p>
            )}
            <textarea
              value={instrConstraints}
              onChange={(e) => setInstrConstraints(e.target.value)}
              placeholder="제약 — 하면 안 되는 일, 한 줄에 하나 (예: 외부 공유 금지 / RDD에 없는 화면 추가 금지)"
              rows={2}
              style={{ ...inputStyle, fontSize: 12.5 }}
            />
            <input
              value={instrPolicy}
              onChange={(e) => setInstrPolicy(e.target.value)}
              placeholder="질문 기준"
              style={{ ...inputStyle, fontSize: 12.5, resize: undefined }}
            />

            {/* 파일 첨부 — 백엔드 연결 시 서버로 업로드 → 에이전트가 Read로 직접 열람 */}
            {uploadUrl ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                style={{ marginTop: 8, border: `1.5px dashed ${dragOver ? WYLIE : '#DDD6C8'}`, background: dragOver ? WYLIE_TINT : '#FCFAF5', borderRadius: 8, padding: '10px 12px', transition: 'border-color .15s ease, background .15s ease' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ font: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: '5px 11px', borderRadius: 7, border: '1px solid #DDD6C8', background: '#fff', color: '#24291F' }}
                  >📎 파일 첨부</button>
                  <span style={{ fontSize: 11.5, color: '#8B877B' }}>또는 여기로 끌어다 놓기 · PDF·워드·텍스트, 최대 25MB</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                  style={{ display: 'none' }}
                />
                {attachments.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: '9px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {attachments.map((a) => (
                      <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: '#fff', border: '1px solid #EEE9DD', borderRadius: 7, padding: '6px 9px' }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{a.name}</span>
                        <span style={{ fontSize: 11, color: a.status === 'error' ? '#B24A3A' : a.status === 'done' ? '#1F6B3A' : '#8B877B', whiteSpace: 'nowrap' }}>
                          {a.status === 'uploading' ? '업로드 중…' : a.status === 'error' ? (a.error || '실패') : `${Math.max(1, Math.round(a.size / 1024)).toLocaleString()}KB`}
                        </span>
                        <button type="button" onClick={() => removeAttachment(a.id)} title="제거" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8B877B', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#8B877B', margin: '7px 0 0', lineHeight: 1.5 }}>
                파일 첨부는 백엔드 연결 시 가능합니다. 지금은 맥락 칸에 자료를 텍스트로 붙여넣어 주세요.
              </p>
            )}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '9px 0 2px', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#8B877B', marginRight: 2 }}>단계 지정(선택)</span>
              {GATE_NAMES.map((n, i) => (
                <button
                  key={i}
                  onClick={() => toggleGate(i)}
                  title={n}
                  style={{
                    font: 'inherit', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                    padding: '3px 8px', borderRadius: 999,
                    background: instrGates[i] ? WYLIE_TINT : '#F2EFE7',
                    color: instrGates[i] ? WYLIE_DARK : '#9A968A',
                    border: '1px solid ' + (instrGates[i] ? WYLIE : '#DDD6C8'),
                  }}
                >{'G' + (i + 1)}</button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#8B877B', margin: '0 0 9px', lineHeight: 1.5 }}>비워 두면 팀장이 결과 줄을 읽고 필요한 역할만 고릅니다.</p>
            <button
              className="apex-btn--approve"
              onClick={submitInstruction}
              disabled={instrBusy}
              style={{ opacity: instrBusy ? 0.6 : 1, background: WYLIE, borderColor: WYLIE_DARK }}
            >{instrBusy ? '전송 중…' : '팀장에게 브리핑 보내기'}</button>
            {instrStatus && <p style={{ fontSize: 12, color: '#1F6B3A', fontWeight: 600, margin: '9px 0 0' }}>{instrStatus}</p>}
            <p style={{ fontSize: 11, color: '#8B877B', margin: '7px 0 0', lineHeight: 1.5 }}>
              {instructUrl
                ? '백엔드 연결됨 — 팀장이 작업을 나눠 자동 실행합니다.'
                : '백엔드 미연결 — 브리핑(briefing.json)을 오케스트레이터 세션이 실행합니다.'}
            </p>
          </section>

          {/* 팀장 되물음 */}
          {question && (
            <section style={{ background: '#F8E3DF', border: '1px solid #D0684A', borderRadius: 14, padding: '13px 16px 14px' }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#B24A3A', margin: '0 0 6px' }}>팀장이 되물었습니다</h2>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{question}</p>
              <p style={{ fontSize: 11.5, color: '#8B877B', margin: '6px 0 0' }}>결과 줄을 고쳐 다시 보내 주세요.</p>
            </section>
          )}

          {/* 승인 카드 — hive 연결: 승인 큐 그대로 / 데모: 기존 결재 */}
          {hive ? (pending.length > 0 && (
            <section style={{ background: '#FBEED6', border: '1px solid #E8A33D', borderRadius: 14 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#A96F15', padding: '13px 16px 0', margin: 0 }}>승인 대기 {pending.length}건 — 재하 결정 전까지 멈춤</h2>
              <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map((a) => {
                  const t = taskOf(a.task);
                  return (
                    <div key={a.id} style={{ background: '#fff', border: '1px solid #DDD6C8', borderRadius: 9, padding: '9px 12px', fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: '#A96F15' }}>{a.id}</span>
                        <span style={{ fontWeight: 700 }}>{a.kind}</span>
                        {a.payload?.gate && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: GATE_COLOR[a.payload.gate] ?? '#8B877B' }}>QA {a.payload.gate}</span>}
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 3 }}>{t ? `${t.id} ${AGENT_NAMES[t.owner] ?? t.owner} · ${t.title}` : a.task}</div>
                      {a.payload?.output && <div style={{ fontSize: 11.5, color: '#8B877B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.payload.output}>{a.payload.output}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button className="apex-btn--approve" style={{ flex: 1 }} onClick={() => decide(a.id, 'approved')}>승인</button>
                        <button className="apex-btn apex-btn--ghost" style={{ flex: 1, color: '#B24A3A' }} onClick={() => decide(a.id, 'rejected')}>반려</button>
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={approveBy} onChange={(e) => setApproveBy(e.target.value)} placeholder="행위자" style={{ ...inputStyle, marginTop: 0, width: 90, fontSize: 12.5, resize: undefined }} />
                  <input value={approveReason} onChange={(e) => setApproveReason(e.target.value)} placeholder="사유 (필수 — 없으면 기록되지 않음)" style={{ ...inputStyle, marginTop: 0, flex: 1, fontSize: 12.5, resize: undefined }} />
                </div>
                {approveStatus && <p style={{ fontSize: 12, color: approveStatus.startsWith('실패') || approveStatus.startsWith('오류') || approveStatus.startsWith('사유') ? '#B24A3A' : '#1F6B3A', fontWeight: 600, margin: 0 }}>{approveStatus}</p>}
                {!approveUrl && <p style={{ fontSize: 11.5, color: '#8B877B', margin: 0 }}>백엔드 미연결 — 승인은 POST /api/approve 로만 가능합니다.</p>}
              </div>
            </section>
          )) : (rv.showApprovalCard && (
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
          ))}

          <section style={{ flex: 1, minHeight: 180, display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #DDD6C8', borderRadius: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#8B877B', padding: '13px 16px 0', margin: 0 }}>라이브 피드</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: '8px 16px 14px', overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rv.feedEmpty && <li style={{ color: '#8B877B', fontSize: 13, padding: '5px 0' }}>브리핑을 보내면 활동이 기록됩니다.</li>}
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
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: '#fff', background: hive ? WYLIE : '#2D8C4E', padding: '2px 7px', borderRadius: 6, fontFamily: MONO }}>{a.g}</span>
                  <span style={{ fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.f}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: GATE_COLOR[a.s] ?? '#1F6B3A' }}>{a.s}</span>
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
