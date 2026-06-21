# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(및 서브에이전트)를 위한 운영 가이드입니다.

## 1. 프로젝트 개요

**프로젝트 수행본부 대시보드** — 56명 규모 조직의 프로젝트별 구성원 투입(allocation)·
가동률(utilization)·맨먼스(manmonth)·비용을 관리하는 웹 대시보드 애플리케이션입니다.

- 도메인 언어: **한국어** (UI 텍스트, 주석, 커밋 메시지 모두 한국어 우선)
- 사용자: 본부장/사업관리팀이 인력 운영을 모니터링하고 프로젝트를 생성·검토·승인
- 데이터 저장: 현재는 백엔드 없이 **localStorage** 기반 (`useDataStore`)

## 2. 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | React 18 (`react`, `react-dom`) + TypeScript ~5.6 |
| 빌드 | Vite 6 (`type: module`) |
| 스타일 | Tailwind CSS v4(beta), CSS 변수 기반 토큰 (`styles/globals.css`, `styles.css`) |
| UI 컴포넌트 | shadcn/ui (Radix UI 래퍼, `components/ui/`) |
| 차트 | Recharts |
| 애니메이션 | framer-motion |
| 폼 | react-hook-form |
| 아이콘 | lucide-react |
| 토스트 | sonner |
| 배포 | GitHub Pages(`docs/`), Vercel, Netlify 설정 존재 |

## 3. 아키텍처

```
main.tsx → App.tsx → AppLayout → ViewRenderer → 각 View 컴포넌트
```

- **상태/데이터**: `hooks/useDataStore.ts` 가 단일 데이터 저장소. members/projects/
  allocations/memberManmonths 상태를 보유하고 localStorage에 동기화하며, 파생 데이터
  (`dashboardStats`, `utilizationData`, `groupUtilization`, `groupSummary`)와 CRUD 함수를
  반환합니다. 모든 View는 `dataStore` prop으로 이 객체를 전달받습니다.
- **이벤트 핸들러**: `hooks/useAppHandlers.ts` (뷰 전환, 선택 상태 관리)
- **라우팅**: 실제 라우터 없이 `currentView` 문자열 스위치(`components/ViewRenderer.tsx`).
  뷰 이름 상수는 `constants/views.ts` 의 `VIEW_NAMES`.
- **타입**: 모든 도메인 타입은 `types/index.ts` 에 정의 (`Member`, `Project`,
  `ProjectAllocation`, `MemberManmonth`, `UtilizationData` 등)
- **목 데이터**: `data/mockData.ts` (56명 구성원, 그룹별 집계 계산 함수 포함)

### 핵심 도메인 개념
- **그룹(group)**: `planning | design | publishing | management | executive`
- **맨먼스(manmonth)**: 1.0 = 한 명의 한 달 풀가동. allocation의 `utilizationRate`(0~100)로 환산
- **가동률(utilizationRate)**: 구성원/그룹/조직 단위로 집계
- **프로젝트 상태**: `draft → review → approved → planning → in-progress → completed`(또는 `on-hold`)
- **투입 상태(allocation.status)**: `active | completed | withdrawn`

## 4. 명령어

```bash
npm run dev          # 개발 서버 (Vite)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run lint         # ESLint (--max-warnings 0, 경고도 실패 처리)
npm run lint:fix     # ESLint 자동 수정
npm run type-check   # tsc --noEmit (타입 검사만)
npm run deploy-check # 배포 전 점검 스크립트
```

> 코드 변경 후에는 반드시 `npm run type-check` 와 `npm run lint` 를 통과시켜야 합니다.
> lint는 `--max-warnings 0` 이므로 **경고도 곧 실패**입니다.

## 5. 작업 규칙 (.claude/rules)

세부 규칙은 `.claude/rules/` 에 있으며 작업 성격에 맞는 규칙을 먼저 읽으세요.

- `frontend.md` — React/TypeScript/컴포넌트 작성 규칙
- `backend.md` — 데이터 계층/API 설계 규칙(향후 백엔드 도입 대비)
- `design-system.md` — Tailwind 토큰 · shadcn/ui 사용 규칙
- `documentation.md` — 문서/주석/커밋 작성 규칙
- `quality-check.md` — 머지 전 품질 게이트
- `handoff.md` — 에이전트 간 인수인계 규칙

## 6. 팀 구성 (.claude/agents)

이 프로젝트는 **가상 디지털 에이전시 팀**을 서브에이전트로 모델링합니다. 작업 단계에 맞는
에이전트를 호출하세요. 전체 워크플로우는 `RFP → 제안 → 전략 → 기획 → 디자인 → 퍼블리싱 →
개발 → 분석/마케팅` 순서이며, 단계 전환 시 `handoff.md` 규칙을 따릅니다.

| 단계 | 에이전트 | 역할 |
| --- | --- | --- |
| 영업 | `handojeon-sales-lead` | 영업 총괄, RFP 수주 판단, 제안 전략 |
| 영업 | `kim-sales-support` | 영업 지원, 견적·일정·자료 정리 |
| 기획 | `jung-wooseon-po` | 제품 책임자(PO), 백로그·우선순위 |
| 기획 | `na-planner` | 서비스 기획, IA·플로우·화면 정의 |
| 디자인 | `cha-ui-designer` | UI/UX 디자인, 디자인 시스템 |
| 디자인 | `oh-brand-designer` | 브랜드·비주얼·그래픽 |
| 퍼블리싱 | `pyo-publisher` | 마크업/스타일 퍼블리싱 |
| 퍼블리싱 | `lee-interaction-publisher` | 인터랙션/애니메이션 퍼블리싱 |
| 개발 | `baek-backend` | 데이터 계층·API·상태관리 |
| 개발 | `gu-frontend` | 프론트엔드 구현(React) |
| 분석 | `go-data-analyst` | 데이터 분석·지표 정의 |
| 마케팅 | `hong-marketer` | 마케팅·릴리즈 커뮤니케이션 |

## 7. 핵심 컨벤션 요약

- 새 화면을 추가할 때: `VIEW_NAMES`에 상수 추가 → `ViewRenderer`에 분기 추가 →
  `components/`에 컴포넌트 생성 → 필요한 데이터는 `dataStore`에서 가져옴.
- 데이터 변경은 반드시 `useDataStore`의 CRUD 함수를 통해서만. 컴포넌트에서 localStorage를
  직접 만지지 않습니다.
- 새 도메인 필드는 먼저 `types/index.ts`에 추가합니다.
- 색상/간격/폰트는 하드코딩하지 말고 Tailwind 토큰(CSS 변수)을 사용합니다.
- `any` 사용 자제(ESLint 경고). 부득이하면 사유를 주석으로 남깁니다.
