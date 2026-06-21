# 규칙: 백엔드 / 데이터 계층

> 현재 이 프로젝트는 별도 백엔드 없이 `useDataStore` + localStorage로 동작합니다.
> 이 규칙은 (1) 현재 데이터 계층 작업과 (2) 향후 실제 API 도입 시 모두 적용됩니다.

## 현재 데이터 계층 (`hooks/useDataStore.ts`)
- 데이터의 단일 진입점입니다. 새 엔티티/CRUD는 여기에 추가합니다.
- 저장 키는 `STORAGE_KEYS` 상수로 관리합니다. 문자열 키를 산재시키지 않습니다.
- ID 생성은 `generateId(prefix)` 헬퍼를 사용합니다. 직접 `Math.random` 호출 금지.
- 상태 변경은 항상 불변 업데이트(`prev => ...`)로 합니다.
- 연관 데이터 정합성을 유지합니다. 예: 멤버 삭제 시 해당 allocation·manmonth도 제거,
  allocation 변경 시 `updateMemberManmonthsForAllocations`로 맨먼스를 재계산.
- localStorage 입출력은 `try/catch`로 감싸고 실패해도 앱이 죽지 않게 합니다.

## 계산 로직
- 집계/파생 계산(`calculateUtilizationData`, `getGroupSummary` 등)은 `data/mockData.ts`
  또는 별도 유틸로 분리하고, `useDataStore`에서 감싸 노출합니다.
- 맨먼스는 0~1, 가동률은 0~100 범위를 벗어나지 않도록 clamp 합니다(기존 패턴 준수).

## 향후 API 도입 시
- 도메인 타입(`types/index.ts`)을 API 계약의 단일 원천으로 삼습니다.
- 데이터 접근은 `useDataStore`의 인터페이스(시그니처)를 유지한 채 내부 구현만 교체합니다.
  컴포넌트가 데이터 출처(localStorage/API)를 알 필요가 없게 합니다.
- 비동기 전환 시 로딩/에러 상태를 표준화하고, 낙관적 업데이트는 롤백 경로를 둡니다.
- 입력값은 신뢰하지 않습니다. 서버 응답도 런타임에서 형태를 검증합니다.

## 보안/안정성
- 비밀키·토큰을 클라이언트 코드/저장소에 두지 않습니다.
- 파괴적 작업(전체 초기화 `resetToDefaultData` 등)은 사용자 확인을 거칩니다.
