import { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

// AX 기획 에이전트(con-ai) — 요구사항→화면설계서 HTML을 만드는 공개 데모(parkh37t.github.io/con-ai)를
// 이 대시보드 안에 그대로 띄운다. 별도 저장소라서 코드를 가져오지 않고 iframe 으로 링크만 건다.
// 상단 바에서 새 창으로 열 수 있다(iframe 이 막히는 환경 대비).
const CON_AI_URL = 'https://parkh37t.github.io/con-ai/';

export function AxPlanningAgentView() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card rounded-t-xl">
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight">AX 기획 에이전트</div>
          <div className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
            요구사항 → 화면설계서 HTML 자동 생성 (con-ai) · {CON_AI_URL}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setReloadKey((k) => k + 1)} title="다시 불러오기">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          새로고침
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={CON_AI_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" />
            새 창에서 열기
          </a>
        </Button>
      </div>
      <iframe
        key={reloadKey}
        src={CON_AI_URL}
        title="AX 기획 에이전트 (con-ai)"
        className="flex-1 w-full border-0 rounded-b-xl bg-white"
        style={{ minHeight: 720 }}
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
      />
    </div>
  );
}
