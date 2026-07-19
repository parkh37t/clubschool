# 규칙: 프론트엔드 (React / TypeScript)

## 컴포넌트
- 함수형 컴포넌트 + 훅만 사용합니다. 클래스 컴포넌트 금지.
- `export function ComponentName(props: Props)` 형태의 **named export**를 사용합니다.
  (`App.tsx`만 default export — 기존 컨벤션 유지)
- props는 컴포넌트 위에 `interface XxxProps`로 명시적으로 선언합니다.
- 파일 1개 = 컴포넌트 1개. 보조 컴포넌트/헬퍼는 별도 파일로 분리합니다.
- 파일명은 컴포넌트는 `PascalCase.tsx`, 훅은 `useXxx.ts`, 상수/유틸은 `camelCase.ts`.

## 상태와 데이터
- 전역 도메인 데이터는 **반드시 `useDataStore`를 통해서만** 읽고 씁니다.
  컴포넌트에서 `localStorage`를 직접 호출하지 않습니다.
- 데이터 변경은 `dataStore`의 CRUD 함수(`addProject`, `updateAllocation` 등)를 사용합니다.
- 파생/계산 값은 `useDataStore` 또는 `data/mockData.ts`의 계산 함수에 둡니다.
  컴포넌트 안에서 중복 계산하지 않습니다.
- 로컬 UI 상태(열림/닫힘, 입력값 등)만 컴포넌트 `useState`로 둡니다.

## 새 화면 추가 절차
1. `constants/views.ts`의 `VIEW_NAMES`에 상수를 추가합니다.
2. `components/`에 화면 컴포넌트를 만들고 `dataStore` prop을 받습니다.
3. `components/ViewRenderer.tsx`의 분기에 추가합니다.
4. 네비게이션 진입점(`Navigation`, `Dashboard` 등)을 연결합니다.

## 타입
- 새 도메인 필드/구조는 먼저 `types/index.ts`에 정의합니다.
- `any` 금지(ESLint 경고 → 빌드 실패). 불가피하면 사유 주석을 남깁니다.
- 미사용 변수는 `_` 접두사로만 허용됩니다.

## 훅
- `react-hooks` 규칙을 준수합니다. 의존성 배열을 정확히 채웁니다.
- 콜백은 안정성이 필요하면 `useCallback`, 비용 큰 계산은 `useMemo`.

## 반응형
- 모바일/데스크톱 분기는 `useIsMobile`(`components/ui/use-mobile`)을 사용합니다.
- 절대 위치는 꼭 필요할 때만. 기본은 flex/grid 레이아웃.

## 품질
- 변경 후 `npm run type-check` 와 `npm run lint`를 통과시킵니다.
