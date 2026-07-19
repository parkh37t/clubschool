---
name: frontend-implementation
description: React 컴포넌트/화면을 실제로 구현하거나 수정할 때 사용합니다. 뷰 추가·데이터 연결·폼·차트 연동 등 프론트엔드 구현 작업의 표준 절차입니다.
---

# 프론트엔드 구현

이 프로젝트(React 18 + TS + Vite + Tailwind v4 + shadcn/ui)에서 화면을 구현합니다.

## 새 화면 추가 절차
1. `constants/views.ts`의 `VIEW_NAMES`에 뷰 키 상수 추가.
2. `components/`에 컴포넌트 작성 — `export function Xxx(props)`, `dataStore` prop 수신.
3. `components/ViewRenderer.tsx`의 스위치/분기에 추가.
   - 선택 상태가 필요한 화면(상세/프로필 등)은 특수 분기 패턴 참고.
4. 진입점(`Navigation`, `Dashboard` 등)에서 `onViewChange(VIEW_NAMES.XXX)` 연결.

## 데이터 연결
- 도메인 데이터는 **`useDataStore`를 통해서만** 읽고 씁니다(localStorage 직접 접근 금지).
- 표시: `dataStore.members`, `dataStore.projects`, `dataStore.dashboardStats`,
  `dataStore.utilizationData`, `dataStore.groupSummary` 등.
- 변경: `dataStore.addProject`, `updateAllocation`, `removeAllocation` 등 CRUD 함수.
- 파생 계산은 store/유틸에 위임하고 컴포넌트에서 중복 계산하지 않습니다.

## 컴포넌트 규칙 (`.claude/rules/frontend.md`)
- 함수형 + 훅, named export, props 인터페이스 명시, `any` 금지.
- 토큰 클래스 + `cn()` 사용, `components/ui/` 우선 재사용.
- 훅 의존성 배열 정확히, `useCallback`/`useMemo` 적절히.
- 반응형은 `useIsMobile`, 폼은 react-hook-form, 차트는 Recharts(`chart-1~5` 토큰).

## 마무리 (필수)
```bash
npm run type-check
npm run lint        # --max-warnings 0
npm run build       # 큰 변경 시
```
- 모두 통과해야 완료입니다. 실패 시 출력을 그대로 보고합니다.
- 주석/커밋은 한국어로 작성합니다.
