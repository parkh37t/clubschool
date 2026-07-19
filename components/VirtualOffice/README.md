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

> 클래스 컴포넌트 금지(`frontend.md`) 준수를 위해 명령형 로직을 순수 TS 클래스로 분리하고
> React는 함수형 래퍼로 감쌌다. 좌표·색상은 디자인 소스 그대로 보존(hi-fi).

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
