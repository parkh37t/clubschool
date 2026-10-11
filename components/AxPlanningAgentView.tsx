import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, PanelLeft } from 'lucide-react';
import { Button } from './ui/button';
import { AX_AGENT_MENU, CON_AI_URL } from '../constants/axAgentMenu';
import { useAxAgentPage } from '../hooks/useAxAgentPage';

// AX 기획 에이전트(con-ai) — 요구사항→화면설계서 HTML을 만드는 공개 데모(parkh37t.github.io/con-ai)를
// 이 대시보드 안에 그대로 띄운다. 별도 저장소라서 코드를 가져오지 않고 iframe 으로 링크만 건다.
// 사이드바 서브 메뉴가 고른 해시 라우트(useAxAgentPage)로 iframe 을 이동시키고, 새 창으로도 열 수 있다.
//
// con-ai 는 자기 왼쪽 메뉴(aside.rail, 폭 228px)를 갖고 있어 우리 사이드바 서브 메뉴와 겹친다.
// 다른 오리진이라 안쪽 CSS 를 바꿀 수 없으므로, iframe 을 228px 넓게 그리고 왼쪽으로 밀어 그 메뉴를 잘라 낸다.
// con-ai 는 폭 940px 미만에서 메뉴를 상단 바로 바꾸므로, 그때는 자르지 않는다.
const CON_AI_RAIL_PX = 228;
const CON_AI_RAIL_MIN_VIEWPORT = 940;

export function AxPlanningAgentView() {
  const [reloadKey, setReloadKey] = useState(0);
  const [showRail, setShowRail] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const page = useAxAgentPage();
  const pageUrl = CON_AI_URL + page;
  const pageLabel = AX_AGENT_MENU.flatMap((g) => g.items).find((i) => i.route === page)?.label ?? '';

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const crop = !showRail && boxWidth + CON_AI_RAIL_PX >= CON_AI_RAIL_MIN_VIEWPORT;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="font-semibold leading-tight">
            AX 기획 에이전트{pageLabel ? <span className="text-muted-foreground font-normal"> · {pageLabel}</span> : null}
          </div>
          <div className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
            요구사항 → 화면설계서 HTML 자동 생성 (con-ai) · {pageUrl}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowRail((v) => !v)} title="con-ai 자체 메뉴 보기/숨기기">
          <PanelLeft className="h-4 w-4 mr-1.5" />
          {showRail ? 'con-ai 메뉴 숨기기' : 'con-ai 메뉴 보기'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setReloadKey((k) => k + 1)} title="다시 불러오기">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          새로고침
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={pageUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" />
            새 창에서 열기
          </a>
        </Button>
      </div>
      <div ref={boxRef} className="relative flex-1 min-h-0 overflow-hidden bg-white">
        <iframe
          key={`${page}:${reloadKey}`}
          src={pageUrl}
          title="AX 기획 에이전트 (con-ai)"
          className="absolute top-0 h-full border-0 bg-white"
          style={crop
            ? { left: -CON_AI_RAIL_PX, width: `calc(100% + ${CON_AI_RAIL_PX}px)` }
            : { left: 0, width: '100%' }}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
        />
      </div>
    </div>
  );
}
