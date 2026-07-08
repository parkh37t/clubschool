# Phase 2 — 온보딩 마법사 화면설계서 (service-planning)

> 대상: 디자인(차도안)·프론트 구현팀. 근거: `01-architecture/Phase1-멀티테넌트-코어-설계.md`(settings 계약·API), `00-strategy/01_패키징-방안.md` §5(최소 5종), `_source-package/05_SaaS_전환_설계.md` §6, `06_배포_운영_노하우.md` §5.5(검증된 결산 업로드 UX).
> 목표: **가입 직후 도움 없이 5종 데이터 입력 → 대시보드 도달(TTV 5분)**, 완주율 60% 게이트(가정 A2).

> ⚠ 아키텍처 주의: con-mgt는 **vanilla JS 단일 SPA(`public/index.html`)** — clubschool의 `VIEW_NAMES`/`ViewRenderer` 라우팅이 아니다. 아래 "화면키"는 SPA 내부 온보딩 네임스페이스(`onboarding.*`)이며, 데이터는 `dataStore`가 아니라 **`tenants.settings`(회사 고유값) + `state.payload`(업무 데이터)**에 매핑한다.

---

## 1. IA / 내비게이션

**온보딩 게이트:** 로그인 후 `settings._onboardingComplete !== true`이면 대시보드 대신 마법사로 진입.
```
[로그인] → settings._onboardingComplete?
   ├ true  → 대시보드(기존 SPA)
   └ false → onboarding.welcome (전체화면 스텝 플로우, 좌측 진행 스테퍼 0/5)
진입점: (a) 신규 테넌트 가입 직후  (b) 설정 > 온보딩 다시 실행(admin)
권한: 테넌트 admin(Owner)만. member는 승인제 초대로 이후 합류.
```

**화면 목록 (화면키)**
| 단계 | 화면키 | 이름 |
| --- | --- | --- |
| W0 | `onboarding.welcome` | 웰컴·시작 방식 선택 |
| W1 | `onboarding.company` | 회사·조직 |
| W2 | `onboarding.goals` | 목표(사업계획) |
| W3 | `onboarding.projects` | 프로젝트 올리기 |
| W4 | `onboarding.people` | 인력 올리기 |
| W5 | `onboarding.review` | 확인·시작 |
| — | `onboarding.done` | 완료 → 대시보드 |
| 보조 | `onboarding.uploadPreview` | 업로드 미리보기(공통 모달) |
| 보조 | `onboarding.demoConfirm` | 데모 데이터 주입 확인 |

---

## 2. 사용자 플로우 (분기·예외)

```
W0 웰컴
 ├ [샘플로 둘러보기] → demoConfirm → 데모 데이터 주입 → W5(확인) → 완료
 └ [직접 설정 시작] → W1 → W2 → W3 → W4 → W5 → [시작하기] → 완료 + 팀원 초대
공통 컨트롤: [이전] · [저장하고 나가기](진행 보존) · [건너뛰기](W3·W4만)
업로드 서브플로우(W3·W4): 파일선택 → 파싱(로딩) → 미리보기(인식 n건)
        → 인식 0건이면 [적용] 차단 → 유효행만/전체 적용 → 다음
```

---

## 3. 화면 정의서

### 화면: 웰컴 (onboarding.welcome / W0)
- **목적/진입:** 온보딩 안내·예상 소요(5분)·시작 방식(직접/데모) 선택. 로그인 게이트에서 진입.
- **표시 데이터:** `settings.branding`(없으면 기본 문구), 진행 상태 `settings._onboarding.progress`(이어서 하기).
- **액션:** [직접 설정]→W1 · [샘플로 둘러보기]→`demoConfirm` · [이어서 하기](진행 있으면)→저장 단계.
- **상태:** 로딩(테넌트 로드) / 빈(첫 진입=기본) / 오류(로드 실패→재시도) / 권한없음(member→"관리자에게 온보딩 요청").
- **예외·정책:** 일부 진행 이력 있으면 "이어서/처음부터" 분기. 이미 완주 테넌트면 대시보드로 리다이렉트.

### 화면: 회사·조직 (onboarding.company / W1) — 필수
- **목적/진입:** 회사 정보 + 조직단위(본부/팀) 정의. W0에서 진입.
- **표시→매핑:** 회사명·로고 → `settings.branding.{companyName,logo}` / 조직단위 리스트 → `settings.orgUnits[]{id,name,order}` / 회계연도 시작월(기본 1월) → `settings.accounting`.
- **액션:** `PUT /api/tenant/settings`(부분 병합) · 조직단위 추가/삭제/순서변경.
- **상태:** 로딩(저장중) / 빈(조직 0개 → 추가 유도, [다음] 비활성) / 오류(저장 실패 → 낙관적 롤백·재시도) / 권한없음.
- **예외·정책:** 회사명 1~50자, 조직단위 **최소 1개**·이름 1~30자·중복 불가, 로고 용량/포맷 제한. 조직 삭제 시 이후 참조 경고(온보딩 중엔 아직 참조 없음).
- **신규 필드:** `settings.orgUnits`, `settings.branding`(Phase 1 계약).

### 화면: 목표(사업계획) (onboarding.goals / W2) — 필수
- **목적/진입:** 연 매출·영업이익 목표 설정(대시보드 목표선·유휴비용 산정 근거).
- **표시→매핑:** 회계연도·연 매출목표·연 영업이익목표 → `settings.plan.targets[YYYY]` / 조직단위별 배분(선택) → `plan.baseline`(미입력 시 **월 균등 자동**) / 정직원 인건비 계획(선택) → `plan.laborByUnit`.
- **액션:** `PUT /api/tenant/settings`(plan).
- **상태:** 로딩 / 빈(목표 미입력 → [다음] 비활성) / 오류 / 권한없음.
- **예외·정책:** 금액 ≥0·콤마 허용, 영업이익 ≤ 매출. 조직별 배분 합 ≠ 총액이면 경고 + 자동보정 옵션. 월 분해는 균등 기본·이후 수정 가능.

### 화면: 프로젝트 올리기 (onboarding.projects / W3) — 건너뛰기 허용
- **목적/진입:** 프로젝트 마스터 초기 적재.
- **표시→매핑:** 업로드/폼 입력 → `state.payload.projects[]`(04 §2.3). `id` 자동생성, `division`=orgUnit, `phase`(수행/영업/제안).
- **입력 방법 3:** (a) **엑셀 템플릿**(다운로드→작성→업로드) (b) 폼 수기 1건 (c) [건너뛰기](나중에).
- **액션:** `POST /api/onboarding/projects/preview`(파싱) → `.../apply`(적용). **결산 업로드 UX 재사용**(미리보기→적용, 인식 0건 차단).
- **상태:** 로딩(파싱) / 빈(0건 → "샘플 넣기"·"건너뛰기") / 오류(파싱 실패·**인식 0건 → 적용 차단**) / **부분성공**(오류 행 표시, 유효행만 적용 선택) / 권한없음.
- **예외·정책:** 프로젝트명 필수·중복 경고, 본부는 `orgUnits` 내(불일치 시 **매칭 확인 UI**), 날짜 `YYYY-MM-DD`, 금액 ≥0, 단계 화이트리스트. 대량(수백건) 페이지네이션.

### 화면: 인력 올리기 (onboarding.people / W4) — 건너뛰기 허용
- **목적/진입:** 인력 로스터 초기 적재.
- **표시→매핑:** 업로드/폼 → `state.payload.manpower.people[]`(04 §2.4). 투입프로젝트는 `projects[].name` 매칭. 정직원 = `settings.employmentTypes.internalLabel`.
- **입력 방법 3:** 엑셀 템플릿 / 폼 / 건너뛰기.
- **액션:** `POST /api/onboarding/people/preview` → `.../apply` + **프로젝트 매칭 확인 UI**(05 §6).
- **상태:** 로딩 / 빈 / 오류(인식 0건 차단) / 부분성공 / 권한없음.
- **예외·정책:** 이름 필수·NFC 정규화, 역할/등급은 `settings.roles/grades` 사전 내(`roleAliases` 적용), 날짜·단가 ≥0, **중복키(`name|project|joinedAt|leftAt`) 제거**. 투입프로젝트가 `projects`에 없으면 "새로 생성/매칭/보류". 단가 미입력 → `standardRatesDefault` 자동.

### 화면: 확인·시작 (onboarding.review / W5)
- **목적/진입:** 입력 요약 + 대시보드 미리보기 → 완주 확정.
- **표시→매핑:** 조직 n·목표·프로젝트 n건·인력 n명 요약 + **4개 산출물 미리보기**(코스트/맨파워/예측/보고서 썸네일 — 전부 `settings`+`payload`로 렌더).
- **액션:** [시작하기] → `PUT settings._onboardingComplete=true` → 대시보드 · [팀원 초대] → `POST /api/tenant/invite`(승인제 링크) · [이전 수정].
- **상태:** 로딩(집계 계산) / 빈(데이터 부족 경고: 예측·유휴비용은 인력·목표 필요) / 오류 / 권한없음.
- **예외·정책:** 필수(회사·목표) 미충족이면 **완주 차단** + 해당 스텝 이동. 프로젝트/인력 0건이어도 완주 허용(빈 대시보드 시작)하되 경고.

### 화면: 완료 (onboarding.done)
- 대시보드 진입 + **"다음 액션" 배너**(결산 엑셀 업로드 / AI 배정추천 안내 — Phase 3 인계).

---

## 4. 공통 정책·규칙

| 항목 | 규칙 |
| --- | --- |
| 진행 저장/재개 | `settings._onboarding.progress{step,updatedAt}` 저장, 로그인 시 이어서 |
| 건너뛰기 | W3·W4만 허용(W1·W2는 대시보드 전제라 필수) |
| 데모 테넌트 | 패키지 합성 데이터셋 원클릭 주입(`POST /api/onboarding/demo`) → 즉시 W5, "데모 지우고 시작" 옵션 |
| 권한 | 온보딩은 테넌트 admin(Owner)만. member는 read-only 안내 |
| 검증 게이트 | 업로드 인식 0건이면 적용 차단(빈 덮어쓰기 방지, 결산 UX 계승) · `no-store` |
| 완주율 KPI | 60% 게이트. 스텝별 이탈·완주 이벤트 로깅(→ kpi-event-tracking/고지표 인계) |
| 되돌림 | apply 전 미리보기, apply 후 스텝 재편집 가능. 데모→실데이터 전환은 리셋 확인 |
| 저장 실패 | Phase 1 `version` 낙관적 잠금 재사용(409 시 최신 반환·재시도, 25초 타임아웃·백오프) |

---

## 5. 예외·엣지 케이스 카탈로그

| 케이스 | 처리 |
| --- | --- |
| 파일 형식/시트 없음 | 안내 + 템플릿 재다운로드 유도 |
| 인식 0건 | [적용] 비활성 + "빈 파일/양식 불일치" 안내(결산 UX와 동일) |
| 부분 파싱 실패 | 행별 오류 표시, "유효행만 적용/취소" 선택 |
| 본부 불일치 | 매칭 확인 UI(드롭다운으로 `orgUnits` 지정) |
| 프로젝트 매칭 실패(인력) | "새 프로젝트 생성/기존 매칭/보류" 3택 |
| 중복 인력 | `name|project|joinedAt|leftAt` 키로 자동 제거·건수 표시 |
| 목표 > 매출 / 배분합 불일치 | 경고 + 자동보정 옵션 |
| 조직 0개 | [다음] 비활성 + 추가 유도 |
| 네트워크 저장 실패(409/타임아웃) | 낙관적 롤백·재시도, localStorage 임시 보존 |
| 권한 없음(member) | 온보딩 진입 차단 + "관리자에게 요청" |
| 이미 완주 테넌트 재진입 | 대시보드 리다이렉트(설정에서만 재실행) |
| 대량 업로드/로고 초과 | 페이지네이션 / 용량·포맷 검증 후 거부 |

---

## 6. 완료 정의(DoD) — "바로 세팅"의 판정

5종 입력 완료 시 **① 코스트 대시보드 ② 맨파워(가동/유휴) ③ 예측(12개월) ④ 보고서(기본 템플릿)** 4개가 즉시 렌더(05 §5). 빈/부분 데이터도 크래시 없이 방어. 완주율 ≥60%.

---

## 7. 데이터 계약 — 엑셀 템플릿 2종 (컬럼 스펙)

**프로젝트 템플릿** → `payload.projects[]`
| 컬럼 | 필수 | 매핑/규칙 |
| --- | --- | --- |
| 프로젝트명 | ✅ | `name`, 중복 경고 |
| 소속본부 | | `division` ← `orgUnits[].name`(불일치 시 매칭) |
| 계약금액 | | `expectedRevenue`, ≥0 |
| 시작일/종료일 | | `startDate`/`endDate` `YYYY-MM-DD` |
| 단계 | | `phase` (수행/영업/제안) |
| PM | | `pm`(회원 매핑용 실명) |
| Tier/구분 | | `tier`/`category` |

**인력 템플릿** → `payload.manpower.people[]`
| 컬럼 | 필수 | 매핑/규칙 |
| --- | --- | --- |
| 이름 | ✅ | `name`, NFC 정규화 |
| 본부 | | `division` |
| 역할 | | `role` (`roleAliases` 적용) |
| 등급 | | `grade`/`rateGrade` |
| 투입프로젝트 | | `project` ← `projects[].name` 매칭 |
| 투입일/철수일 | | `joinedAt`/`leftAt` |
| 고용형태 | | `empType` (정직원/외주 → 중립코드) |
| 단가 | | `rate`, 미입력 시 표준단가 자동 |

---

## 8. 신규 API·필드 (구현 계약)

**API(전부 tenant-scoped `withTenant` + admin 권한):**
- `GET/PUT /api/tenant/settings` — 부분 병합
- `POST /api/onboarding/projects/preview` · `/apply`
- `POST /api/onboarding/people/preview` · `/apply`
- `POST /api/onboarding/demo` — 데모 데이터 주입
- `POST /api/tenant/invite` — 팀원 초대(승인제)

**신규 필드:** `settings._onboardingComplete`(bool), `settings._onboarding.progress{step,updatedAt}`.
(projects/manpower는 기존 payload 구조 재사용 — 신규 스키마 없음.)

---

## 9. 인계
- **디자인(ui-review·차도안):** 좌측 스테퍼·업로드 미리보기 모달·매칭 확인 UI·빈/부분 상태 패턴. 기존 결산 업로드 UI 컴포넌트 재사용.
- **데이터(고지표):** 스텝별 이탈·완주율 이벤트(kpi-event-tracking) → 60% 게이트 측정.
- **Phase 3(AI):** 완주 직후 "유휴 인력 배정추천" 배너 진입점.
- **결정 대기:** 데모 데이터셋 범위(스크린샷 합성본 재사용) · 초대 승인 흐름(기존 pending_signups 재사용 권고) · 목표 필수 vs 나중에 허용.
