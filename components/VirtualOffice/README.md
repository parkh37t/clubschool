# VirtualOffice — APEX 가상 사무실 대시보드

12 AI 에이전트가 **G1~G6 게이트 파이프라인**(영업/평가→기획→디자인→구현→검증/배포→그로스)을
진행하는 실시간 픽셀 오피스. 디자인 핸드오프(`design_handoff_apex_virtual_office`)를
우리 코드베이스(React18+TS+Vite)로 hi-fi 재구현한 결과.

## 파일
| 파일 | 역할 |
| --- | --- |
| `VirtualOfficeView.tsx` | React 함수형 래퍼(뷰). JSX 크롬 + 시뮬레이터 수명주기 관리 |
| `officeSimulator.ts` | 순수 TS 클래스 — 명령형 SVG 씬 빌더·이동 엔진·게이트 시뮬레이터. 프레임워크 비의존 |
| `virtualOffice.css` | 전역 애니메이션/스프라이트 클래스(`apex-` 접두 키프레임). 엔진이 classList로 토글 |
| `CommandCenter.tsx` | 오른쪽 커맨드 센터 — 머리·탭 격자·상태 줄·탭 내용·대기열·입력창 |
| `TasksTab` · `ApprovalsTab` · `QuestionsTab` · `MemoryTab` · `ActivityTab` · `SkillsTab` · `TerminalTab` · `MonitorTab` | 탭 내용(파일 1개 = 탭 1개) |
| `QueueStrip.tsx` | 팀장 대기열(대기·처리 중, 대기 항목 취소) |
| `BriefingConsole.tsx` | 입력창 — 메시지(대기열 → 팀장 상주 세션) / 브리핑 양식(4요소 + 첨부) |
| `AgentCards.tsx` | 하단 에이전트 바(팀장 + 12인 + 추가 인원, 서킷 브레이커 표시). 누르면 책상 강조 + 탭 필터 |
| `AddAgentDialog.tsx` | 역할 템플릿으로 인원 추가·빼기 |
| `i18n.ts` · `simText.ts` | 한·영 사전(화면 문구 / 사무실 그림 속 이름표·피드), `useOfficeLang()` |
| `officeApi.ts` | 서버 API 타입·폴링 훅(명단·이벤트·로그인·기억·대기열·질문·설정·사용량·실시간 기록 등) |
| `officeTheme.ts` | 색·글꼴·이름표·아바타 외형 공통 상수 |
| `PixelAvatar.tsx` | 12×12 픽셀 초상(사무실 캐릭터와 같은 머리·피부·부서색) |
| `officeBackend.ts` | 백엔드 주소 결정(?api → localhost 상대경로 → 저장값 → 미연결) |

## 화면 구성 (Wylie AX Office 3단계 1·2차 — Munder Difflin 구조)
창 전체를 고정 배치로 쓴다(페이지 스크롤 없음, 좁은 창에서는 세로로 쌓임 — `virtualOffice.css` 의 `axo-*`).
- 상단 바: 앱 이름 · hive 연결/모드/동시 작업 수 · 시계 · 애니메이션 일시정지·속도 · 언어(한국어/EN). 그 아래 필요할 때만 Claude 로그인 배너([로그인] → 새 PowerShell 창)·팀장 되물음
- 왼쪽: 게이트 현황(단계별 작업 집계) + 픽셀 사무실. 책상을 누르면 그 에이전트 선택(점선 테두리 강조)
- 오른쪽 커맨드 센터: 머리(팀장 아바타·상태·자동 진행) → 탭 격자(작업·승인·질문·기억·활동·스킬·터미널·모니터, 예약·관계도는 3차라 비활성) → 상태 줄 → 탭 내용 → 대기열 → 입력창(메시지 / 브리핑 양식, 파일·폴더(3차)·보내기)
- 하단 에이전트 바: 팀장 + 12인 + 추가 인원 아바타 카드 가로 한 줄 — 상태·지금 작업·사용량·서킷 브레이커 단계, 끝에 '인원 추가'
- 추가 인원이 있으면 사무실 아래에 확장 구역(최대 6석)이 생기고 viewBox 높이가 880 → 1080 으로 늘어난다(`officeSimulator.syncCustomAgents`)
- 언어는 서버 설정(`/api/settings` 의 `lang`)을 따르고, 서버가 없으면 이 화면 안에서만 바뀐다. 새 문구는 `i18n.ts` 의 ko·en 사전에 함께 넣는다
- `?shell=app` 이면 대시보드 사이드바 없이 이 화면만 띄운다(설치형 앱, `desktop/main.cjs`)
- 색은 와일리 보라(#6A4C9C·#43306B·#EFEAF7)를 유지한다. 사무실 그림은 기존 엔진 그대로이며 Munder Difflin 의 그림·코드는 쓰지 않았다

## 두 가지 동작 모드

### 1. 자체 시뮬레이션 (기본)
prop 없이 `<VirtualOfficeView />` → 내장 시나리오가 킥오프 회의→작업→결재를 자동 반복.
현재 `ViewRenderer`의 `가상 사무실` 뷰가 이 모드다.

### 2. 실전 연동 (오케스트레이터 상태 주입)
오케스트레이터가 쓰는 상태 JSON을 폴링해 실제 에이전트 상태를 반영한다.
```tsx
<VirtualOfficeView stateUrl="/_state/office-state.json" pollMs={2000} />
```
- `stateUrl` 지정 시 해당 URL을 `pollMs`(기본 2000ms)마다 폴링 → `applyOfficeState(state)` 주입.
- 첫 주입 순간 **내부 자동 시나리오는 정지**하고 외부 상태가 화면의 단일 진실이 된다.
- 폴링 실패(네트워크/404)는 무시하고 다음 주기 재시도 → 자체 데모로 자연 폴백.

#### 상태 스키마 (`OfficeState`)
```ts
{
  stage: number,            // 0~5 (G1~G6)
  phase: 'meeting' | 'returning' | 'working' | 'awaiting' | 'done-all',
  progress?: number,        // 0~1 (현재 게이트 진행률)
  agents?: {                // 자리 상태 덮어쓰기
    [id: string]: { state: 'idle' | 'working' | 'waiting', task?: string }
  },
  artifact?: { file: string, score: number }   // 단계 상승 시 산출물로 적재
}
```
에이전트 id: `han kim jeong na cha oh pyo lee baek gu go hong`.

- 단계/페이즈 전이 시에만 이동 안무(회의실 이동·자리 복귀·브리핑 총회)를 구동한다.
- `stage`가 이전보다 커지면(=이전 게이트 결재 완료) `artifact`를 산출물 목록에 적재한다.

## 3. 지시 콘솔 (웹에서 직접 지시)
우측 패널의 **지시 콘솔**에서 과제명·목표·게이트(G1~G6)를 입력하고 "지시 보내기"를 누르면:
- `instructUrl` prop이 있으면 → 해당 백엔드로 **POST**(경로 B, 자동 실행).
- 없으면 → 지시(`instruction.json`)를 **클립보드 복사 + 다운로드**(경로 A) → 오케스트레이터 세션이 실행.
- 어느 경우든 라이브 피드에 "접수" 기록(`noteInstruction`).

```tsx
// 백엔드(경로 B) 연결 시 — 현재 ViewRenderer가 이 형태로 렌더한다.
<VirtualOfficeView stateUrl="/office-state.json" instructUrl="/api/instruct" />
```
> 백엔드 뼈대는 `server/` 에 구현돼 있다(의존성 0의 mock 모드로 키 없이 즉시 검증 → `OFFICE_MODE=live`로 실제 산출물).
> 실행법은 `server/README.md`, 설계는 `PROJECT/_team/오케스트레이터-연동-설계.md` 참조.
> 브라우저는 에이전트를 직접 실행할 수 없다(정직성). 콘솔은 지시를 **생성·전달**하고, 실제 실행/산출물은
> 오케스트레이터(세션 또는 백엔드)가 담당한다. 진행 상태는 `stateUrl` 폴링으로 오피스에 반영된다.

## 검증
빌드 통과, 신규 파일 lint 0, 헤드리스 렌더 확인(책상 12·자동문 11·게이트 6·에이전트 12·콘솔 에러 0).
실전 연동 경로(상태 JSON 폴링→게이트/자리/피드 반영)와 지시 콘솔(입력→instruction.json 생성·피드 접수)을 실측 검증.
