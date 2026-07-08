# Converge SaaS — 통합 핸드오프 (단일 파일)

> 이 한 파일이 Converge(=con-mgt) SaaS 서비스화 + 창수(Troy) 과제의 **전체 컨텍스트**입니다.
> 클로드 코워크 등 다른 환경에 **이 파일 하나만 업로드/붙여넣기**하면 콜드 스타트로 이어받을 수 있습니다.
> ⚠ con-mgt 실물 원본 6종(사용자·관리자 매뉴얼·아키텍처·데이터구조·SaaS전환·배포)은 분량 관계로 여기 미포함 —
> 깊은 참조가 필요하면 저장소 `parkh37t/clubschool` 브랜치 `claude/wizardly-cray-7zbhom`의 `PROJECT/Convergence_SaaS/_source-package/`를 보세요.


## 목차

1. ① 핸드오프 지도(SSOT·완료물·다음 액션)
2. ② 제품 종합안(전략)
3. ③ 패키징 방안(con-mgt 정합·에디션·배포·End-State)
4. ④ Phase 1 멀티테넌트 코어 설계(DDL·settings·RLS)
5. ⑤ Phase 2 온보딩 마법사 화면설계
6. ⑥ 창수 과제 정의서(Global-Ready)
7. ⑦ 창수 킥오프 안내문
8. ⑧ 창수 워크스페이스 안내(README)
9. ⑨ D1 도메인 용어집(한↔영·번역 SSOT)
10. ⑩ D2 i18n 설계서(템플릿)
11. ⑪ D4·D5 i18n 개발 가이드
12. ⑫ D6 AI 활용 플레이북(템플릿)
13. ⑬ D7 경력증빙(템플릿)

---



<!-- ==================== ① 핸드오프 지도(SSOT·완료물·다음 액션) ==================== -->


# ① 핸드오프 지도(SSOT·완료물·다음 액션)

> 원본 위치: `PROJECT/Convergence_SaaS/클로드코워크-핸드오프.md`


# 클로드 코워크 핸드오프 — Converge SaaS (과제 #3)

> 이 문서 하나로 다른 환경(클로드 코워크)이 **콜드 스타트로도** 이 과제를 이어받게 한다.
> 규율: `.claude/rules/handoff.md`. 언어 한국어.

## 핸드오프: 컨버전스1팀 세션 → 클로드 코워크

### 무엇을 이어받나
1. **Converge 제품** — 사내 실적관리 도구 **con-mgt**(vanilla JS + Express + PostgreSQL JSONB, v234, 라이브)를 멀티테넌트 SaaS로 서비스화.
2. **창수(Troy) 과제** — "Converge Global-Ready": AI를 페어로 한국형 SaaS를 **영문/글로벌 대응**으로 기획·설계·개발(산출물 D1~D7).

### ⚠ 반드시 알 전제 (혼동 방지)
- 상품화 실제 대상은 **con-mgt**. 이 저장소의 **clubschool(React+localStorage)은 별개 참고 코드**다.
- 앞 종합안의 "M0 버그(`data/mockData.ts`)"는 clubschool 것 → con-mgt엔 해당 없음(con-mgt 선행 리스크는 `01-architecture/Phase1…` §7.3).

### 단일 진실 원천 (SSOT)
- **con-mgt 실물 명세:** `PROJECT/Convergence_SaaS/_source-package/`(01~06 매뉴얼·아키텍처·데이터구조·SaaS전환·배포). 원본 훼손 금지, 읽기 전용.
- **멀티테넌시 계약:** `01-architecture/Phase1-멀티테넌트-코어-설계.md`(tenants DDL·`settings` 키 계약·RLS).
- **온보딩 화면:** `02-planning/Phase2-온보딩-마법사-화면설계.md`.
- **번역 SSOT:** `_과제운영/창수-워크스페이스/D1_용어집_한영.md`.

### 완료한 것 (파일)
| 영역 | 파일 |
| --- | --- |
| 전략 | `00-strategy/00_종합안.md`, `01_패키징-방안.md`(§10 End-State) |
| 아키텍처 | `01-architecture/Phase1-멀티테넌트-코어-설계.md` |
| 기획 | `02-planning/Phase2-온보딩-마법사-화면설계.md` |
| 과제/경력 | `_과제운영/과제정의서…`, `킥오프_안내_창수.md`, `창수-워크스페이스/`(D1 시드·D2·D4-5·D6·경력증빙) |
| 보고 | `DELIVERABLES/Convergence_SaaS/00_보고/`(경영 PPTX·실무 DOCX·1pager) |

### 코워크에서 이어서 할 일 (택1)
- **Troy 과제 실행:** `창수-워크스페이스/README.md`대로 D1(용어집 ⚠12개 검수)→D2→D4-5→D6. AI 초안→창수 검수→팀 리뷰.
- **제품 개발 착수:** `Phase1…` §7·§8대로 tenants/RLS/settings 구현(단, con-mgt 실저장소 필요).

### 미해결 / 리스크
- con-mgt 실저장소는 이 세션·저장소에 없음 → 실제 코드 구현은 저장소 연결 필요(i18n 슬라이스는 자체완결 HTML로 우회 가능).
- 결정 대기: 격리 방식·요금·slug 정책·통화 표기(환산 vs 표기)·언어 범위.
- 대외비: `_source-package/`는 실 인프라 서술 포함(실이메일은 마스킹됨). 외부 공유 시 주의.

### 다음 단계 권장 (우선순위)
1. Troy가 D1 용어집 ⚠12개 검수 커밋(`troyk0725@gmail.com`).
2. D2 i18n 설계(통화/날짜/언어전환) → D4 슬라이스 개발.
3. 병행: 경영 결정 회수(§8 목록).

### 영향받는 파일/타입
- (con-mgt) `db.js`·`middleware/auth.js`·`routes/data.js`·`seed.js`·`public/index.html`(i18n·하드코딩)·`utils/mailer.js`.
- (계약) `tenants.settings` 키(§2 Phase1) · D1 용어집(번역 값).

---

## 코워크로 전달하는 방법 (택1)
1. **GitHub 연결(권장):** 저장소 `parkh37t/clubschool` · 브랜치 `claude/wizardly-cray-7zbhom` · **PR #9**. 코워크가 GitHub 연결을 지원하면 이 브랜치를 붙이면 전체가 그대로 온다.
2. **폴더 zip 업로드:** `PROJECT/Convergence_SaaS/` 통째 zip(자체완결)을 코워크 프로젝트에 업로드. (별도 전달)
3. **이 문서만 붙여넣기:** 최소 컨텍스트만 필요하면 본 `클로드코워크-핸드오프.md` 하나를 붙여넣어도 시작 가능.


---



<!-- ==================== ② 제품 종합안(전략) ==================== -->


# ② 제품 종합안(전략)

> 원본 위치: `PROJECT/Convergence_SaaS/00-strategy/00_종합안.md`


# Convergence SaaS — 제품 기획 종합안 (Executive)

> 컨버전스 SaaS(과제 #3) · 팀 워크플로우 산출

# Convergence SaaS 제품 기획 종합안 (Executive Summary + 통합 플랜)

> 대상: 경영진 의사결정용 · 제품명 가칭 **Converge** · 기준일 2026-07-07
> 근거: 현황 매핑(A/B) + 6개 설계(멀티테넌시·온보딩·AI·전략·GTM·보안)

---

## 1. 한 줄 요약

**"엑셀로 흩어진 인력 가동률·맨먼스·유휴비용을 여러 회사가 각자의 데이터로 5분 만에 보고, AI가 다음 투입 결정까지 도와주는 한국형 Lite PSA SaaS"** — 이미 실조직(56명)에서 검증된 계산 엔진을 멀티테넌트로 전환해 2개 분기 내 파일럿 5~10개 확보를 목표로 한다.

---

## 2. 비전 / 해결 문제

**비전:** 사람의 시간을 팔아 매출을 내는 프로젝트 조직이, 인력 가동을 실시간으로 가시화하고 투입 의사결정을 근거 기반으로 빠르게 내리게 한다.

**해결 문제 (3대 손실):**
1. **유휴/과투입 비가시성** — 누가 벤치이고 누가 초과투입인지 월말에야 안다 → 유휴 인건비가 마진을 깎는다.
2. **느린 투입 의사결정** — 가동률·맨먼스 여력·단가가 흩어져 "일단 되는 사람"으로 배정된다.
3. **재무와 단절된 가동률** — 가동률(%)이 유휴비용·매출기여로 환산되지 않아 경영 언어로 보고되지 못한다.

**핵심 Aha:** "우리 팀이 지금 낭비하는 유휴비용이 월 ○○○만원"을 처음 **금액으로** 봤을 때.

---

## 3. 타깃 ICP

| 축 | 1차 타깃 (Beachhead) |
| --- | --- |
| 업종 | 디지털 에이전시 → SI/SM 개발사 → 컨설팅/리서치 대행 → 사내 PMO |
| 규모 | **20~200명 (스윗스팟 30~120명)** — 엑셀은 한계, 해외 PSA는 과함 = 빈 시장 |
| 구조 | 본부/그룹 2~3단계, 목표 가동률(예: 90%)을 관리하는 관리자 존재 |
| 챔피언 / 바이어 | PM·PMO·사업관리팀장 / 본부장·COO·대표 |
| 구매 트리거 | 50명 넘어 엑셀 붕괴 · 경영진의 가동률 보고 요구 · 신규 수주 투입 시뮬 필요 |
| Anti-ICP | 프리랜서, 빌러블 없는 상시운영·제조/유통, 5명 이하, 이미 Kantata급 보유 대기업 |

---

## 4. 제품 개요 (멀티테넌트 + 기준데이터 온보딩 + AI)

세 기둥으로 구성된다.

- **① 멀티테넌트 코어** — 한 브라우저 단일 도구를, 다수 회사가 격리된 데이터로 쓰는 B2B SaaS로 전환. 재사용 자산(도메인 타입 20여 종, 맨먼스↔가동률↔유휴비용 계산 규칙, `useDataStore` 단일 진입점, shadcn UI, 승인 워크플로우)을 그대로 살리고 `tenantId`·인증·서버만 신설한다.
- **② 기준데이터 온보딩** — 하드코딩(그룹 5종·근무일 22·8h·70,000원·목표 90%)을 **테넌트가 CRUD하는 마스터 데이터**로 승격. 회사 → 조직/그룹 → 구성원(CSV/수기/샘플) → 요율·근무캘린더 4단계 위저드로 "빈 화면에서 첫 대시보드까지" TTV를 최소화한다.
- **③ AI 레이어** — Claude가 핵심 가치가 되는 자연어 질의·자동 브리핑을 얹되, **재무 수치는 앱이 결정론적으로 계산하고 Claude는 서사·추론·추천만** 담당(환각 구조적 차단).

**차별화 3축:** 한국형 맨먼스 네이티브 · 가동률의 유휴비용(금액) 환산 · 5분 셋업(해외 PSA 대비 마찰 1/10).

---

## 5. MVP 범위

**목표:** "한 회사가 스스로 가입 → 조직 세팅 → 가동률·유휴비용 대시보드 도달"을 도움 없이 완주.

**포함 (In-Scope)**

| # | 범위 | 왜 MVP인가 |
| --- | --- | --- |
| **M0** | **정합성 버그 선(先)수정** — 파생계산이 모듈 상수(`mockMembers`/`mockMemberManmonths`)를 직접 참조하는 버그를 인자 주입으로 전환 | **협상 불가 선행조건.** 안 고치면 편집해도 가동률·비용이 목데이터로 고정 → 재무 신뢰 붕괴 |
| M1 | 멀티테넌시 최소 — 전 엔티티 `tenantId`, 단일 DB + RLS 격리 | SaaS 전제 |
| M2 | 인증 + 최소 RBAC(관리자/편집자/뷰어), 신원 주입 | 격리·승인·과금 기반 |
| M3 | 온보딩 위저드 — 조직/그룹→멤버(CSV+수기)→캘린더/목표 | TTV 핵심 |
| M4 | 대시보드 + 가동률/유휴비용(파생계산 서버 이전) | 핵심 가치(Aha) |
| M5 | 인력·프로젝트·투입 CRUD + 승인 워크플로우 | 대시보드 채우는 실데이터 경로 |
| M6 | **AI 1종 — 유휴 인력 → 적합 프로젝트 배정 추천** | 차별화 데모 + 온보딩 직후 "다음 액션" |

**제외 (v1+ 연기):** 결제 자동화(파일럿 무료), 화이트라벨, 3단계+ 조직 계층, SSO/SAML·감사로그 심화, 대량 마이그레이션 도구(CSV로 대체), 서버 사전집계, 네이티브 앱, 다통화/다국어.

---

## 6. 아키텍처 요지 (격리 · 인증 · 데이터계층)

**최종 권고 한 줄:** *Vercel(프론트) + Supabase Seoul(공유 Postgres + Auth + RLS)로, `tenant_id` row-level 격리와 Owner/Admin/Editor/Viewer RBAC를 깔고, `useDataStore`를 `DataSource` 추상화로 감싸 파생계산을 서버로 이전, 시트 기반 미터링으로 과금하되 엔터프라이즈는 전용 DB로 승격하는 하이브리드.*

- **격리:** 공유 DB + row-level `tenant_id` + **Postgres RLS**(DB가 최종 방어선) + 앱 계층 tenant-scoped repository(2중 방어). 클라이언트는 `tenant_id`를 절대 전송하지 않고 서버가 JWT에서 도출. 규제 고객만 전용 DB로 승격(에스케이프 해치). 소데이터·다수테넌트·소규모운영 조건에서 비용/운영이 압도적 유리.
- **인증/인가:** Supabase Auth(이메일/매직링크 + Google·**Kakao**, 엔터프라이즈 SSO). **시스템 역할(Owner/Admin/Editor/Viewer)을 직무(`Member.role`)와 분리.** 승인 워크플로우(draft→review→approved)를 실 권한과 결합. `createdBy`/`reviewerId`/`approvedBy`는 인증 신원에서 서버 주입(현 하드코딩 제거). 요율·유휴비용은 **필드레벨 권한**으로 뷰어에게 마스킹.
- **데이터계층:** `useDataStore` 시그니처 유지 + 내부를 `DataSource` 인터페이스로 교체(LocalStorage→ApiDataSource, 플래그 전환·즉시 롤백). 파생계산(맨먼스·비용·집계)은 **서버(SQL 뷰/RPC)로 이전** — 일관성·감사가능성·성능·단가 보호 4가지 이유. 계산 파라미터(근무일·시간·단가)는 테넌트 설정에서 주입.
- **보안 P0:** 요율·개인정보 클라이언트 평문 저장 제거, `importData(any)` 스키마 검증화(zod), TLS 전구간, 감사로그(append-only), PIPA 대응.

---

## 7. AI 로드맵 (MVP AI → 차기)

**정직성 원칙:** Claude를 빼도 성립하면 "AI 장식". 진짜 코어는 자연어·서사이고, 재무 숫자는 앱이 계산한다.

**MVP AI (현재 데이터로 즉시 가능 · Claude 대체불가):**
- **F5 자동 주간/월간 인사이트 브리핑** (난이도 낮음, 1순위) — 앱이 지표 델타 계산 → Claude가 핵심변화 3·리스크 2·액션 3 서술. 리텐션 훅.
- **F4 자연어 질의 → 리포트/차트** (난이도 중간, 2순위) — 질문 → Claude가 쿼리 스펙(JSON) 생성 → 앱의 결정론 집계기 실행 → Recharts + 해설. SaaS 차별화 핵심.
- **F3 유휴·과부하 이상탐지 경보** — 규칙/통계 코어 + Claude 우선순위화. F5 브리핑의 리스크 섹션 공급(번들).
- (전략서의 M6 배정추천은 F2로, MVP에서 규칙 기반으로 데모 제공)

**차기 1 (결정론 엔진 + Claude 서술):** F8 비용 최적화 시뮬(what-if), F2 인력 최적 배치 추천.

**차기 2~3 (ML/통계 + Claude, 기간 스냅샷 모델 선행):** F6 프로젝트 리스크/지연 예측, F1 가동률·수요 예측, F7 채용·외주 의사결정 보조. **시계열 이력이 없어** 월별 스냅샷 모델(YYYY-MM 기준월)이 6~12개월 쌓인 뒤 유의미 → SaaS의 기간 모델 도입과 동일 인프라에 묶는다.

**전제:** Claude API 키는 클라이언트에 둘 수 없음 → 최소 서버 프록시(Edge Function)가 F4/F5의 조건. 즉 AI MVP는 백엔드 착수와 자연스럽게 합류한다.

---

## 8. GTM / 가격 요지

- **포지셔닝:** "빌러블 팀을 위한, 가볍고 한국형인 가동률·리소스 대시보드(Lite PSA)."
- **과금 축:** Seat(관리 대상 구성원) × 티어. 뷰어는 무료(바이럴 확장).
- **가격표(연납):** Free(10명, 3개월 이력) → **Pro ₩9,900/명·월** → **Business ₩19,000/명·월** → Enterprise 견적. **Converge AI 애드온 +₩4,000/명·월**(또는 테넌트 정액). 프리미엄 + Business 14일 무카드 트라이얼 하이브리드.
- **PLG:** 5분 TTV(첫 대시보드)·10분 유휴비용 각성. 페이월은 인원(11번째)·이력(3개월 초과)·유휴비용 클릭·승인·권한 지점에 배치.
- **획득 채널(0→1):** ① 엑셀 템플릿 리드마그넷 + SEO("가동률 관리 엑셀", "맨먼스 계산법"), ② 디스콰이엇/제품헌트·커뮤니티 런칭, ③ "유휴비용 30분 진단" 아웃바운드(본부장·PMO).
- **랜딩 헤드라인:** "우리 팀이 지금 얼마나 놀고 있는지, 5분 만에 금액으로 봅니다."
- **정직성 게이트:** SSO·RBAC·API·AI는 로드맵 기능 → 랜딩/가격표에 출시/베타 배지, 미구현 가치 확정 약속 금지. 고객 로고·수치는 파일럿 확보 후 교체.

---

## 9. 단계 로드맵 (분기별)

의존성 순서: **M0 버그수정 → 테넌시/인증 → API/DB → 온보딩/대시보드 → AI**. `useDataStore` 시그니처 유지 전략으로 화면 코드 변경 최소화.

**MVP — 2026 Q3~Q4 (파일럿 5~10개 테넌트)**
- **Q3:** M0(정합성 버그) → M1(테넌시·`tenantId`·RLS) → Supabase+Postgres 구축, `useDataStore` 내부 API 교체 → M2(인증+최소 RBAC). 보안 P0(평문저장 제거·import 검증·TLS) 동반.
- **Q4:** M3(온보딩 위저드) → M4(대시보드·유휴비용, 파생계산 서버 이전) → M5(CRUD·승인) → M6(AI 배정추천) + **F5 브리핑**. 기존 localStorage 데이터를 첫 테넌트로 import. 파일럿 온보딩·인터뷰.
- **게이트:** type-check/lint(--max-warnings 0)/build 통과 + 테넌트 격리 자동 테스트(A토큰으로 B 데이터 0건).

**v1 — 2027 Q1~Q2 (상용화, 유료 30개 테넌트)**
- **Q1:** 결제/구독(Stripe/Paddle·좌석 과금), 온보딩 개선(TTV 15분), 서버 사전집계·성능, 유휴/과투입 임계 알림.
- **Q2:** AI 2종째(**F4 자연어 질의** 정식화 + 월별 가동률 예측 착수), 경영보고 PDF/월마감, **기간(period) 모델 정식화**(YYYY-MM·월 마감 lock) → 예측군 인프라 확보.

**v2 — 2027 Q3~Q4 (스케일·엔터프라이즈)**
- **Q3:** 다본부/다지사 가변 계층, 화이트라벨, SSO/SAML·감사로그 심화, 전용 DB 에스케이프 해치.
- **Q4:** 원가/정산·급여 시스템 연동, AI 3종(자동 리밸런싱·수요예측·채용/외주 보조), 다통화/국제화, 오픈 API·웹훅.

---

## 10. 핵심 리스크 · 가정

| # | 가정(검증 대상) | 리스크 | 완화책 |
| --- | --- | --- | --- |
| A1 | 30~200명 조직이 "가동률→유휴비용 자동화"에 **월 단위로 지불**한다 | PMF 실패(페인은 있으나 지불의사 약함) | 파일럿에서 지불의사·ARPA를 v1 전 검증, ROI 케이스화 |
| A2 | 온보딩을 **30분 내 스스로 완주** | 셋업 무거워 이탈 → TTV 실패 | CSV 임포트·샘플/데모·기본 프리셋, 완주율 60% 게이트 |
| **A3** | **데이터 정합성이 재무 신뢰의 전제** | **M0 버그·clamp가 초과투입/비용오차를 가림 → 숫자 불신 시 즉시 이탈** | **M0 선수정 필수**, 계산을 서버 단일 진실로, 초과투입 검증 서버 규칙화 |
| A4 | 단일 DB+RLS로 테넌트 격리 충분 | 격리 결함 = 타사 데이터 노출(치명적·법적) | 전 쿼리 tenant 스코프 강제 + 격리 자동 테스트 |
| A5 | 단가·비용 다루므로 권한 분리가 판매 조건 | 뷰어가 민감정보 열람 | 최소 RBAC + 필드레벨 마스킹을 MVP에 포함 |
| A6 | AI 배정추천이 실제 채택될 만큼 유용 | 추천이 뻔하거나 틀림 | 규칙 기반 시작, 채택률 20% 관찰, "제안일 뿐 결정은 사람" |
| A7 | 목데이터 비결정성(Math.random) 제거 가능 | 재현 불가·QA 저하 | 결정론적 시드로 대체 |

**PO/경영 결정 필요(가정 금지):** ① 격리 방식(단일 DB+RLS 권고 vs 스키마/DB 분리) ② 요금 모델(좌석당 vs 정액 vs 구간제) ③ 조직 계층 깊이(2~3단계 고정 권고 vs 가변) ④ 기존 localStorage 사용자 이관 범위 ⑤ 컴플라이언스 목표(ISMS-P/SOC2 시점) ⑥ 교차테넌트 벤치마킹 상품화 여부(공유 DB 선택 강화).

---

## 11. 즉시 다음 액션 (착수 순서)

1. **[블로커] M0 정합성 버그 수정** — `data/mockData.ts`의 파생계산 함수(`calculateUtilizationData`/`getGroupSummary` 등) 모듈 상수 참조를 인자 주입 순수함수로 전환, `Math.random` 시드 제거. 모든 후속(실데이터·AI·서버계산)의 전제.
2. **타입 계약 확정** — `types/index.ts`에 `Tenant/User/Membership/Role`·전 엔티티 `tenantId`·`updatedAt` 추가(미사용 상태로 먼저). API 계약 단일 원천 확정.
3. **`DataSource` 추상화 도입** — `useDataStore` 리팩터(시그니처 유지, LocalStorage 구현 이관). 순수 리팩터로 사용자 무영향.
4. **경영 결정 4건 회수** — 격리 방식·요금 모델·조직 계층·기존 데이터 이관 → GTM/아키텍처 확정에 필요(위 미해결 항목).
5. **인프라 셋업** — Supabase 프로젝트(Seoul, ap-northeast-2) 생성, `tenant_id`+RLS 스키마 초안, 배포 일원화(Vercel 단일, GitHub Pages 스크립트 정리).
6. **파일럿 3~5개사 사전 접촉** — "유휴비용 진단" 훅으로 지불의사·ARPA 인터뷰 시작(A1 검증), 엑셀 템플릿 리드마그넷 제작.
7. **화면 정의 인계** — 온보딩 위저드 4단계·테넌트/권한 설정·AI 배정추천 UX를 `VIEW_NAMES`→`ViewRenderer`→네비 절차로 구체화(service-planning).

**영향 핵심 파일:** `types/index.ts`(계약) · `hooks/useDataStore.ts`(단일 진입점) · `data/mockData.ts`(계산 인자화·랜덤 제거) · `constants/views.ts`+`components/ViewRenderer.tsx`(온보딩/설정 뷰) · `components/ProjectReview.tsx`(승인 신원 결합).


---



<!-- ==================== ③ 패키징 방안(con-mgt 정합·에디션·배포·End-State) ==================== -->


# ③ 패키징 방안(con-mgt 정합·에디션·배포·End-State)

> 원본 위치: `PROJECT/Convergence_SaaS/00-strategy/01_패키징-방안.md`


# 컨버전스 SaaS — 패키징 방안 (con-mgt 실제 코드베이스 기준)

> 입력: 사용자 업로드 `ClubSchool_SaaS_Package_20260707.zip`(6개 문서 + 스크린샷 22장) = **현재 SaaS 대상 실물 모델**.
> 원본 편입: `PROJECT/Convergence_SaaS/_source-package/`(01~06 + README). 기준 코드: con-mgt master **v234**(회귀 188/188).
> 목적: "이 실물 모델을 어떻게 상품으로 패키징할 것인가"를 산출물·제품·배포·온보딩·로드맵 5층위로 정리.

---

## 0. ⚠ 선행 정합: 대상 코드베이스 정정 (가장 중요)

두 코드베이스가 혼재해 있었습니다. **상품화 대상은 con-mgt**이며, 앞선 종합안이 분석한 clubschool은 별개입니다.

| 구분 | **con-mgt** (실제 SaaS 대상) | clubschool (이 저장소) |
| --- | --- | --- |
| 정체 | 라이브 운영 중 손익관리 대시보드 (con-mgt-ruddy.vercel.app) | React 실적관리 대시보드(참고/실험) |
| 프론트 | **vanilla JS SPA** `public/index.html` ~26,000줄 | React 18 + TS + Vite |
| 백엔드 | **Node.js + Express** (`server.js`·`routes/*`·`middleware/*`) | 없음(프론트 전용) |
| 저장 | **PostgreSQL — `state.payload` JSONB 단일 행** + JWT 인증 | localStorage + `useDataStore` |
| 성숙도 | 승인제 가입·28 API·회귀 188개·v234·실운영 | 목데이터 기반 |

**정정 결론**
- 앞 종합안의 **"M0 버그(`data/mockData.ts` 파생계산 모듈상수 참조)"는 clubschool 것** → con-mgt에는 **해당 없음**.
- con-mgt의 "상품화 선행조건(정정된 M0급)"은 **다른 세트**입니다(§7). 04 문서 §5.6 근거.
- **여전히 유효한 종합안 결론:** Row-per-Tenant + RLS 격리 · 최소 온보딩 데이터셋 · AI 3티어 · 좌석+조직 과금 · 포지셔닝. (con-mgt의 단일-JSONB-행 구조가 오히려 "행 하나 추가 = 테넌트 추가"로 이 방향을 **더 강하게** 뒷받침.)

> 앞서 만든 경영/실무 보고서(`DELIVERABLES/Convergence_SaaS/00_보고/`)는 전략·시장·가격 골격으로는 유효하나, **기술 근거는 con-mgt 기준으로 개정 필요**(개정판 v2를 별도 산출 권장).

---

## 1. "패키징"의 5개 층위 (이 문서의 골격)

| 층위 | 질문 | 산출 |
| --- | --- | --- |
| A. 산출물 패키징 | 이 실물 모델을 저장소에 어떻게 편입·버전관리하나 | §2 |
| B. 제품(에디션) 패키징 | 무엇을 묶어 파나 (Starter/Pro/Enterprise + AI) | §3 |
| C. 배포 형태 패키징 | 어떻게 전달하나 (SaaS/단일VM/온프레미스) | §4 |
| D. 온보딩 패키징 | 고객이 어떻게 "바로 시작"하나 (5종 데이터·마법사·데모) | §5 |
| E. 전환 로드맵 패키징 | 어떤 순서로 만드나 (Phase 0~4 + 첫 스프린트) | §6·§7 |

---

## 2. A. 산출물 패키징 (저장소 편입 구조)

```
PROJECT/Convergence_SaaS/
├─ _source-package/          ← 업로드 원본 6문서(SSOT). con-mgt 진실 원천.
│   ├─ 01_사용자_매뉴얼.md   02_관리자_매뉴얼.md   03_아키텍처.md
│   ├─ 04_데이터_구조.md     05_SaaS_전환_설계.md   06_배포_운영_노하우.md
│   └─ README.md
├─ 00-strategy/
│   ├─ 00_종합안.md          ← clubschool 기준(전략 골격 유효, 기술 개정 필요)
│   └─ 01_패키징-방안.md     ← (본 문서) con-mgt 기준 통합 패키징
└─ 01-architecture/          ← 멀티테넌시·보안(개정 대상)
```

- **원칙:** `_source-package/`는 **읽기 전용 SSOT**(원본 훼손 금지). 파생 결정은 `00-strategy/`·`01-architecture/`에 기록.
- **스크린샷 22장(9.2MB):** 매뉴얼·데모·영업자료 자산이나 바이너리 비대화를 고려해 **git 미편입(보류)**. 필요 시 `_source-package/screenshots/`로 별도 커밋(승인 후).
- **보고 세트 연결:** 기존 3종(PPTX/DOCX/1pager)은 전략용으로 유지하되, 본 정정을 반영한 **개정판 v2**를 후속 산출.

---

## 3. B. 제품(에디션) 패키징 — 무엇을 묶어 파나

con-mgt가 이미 증명한 **가치 루프**를 에디션으로 계층화 (05 §1·§9, 04 근거):

```
결산 엑셀 업로드 1회 → 월별 손익 자동집계(본부별/통합, 관리·재무 이중뷰)
  → 미래월 예측(계획원가 시뮬) → BEP 캐치업 시나리오(영업·인력·프로젝트 3레버)
  → 인력 가동/유휴 관리 → 보고서 원클릭(경영회의 PPTX 20장 + 트래커 Excel)
```

| 에디션 | 대상 | 묶음(패키지) | 근거 |
| --- | --- | --- | --- |
| **Starter** | 팀 1개·10명·프로젝트 20건 | 코스트/맨파워 대시보드 + 결산 엑셀 업로드 + 기본 보고서 | 05 §9 |
| **Pro** | 본부 N개·50명 | + 12개월 예측 · BEP 시나리오 · 자동 알림 5단계 · 보고서 세트 전체(PPTX 20장+트래커) | 05 §7 Core/Reports |
| **Enterprise** | 대형/규제 | + 온프레미스/전용 DB · SSO(SAML/OIDC) · 브랜드 덱 템플릿 제작 · **LLM 기능** | 05 §9, 06 §4.3 |
| **AI 애드온** | 전 에디션 | LLM 내러티브·이상감지 설명·자연어 질의·임의양식 엑셀 자동매핑 | 05 §7 LLM |

- **핵심 락인 = 보고서.** "시스템이 곧 월간회의 자료를 만든다"가 킬러 기능 → **보고서 생성은 미터링하지 않고 무제한**(과금축은 좌석 + 조직단위 수). (05 §1·§9)
- **AI 3티어 구조**(05 §7): **Core(규칙기반, 완성)** → **Reports(생성, 완성·템플릿 갤러리화만)** → **LLM(확장, Phase 3)**. LLM 데이터 계약: 입력은 payload 요약뷰(실명 옵트인), 출력은 "사람이 승인하는 초안"(현 미리보기→적용 패턴 재사용).

---

## 4. C. 배포 형태 패키징 — 어떻게 전달하나

동일 코드가 **3가지 배포 형태**로 나가도록 패키징(06 문서 근거). `DATABASE_URL`만 바꾸면 격리 강도가 달라지는 것이 이 구조의 강점.

| 형태 | 구성 | 격리 | 대상 |
| --- | --- | --- | --- |
| **SaaS(현행)** | Vercel(서버리스) + 관리형 Postgres(Supabase/Neon/RDS) | 공유 DB + `tenant_id` + **RLS** | Starter·Pro |
| **단일 VM** | Node+PM2+Nginx(TLS)+Postgres | 인스턴스 격리 | 중견 |
| **온프레미스** | Docker Compose(app+postgres+backup) | **DB-per-Tenant / 폐쇄망** | Enterprise·공공 |

**배포 패키징 시 반드시 포함할 것 (06 근거):**
- **환경변수 계약:** `DATABASE_URL`(필수) · `JWT_SECRET`(프로덕션 32자+ 강제) · `NODE_ENV=production` · `ADMIN_INITIAL_PASSWORD`(seed) · 선택 `SMTP_*`·`LOGIN_URL`. → **`ADMIN_INITIAL_EMAIL` 신설**(현재 seed.js에 실계정 이메일 하드코딩 → 제거, 06 §5.1).
- **온프레미스 선행작업(필수):** CDN 4종(xlsx/exceljs/pptxgenjs/fflate) + Pretendard 폰트 **self-host**(폐쇄망 로드 실패 방지, 06 §4.1).
- **백업 패키지:** `state.payload` 1행 JSON 덤프 + `pg_dump -Fc` 일일 백업 컨테이너, **백업 파일 암호화**(손익·실명 포함, 06 §5.2).
- **SSO 연계 포인트 4곳** 사전 문서화(토큰 수용부 `authOptional`·로그인 진입부·프로비저닝·비번 라우트 비활성 — 06 §4.3) → Enterprise 세일즈 자산.

---

## 5. D. 온보딩 패키징 — "기준 데이터만 넣으면 시작"

**최소 입력 5종**(이 이하 불가·이 이상 불요, 05 §5). 완료 시 ①코스트 ②맨파워 ③예측(12개월) ④보고서 4개가 즉시 동작.

| # | 데이터 | 최소 필드 | 입력법 |
| --- | --- | --- | --- |
| 1 | 회사·조직 | 회사명·로고·본부/팀(1+) | 폼 3분 |
| 2 | 관리자 | 관리자 1명(이후 승인제 가입) | 폼 1분 |
| 3 | 프로젝트 | 이름·본부·계약액·기간·단계 | 엑셀/폼 |
| 4 | 인력 | 이름·본부·역할·등급·투입PJ·기간 | 엑셀/폼 |
| 5 | 목표 | 연 매출·영업이익(월 균등 자동) | 폼 2분 |

**온보딩 마법사 5단계**(05 §6) — 3·4단계는 **검증된 결산 업로드 UX 재사용**(미리보기→적용, 인식 0건 차단, 파일명·시트 규칙). 각 단계 건너뛰기 허용 + **데모 테넌트 원클릭 주입**(업로드 패키지의 합성 데이터·스크린샷 데이터셋)으로 "빈 화면 공포" 제거.

> 온보딩 = **하드코딩→settings 추출이 끝나야 성립**(§7). 즉 온보딩 패키징의 실제 선행작업은 Phase 1이다.

---

## 6. E. 전환 로드맵 패키징 (Phase 0~4)

| Phase | 내용 | 규모 | 상태 |
| --- | --- | --- | --- |
| **0. 정리** | 문서·매뉴얼·스키마·배포노하우 패키징 | — | ✅ (본 업로드 = 완료) |
| **1. 멀티테넌트 코어** | tenants/`tenant_id`/RLS · **하드코딩→settings** · 서브도메인 라우팅 | 2~4주 | ← **첫 스프린트** |
| **2. 온보딩 마법사** | 5단계 마법사 + 템플릿 엑셀 2종 + 데모 주입 | 2~3주 | |
| **3. AI 고도화** | LLM 내러티브/질의 · 덱 템플릿 갤러리 · (대형)정규테이블 분리 | 지속 | |
| **4. 상용화** | 과금(플랜/좌석) · 감사로그 · SLA·백업 자동화 · 온프레미스 Docker 패키지 | 지속 | |

---

## 7. 첫 스프린트 (Phase 1) 작업 명세 — 04 §5 하드코딩 추출 목록 = 작업지시서

**목표:** 신규 테넌트 = `tenants` 1행 + `state` 1행 + `users` 1행. "코드 = 공통 로직, settings = 회사가 다른 모든 것".

### 7.1 멀티테넌시 스키마 (05 §3)
```sql
tenants(id, slug, name, plan, created_at, settings JSONB)
users( ... , tenant_id FK)
state(tenant_id PK, payload JSONB)      -- CHECK(id=1) 제거, 테넌트당 1행
pending_signups / password_resets / login_attempts (+ tenant_id)
```
- 모든 쿼리에 `tenant_id` 필터(미들웨어가 JWT tenant claim 강제) + **Postgres RLS 이중 방어**.
- URL: `{slug}.clubschool.io` 서브도메인 → slug→tenant_id 해석.

### 7.2 하드코딩 → tenants.settings 추출 (04 §5, 우선순위)
| 순위 | 카테고리 | 현재 하드코딩 | settings 키(안) |
| --- | --- | --- | --- |
| 1 | 조직 구조 | `DIV_2/DIV_3`(2본부 고정)·`ORG_DEFAULT_*` | `orgUnits[]`(N개 가변, 문자열키→ID키) |
| 1 | 관리자/브랜딩 | seed 이메일·메일 발신자·`LOGIN_URL` | `ADMIN_INITIAL_EMAIL`·`branding{}` |
| 2 | 사업계획 baseline | `SAJEONG_BASELINE`(SG&A 손익에 직접 사용) | `plan.baseline`·`plan.targets`·`plan.laborByUnit` |
| 2 | 프로젝트 매핑 | 업로드 파서 `KMAP`/`KMAP_PB` | 제거 → projects 마스터 이름매칭 + 확인 UI |
| 3 | 인사·단가 | `HQ_PEOPLE_MASTER`·`PEOPLE_SEED`·`STANDARD_RATES` | manpower/standardRates를 SSOT로 승격, 시드 제거 |
| 3 | 고용형태 | `empType==='와일리'` 리터럴 판정 | `empType:'internal'|'external'` 중립코드 |
| 3 | 정적 시드 번들 | `EXEC_FILE_MAP`+`pnl_data.json`·`WOORI_PLAN`·`defaultContractSalesSeed` | 전부 업로드 기반으로, 실명/실계약 시드 제거 |

### 7.3 con-mgt 선행 리스크 (정정된 "M0급" — 상품화 전 필수, 04 §5.6)
1. **`xmin` 동시성 토큰 제거** → 명시적 `version` 컬럼 낙관적 잠금(현재 Postgres 전용 시스템컬럼 의존).
2. **클라이언트 마이그레이션 → 서버 마이그레이션 이관.** 현 `_seedVersion` 블록은 **비단조(non-monotonic) 배치 버그 실재**(상위 버전이 먼저 올려 하위 블록 사문화) — "읽는 클라이언트가 데이터를 변형"하는 구조 자체가 다중테넌트에 부적합.
3. **admin 이메일 하드코딩 제거**(seed.js 실계정 이메일 → `ADMIN_INITIAL_EMAIL` env).
4. (성장 테넌트) **단일 JSONB(10MB 캡) → 도메인 테이블 분해** 및 엑셀 raw base64 → 파일 스토리지. Phase 1에선 유지 가능, Phase 3 분기.
5. **본부 참조-스왑(`_divData`) → division 차원 정규화**(루트 미러 이중표현·참조공유 버그 부채 제거).

> clubschool의 "M0(mockData 파생계산)"과 con-mgt의 이 선행 리스크는 **별개**다. 상품화는 con-mgt 리스크가 기준.

---

## 8. 결정 필요 (팀 권고 · 확정은 경영)

| # | 결정 | 팀 권고 |
| --- | --- | --- |
| 1 | 상품화 베이스 코드 | **con-mgt 확정**(성숙·실운영). clubschool은 참고 종료 or UI 리서치용 분리 |
| 2 | 첫 스프린트 착수 대상 | Phase 1 멀티테넌트 코어(§7.1~7.2) + 선행 리스크 1·3(§7.3) 동반 |
| 3 | 배포 우선 형태 | SaaS(Vercel+RLS) 우선, 온프레미스는 Enterprise 딜 확정 시 |
| 4 | 스크린샷 22장 git 편입 | 보류(비대화) — 데모/영업 자산으로 별도 관리 권장 |
| 5 | 보고서 v2 개정 | con-mgt 기준으로 경영/실무 보고서 기술 근거 개정 |

---

## 9. 즉시 다음 액션 (착수 순서)
1. **결정 1·2 회수** — 베이스 코드 con-mgt 확정, 첫 스프린트 범위 승인.
2. **Phase 1 설계** — `tenants` 스키마 + settings 키 계약 확정(§7.1·7.2), RLS 정책 초안.
3. **선행 리스크 1·3 병행** — `version` 컬럼 전환 + admin 이메일 env화(작고 안전, 즉시).
4. **온보딩 데이터 계약** — 5종 최소 데이터셋 스키마 + 엑셀 템플릿 2종(프로젝트·인력) 확정.
5. **보고서 v2** — 본 정정 반영 경영/실무 보고서 개정판.

**영향 핵심 파일(con-mgt):** `db.js`(SCHEMA/PATCH·풀) · `middleware/auth.js`(JWT·tenant claim·RLS) · `routes/data.js`(xmin→version·tenant 필터) · `public/index.html`(하드코딩 상수·클라 마이그레이션) · `seed.js`(admin 이메일 env) · `utils/mailer.js`(브랜딩).

---

## 10. SaaS 최종 형태 (End-State) — 이렇게 바뀐다

패키징이 끝나면 con-mgt는 "**한 회사 전용 도구**"에서 "**여러 회사가 스스로 가입해 쓰는 멀티테넌트 제품**"으로 형태가 바뀝니다. 전환 전/후 대조:

| 축 | 현재 con-mgt (단일 조직) | SaaS 형태 (전환 후) |
| --- | --- | --- |
| **테넌시** | `state.id=1` 고정, 한 회사 데이터가 JSONB 1행 | `tenants` 테이블 + `state(tenant_id PK)` 테넌트당 1행. **신규 회사 = 3테이블 각 1행** |
| **조직 분리** | payload 내부 `_divData` 객체 스왑(본부 2개 고정) | 테넌트 하위 `orgUnits[]` N개 가변(division 차원 정규화) |
| **격리** | 없음(단일) | JWT `tenant` claim 미들웨어 강제 + **Postgres RLS** 이중 방어 |
| **진입** | 관리자 시드 계정 1개 | `{slug}.clubschool.io` 서브도메인 · **셀프서브 가입** + 승인제 |
| **회사 고유값** | 코드에 하드코딩(본부·단가·사업계획·브랜드) | **`tenants.settings`(JSONB)** — 온보딩에서 입력·수정 |
| **온보딩** | 개발자 시드 | **최소 5종 데이터 + 5단계 마법사**(데모 원클릭 주입) → 5분 셋업 |
| **동시성** | Postgres `xmin` 시스템컬럼 | 명시적 `version` 컬럼 낙관적 잠금 |
| **마이그레이션** | 클라이언트가 payload 변형(비단조 버그) | 서버 순차 마이그레이션(단조 증가) |
| **배포** | Vercel + 관리형 Postgres 1개 | 동일 코드가 **① SaaS(공유DB+RLS) ② 단일VM ③ 온프레미스 Docker(DB-per-Tenant)** |
| **상품 구성** | 무료 사내 도구 | **Starter / Pro / Enterprise + AI 애드온**, 좌석+조직단위 과금(보고서 무제한) |
| **AI** | Core(규칙)·Reports(생성) 내장 | + **LLM 티어**(내러티브·자연어질의·이상감지·엑셀 자동매핑, 사람 승인 초안) |

**전환 후 신규 고객의 Day-1 흐름 (셀프서브):**
```
회사 가입({slug}.clubschool.io)  →  온보딩 마법사 5단계
  STEP1 회사·조직(로고·본부)   → tenants + settings 생성
  STEP2 목표(연 매출/영업이익)  → plan (월 균등 자동)
  STEP3 프로젝트(엑셀/폼)        ┐ 검증된 결산 업로드 UX 재사용
  STEP4 인력(엑셀/폼)            ┘ (미리보기→적용, 인식 0건 차단)
  STEP5 확인 → "시작하기"
        ↓  (5종 데이터 입력 완료 시점)
  ✅ 코스트 대시보드 · ✅ 맨파워(가동/유휴) · ✅ 12개월 예측 · ✅ 보고서 다운로드  즉시 동작
```

**한 줄 형태 정의:** *동일 코드베이스 위에서 `tenant_id`+RLS로 회사를 격리하고, 회사가 다른 모든 것을 `settings`로 뽑아, 5종 데이터만 넣으면 5분 안에 대시보드·예측·보고서가 도는 — 셀프서브 멀티테넌트 + 온프레미스 겸용 SaaS.*

> 이 형태에 도달하는 **최소 임계점 = Phase 1**(§7). Phase 1이 끝나면 "신규 회사 추가"가 코드 변경 없이 데이터 추가만으로 가능해지고, Phase 2(온보딩)가 셀프서브를, Phase 3(AI)·4(과금)가 상품 완성을 얹는다.


---



<!-- ==================== ④ Phase 1 멀티테넌트 코어 설계(DDL·settings·RLS) ==================== -->


# ④ Phase 1 멀티테넌트 코어 설계(DDL·settings·RLS)

> 원본 위치: `PROJECT/Convergence_SaaS/01-architecture/Phase1-멀티테넌트-코어-설계.md`


# Phase 1 — 멀티테넌트 코어 상세 설계 (con-mgt 기준 착수 문서)

> 대상: 백엔드/DB 구현팀. 근거: `_source-package/04_데이터_구조.md`(현 DDL·payload), `05_SaaS_전환_설계.md`(§3·§4), `06_배포_운영_노하우.md`(§1·§5). 상위: `00-strategy/01_패키징-방안.md` §7·§10.
> 목표 한 줄: **신규 회사 = `tenants` 1행 + `state` 1행 + `users` 1행**. "코드=공통 로직, `settings`=회사가 다른 모든 것."

---

## 0. 범위 (In / Out)

**In (Phase 1):**
- 스키마: `tenants` 신설 · 전 테이블 `tenant_id` · `state` 단일행(id=1)→테넌트당 1행 · `xmin`→명시적 `version` 컬럼.
- 격리: JWT `tenant` claim + Postgres **RLS**(2중 방어) + 앱계층 tenant-scope.
- 테넌트 라우팅: `{slug}.clubschool.io` 서브도메인 → tenant 해석.
- 하드코딩 → `tenants.settings` 추출(우선순위 1·2군, §3).
- 선행 리스크 병행: `version` 전환(리스크1) · `ADMIN_INITIAL_EMAIL` env화(리스크3).
- 기존 단일 테넌트(현 운영 데이터) → 첫 테넌트로 이관.
- 격리 자동 테스트(게이트).

**Out (후속 Phase):** 온보딩 마법사(Phase 2) · LLM(Phase 3) · 과금/좌석(Phase 4) · 단일 JSONB→도메인 테이블 분해(성장 테넌트, Phase 3) · 클라이언트→서버 마이그레이션 완전 이관(리스크2, 점진).

---

## 1. 스키마 설계 (idempotent DDL)

현 `ensureSchema()`(SCHEMA + SCHEMA_PATCH, `db.js`) 패턴을 유지 — 콜드스타트/기동 시 `CREATE TABLE IF NOT EXISTS` + `ALTER … ADD COLUMN IF NOT EXISTS`로 멱등 적용.

### 1.1 tenants (신설)
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,           -- 서브도메인 키 ({slug}.clubschool.io)
  name       TEXT NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'starter',-- starter|pro|enterprise
  status     TEXT NOT NULL DEFAULT 'active', -- active|suspended
  settings   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- §2 계약
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.2 users (tenant_id 추가 · username 유니크 범위 변경)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
-- 현재 username 전역 UNIQUE → 테넌트별 UNIQUE 로 전환(서브도메인 로그인 전제)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_username ON users(tenant_id, lower(username));
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
```
- `role`(admin|member)·`perms`(cost/report/manpower/project/exec × none/read/write) 구조는 **그대로 유지** — 테넌트 내부 권한으로 재사용(05 §2). admin은 이제 "테넌트 관리자"(전역 아님).

### 1.3 state (핵심: 단일행 → 테넌트당 1행, xmin → version)
```sql
-- 신규 배포: tenant_id PK. (기존 DB 이관은 §5)
CREATE TABLE IF NOT EXISTS state (
  tenant_id  UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  payload    JSONB NOT NULL,
  version    BIGINT NOT NULL DEFAULT 1,      -- xmin 대체(낙관적 잠금, §4)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
```
- **`CHECK(id=1)` 제거**가 핵심 변경. payload 스키마(months/projects/manpower/… — 04 §2)는 **불변**이라 프론트 렌더 코드 영향 최소.
- 10MB 캡(413)·완전중복 제거(`name|project|joinedAt|leftAt`)·`Cache-Control:no-store` 원칙 유지(04 §1.2, 06 §5.6).

### 1.4 인증 부속 테이블 (tenant_id 추가)
```sql
ALTER TABLE pending_signups  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE password_resets  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE login_attempts   ADD COLUMN IF NOT EXISTS tenant_id UUID;  -- FK 생략(고빈도·정리대상)
-- rate-limit 키를 테넌트로 분리: attempt_key = 'tenant_id|username|ip'
CREATE INDEX IF NOT EXISTS idx_pending_tenant ON pending_signups(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_preset_tenant  ON password_resets(tenant_id, status);
```

---

## 2. `tenants.settings` 키 계약 (하드코딩 추출의 목적지)

현 코드의 회사 고유 상수(04 §5)를 이 JSONB 하나로 이전한다. **런타임 로직은 이 계약만 읽는다.**

```jsonc
{
  "orgUnits": [                              // ← DIV_2/DIV_3, ORG_DEFAULT_DIVISIONS (개수 가변)
    { "id": "u1", "name": "본부 A", "order": 1 },
    { "id": "u2", "name": "본부 B", "order": 2 }
  ],
  "roles":  ["PM","PMO","LEADER","기획","디자인","퍼블리싱","개발"],  // ← ORG_DEFAULT_ROLES
  "grades": ["초급기술자","중급기술자","고급기술자","특급기술자"],
  "roleAliases": { "PA": "기획", "CD": "디자인" },                     // ← _normRole 하드코딩
  "employmentTypes": { "internalLabel": "정직원" },                    // ← empType==='와일리' 판정 중립화
  "branding": {                              // ← utils/mailer.js, 덱 표지, 회사명
    "companyName": "회사명",
    "logo": "https://…",
    "palette": { "primary": "#…", "accent": "#…" },
    "coverText": "월간 경영보고",
    "loginUrl": "https://slug.clubschool.io",
    "mailFromName": "회원 시스템"
  },
  "plan": {                                  // ← SAJEONG_BASELINE, TARGET_*, BONBU_LABOR_PLAN
    "targets": { "2026": { "revenue": 0, "opProfit": 0 } },
    "baseline": {                            // 조직×항목 사업계획(연도별)
      "2026": {
        "byUnit": { "u1": { "rev":0,"oi":0,"gp":0,"cogs":0,"sga":0 } },
        "total":  { "rev":0,"oi":0,"gp":0,"cogs":0,"sga":0 }
      }
    },
    "laborByUnit": { "u1": [0,0,0,0,0,0,0,0,0,0,0,0] }  // 본부×월 정직원 인건비 계획(forecast 근거)
  },
  "accounting": {                            // ← 진행매출 인식·SG&A 배부·마감월
    "recognition": "progress",               // progress|invoice
    "sgaAllocation": "even",                 // SG&A = 판관비−인건비, 균등/12
    "closedMonthDefault": null               // fallback '4' 제거 → 명시값만
  },
  "standardRatesDefault": {                  // ← STANDARD_RATES_DEFAULT (테넌트 기본값만; 편집본은 payload.standardRates 유지)
    "PM": { "특급":0,"고급":0,"중급":0,"초급":0 }
  },
  "uploadTemplate": {                        // ← 결산/실행 엑셀 양식 결합(04 §5.5)
    "version": "v2",
    "settlementSheets": { "인건비":"labor","세금계산서|발행매출":"invoice","입금":"payment","턴키|매입":"purchase","직접비":"expense","손익|요약":"summary","진행매출":"projects3" },
    "execCells": { "maxRows": 19 }           // ← EXEC_MAX_ROWS
  }
}
```

**추출 원칙**
- **제거(시드→데이터):** `KMAP`/`KMAP_PB`(→projects 이름매칭+확인 UI) · `EXEC_FILE_MAP`+`pnl_data.json` · `WOORI_PLAN` · `PEOPLE_SEED` · `HQ_PEOPLE_MASTER` · `defaultContractSalesSeed`(실계약) · 마이그레이션 내 실명/실프로젝트.
- **중립화:** `empType==='와일리'` → `settings.employmentTypes.internalLabel` 비교, 또는 `empType:'internal'|'external'` 코드.
- **payload 유지:** `standardRates`·`orgConfig`는 이미 payload 편집 가능 → 테넌트 **기본값만** settings에서 시드, 이후 편집본은 payload에.
- **문자열키→ID키:** 본부를 이름 문자열이 아니라 `orgUnits[].id`로 참조(참조-스왑 `_divData` 부채 제거는 리스크5, 점진).

---

## 3. 하드코딩 추출 착수 순서 (스프린트 분해)

| 순번 | 작업 | 대상 상수/파일 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | 조직 구조 데이터화 | `DIV_2/DIV_3`·`ORG_DEFAULT_*`·`_PROJ_DIV_CANON` (index.html) | 본부 N개 가변, 문자열키→`orgUnits[].id` |
| 2 | 관리자/브랜딩 env·settings화 | `seed.js:18`(admin 이메일)·`utils/mailer.js:9-11` | `ADMIN_INITIAL_EMAIL` 신설, 메일/URL은 `settings.branding` |
| 3 | 사업계획 baseline 데이터화 | `SAJEONG_BASELINE`·`TARGET_*`·`BONBU_LABOR_PLAN` | `settings.plan`에서 주입, SG&A 산식 옵션화 |
| 4 | 프로젝트 매핑 일반화 | `KMAP`/`KMAP_PB` | 이름 유사도 매칭 + 확인 UI, projects3 동적화 |
| 5 | 인사·단가·고용형태 | `HQ_PEOPLE_MASTER`·`PEOPLE_SEED`·`empType==='와일리'` | manpower를 SSOT로, 시드 제거, 고용형태 중립코드 |
| 6 | 정적 시드 번들 제거 | `EXEC_FILE_MAP`·`pnl_data.json`·`WOORI_PLAN` | 전부 업로드 기반(execPnLBaseline) |

---

## 4. `version` 낙관적 잠금 (xmin 대체 · 리스크1)

현: GET이 `xmin::text AS ver` 반환, PUT이 `baseVer==xmin`일 때만 UPDATE(409 시 최신 반환) — `routes/data.js:11,69-86`. Postgres 전용 시스템컬럼 의존 제거.

```sql
-- GET /api/data  (tenant 스코프 + RLS)
SELECT payload, version AS ver FROM state WHERE tenant_id = current_setting('app.current_tenant')::uuid;

-- PUT /api/data  (baseVer 일치 시에만)
UPDATE state
   SET payload = $1, version = version + 1, updated_at = NOW(), updated_by = $2
 WHERE tenant_id = current_setting('app.current_tenant')::uuid
   AND version = $baseVer
RETURNING version AS ver;
-- 0행 → 409 Conflict + 최신 payload/ver 반환 (기존 "먼저 저장 우선" 정책 유지)
```
- 경량 폴링 `GET /api/data/ver`도 `xmin` → `version`으로 교체.
- 서버측 완전중복 제거(routes/data.js:36-53)는 그대로.

---

## 5. 격리 강제 흐름 (JWT → 세션 GUC → RLS 2중 방어)

**핵심 규칙: 클라이언트는 `tenant_id`를 절대 전송하지 않는다. 서버가 JWT/서브도메인에서 도출한다.**

### 5.1 토큰·요청 파이프라인
```
{slug}.clubschool.io 요청
  → (a) 서브도메인 slug → tenants.id 해석(캐시)
  → (b) authOptional: JWT 검증(middleware/auth.js). JWT payload에 tenant_id 포함.
        signToken(user) = { id, username, role, tenant_id }   ← 확장
  → (c) 가드: JWT.tenant_id === 서브도메인 tenant_id 아니면 401 (토큰 교차 재사용 차단)
  → (d) req 스코프 DB 트랜잭션마다:
        SELECT set_config('app.current_tenant', $tenantId, true);  -- 트랜잭션 로컬(local=true)
        … 실제 쿼리 …
```
> ⚠ **풀러 주의:** 서버리스 + Supabase Transaction pooler(6543)에서는 세션 GUC가 커넥션 간 누수 위험 → 반드시 `set_config(…, true)`(트랜잭션 로컬) + 쿼리를 같은 트랜잭션(BEGIN/COMMIT)으로 감쌀 것. `db.js` 풀 `max:4`·pooler 필수 조건(06 §2.2)과 함께 관리.

### 5.2 RLS 정책 (DB 최종 방어선)
```sql
ALTER TABLE state           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_state ON state
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
-- users/pending_signups/password_resets 동일 패턴으로 각각 생성.
```
- 앱 계층(tenant-scoped 쿼리) + RLS(정책) = **2중 방어**. 앱 코드에 필터를 빠뜨려도 DB가 차단.
- 마이그레이션/시드 등 관리 작업은 `BYPASSRLS` 롤 또는 `SET app.current_tenant`로 대상 테넌트 지정.
- `tenants`·`login_attempts`는 RLS 미적용(전자는 slug 해석용 공개 최소필드, 후자는 앱 로직이 tenant 키로 스코프).

---

## 6. 기존 데이터 이관 (단일 테넌트 → 첫 테넌트)

현 운영 DB는 `state(id=1)` 단일행 + 전역 users. Phase 1 배포 시 1회 이관:
```sql
-- 1) 첫 테넌트 생성
INSERT INTO tenants(slug, name, plan) VALUES ('conv', '컨버전스', 'pro')
  ON CONFLICT (slug) DO NOTHING;
-- 2) 기존 payload 승계 (id=1 → tenant_id)
INSERT INTO state(tenant_id, payload, version, updated_at, updated_by)
  SELECT (SELECT id FROM tenants WHERE slug='conv'), payload, 1, updated_at, updated_by
  FROM state_legacy WHERE id = 1;   -- 구 테이블 리네임 후
-- 3) 기존 users 전원 이 테넌트로
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug='conv') WHERE tenant_id IS NULL;
```
- 이관 스크립트는 멱등·백업 선행(`SELECT payload FROM state WHERE id=1 > 백업.json`, 06 §5.2) 후 실행.
- 본부(`_divData` 2·3본부)는 이관 후에도 payload 내부 구조라 그대로 동작 → `orgUnits`로의 정규화는 리스크5(점진).

---

## 7. 영향 파일 · 변경 요약

| 파일 | 변경 |
| --- | --- |
| `db.js` | SCHEMA/PATCH에 tenants·tenant_id·version·RLS DDL 추가. 트랜잭션 헬퍼(`withTenant(tenantId, fn)`)로 GUC 설정 |
| `middleware/auth.js` | `signToken`에 tenant_id 포함, `authOptional`이 req.tenantId 세팅 + 서브도메인 일치 가드 |
| `routes/data.js` | GET/PUT을 `withTenant` 트랜잭션으로, `xmin`→`version`, tenant 필터 |
| `routes/auth.js` | 가입/승인/로그인/rate-limit 키에 tenant_id, `sanitizePerms` 재사용 |
| `seed.js` | `ADMIN_INITIAL_EMAIL` env화, 첫 테넌트 생성 + 이관 로직 |
| `utils/mailer.js` | 발신명·LOGIN_URL을 `settings.branding`에서 |
| `public/index.html` | 하드코딩 상수(§3) → 서버가 내려주는 `settings` 소비. 렌더 로직 골격 불변 |
| (신설) `middleware/tenant.js` | 서브도메인 slug→tenant 해석·캐시 |

---

## 8. 완료 게이트 (머지 조건)

- [ ] `npm run type-check`/`lint(--max-warnings 0)`/`build` 통과, 회귀 188개 유지·통과.
- [ ] **테넌트 격리 자동 테스트**: 테넌트 A 토큰으로 B의 `state`/`users`/가입큐 조회 시 **0행**(앱 필터 제거해도 RLS가 차단됨을 별도 케이스로 검증).
- [ ] `version` 낙관적 잠금: baseVer 불일치 PUT → 409 + 최신 반환(동시편집 시뮬).
- [ ] 이관 스크립트 멱등: 재실행해도 중복/손상 없음, 이관 후 기존 대시보드·예측·보고서 동일 렌더.
- [ ] 신규 테넌트 e2e: `tenants`+`state`+`users` 각 1행 생성만으로 빈 대시보드 진입.
- [ ] `settings` 미설정 테넌트도 기본값으로 크래시 없이 렌더(빈/누락 상태 방어).

---

## 9. 다음(Phase 2) 인계 포인트
- 온보딩 마법사 5단계는 이 `settings` 계약(§2)과 최소 데이터 5종(패키징 §5)에 직접 기록. 3·4단계는 검증된 결산 업로드 UX 재사용.
- 화면 정의(`service-planning`): 테넌트 생성·조직/브랜딩·목표 설정·멤버 초대 화면.

> 결정 대기(상위 §8): username 유니크 범위(테넌트별 권고) · slug 정책 · 첫 테넌트 slug('conv' 예시) · RLS 적용 테이블 범위.


---



<!-- ==================== ⑤ Phase 2 온보딩 마법사 화면설계 ==================== -->


# ⑤ Phase 2 온보딩 마법사 화면설계

> 원본 위치: `PROJECT/Convergence_SaaS/02-planning/Phase2-온보딩-마법사-화면설계.md`


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


---



<!-- ==================== ⑥ 창수 과제 정의서(Global-Ready) ==================== -->


# ⑥ 창수 과제 정의서(Global-Ready)

> 원본 위치: `PROJECT/Convergence_SaaS/_과제운영/과제정의서_Converge서비스화_기획설계.md`


# 과제 정의서 — Converge Global-Ready (AI 페어 · 영문 글로벌화)

> 목적: 한국형 Converge SaaS를 **영어권에서도 쓸 수 있게** 기획·설계·개발하는 것을 정식 과제로 운영하고,
> **창수(Troy)가 AI를 페어로 활용해 개발+기획+번역을 관통**하며 경력 실적으로 남긴다.
> 상위: `00-strategy/01_패키징-방안.md`, `01-architecture/Phase1…`, `02-planning/Phase2…`.

> ✅ 확정: 방향 **개발자/종합** · 방법 **AI 페어(Claude 등) 적극 활용** · 커밋 계정 **troyk0725@gmail.com** · 참여 **오너십 + 팀 리뷰**.

---

## 1. 과제 개요

| 항목 | 내용 |
| --- | --- |
| 과제명 | **Converge Global-Ready** (과제 #3의 실행 트랙) |
| 슬러그 | `Converge_Global` |
| 배경 | 제품·문서·UI가 한국어에 결합. 글로벌(영문) 대응은 **실제 개발(i18n) + 도메인 번역 + 시장 기획**이 필요 |
| 목표 | ① 한국형 SaaS를 영문 대응 가능하게 기획·설계·**일부 구현** ② 창수의 **개발·AI 협업 포트폴리오** 확보 |
| 성공 기준 | 한 화면 이상이 **ko/en 토글로 실제 동작** + 도메인 용어집·i18n 설계서 리뷰 통과 + AI 활용 플레이북 완성 |

**컨셉 한 줄:** *"AI를 페어로 삼아, 한국형 SaaS를 영문/글로벌 대응으로 기획·설계·개발한다."*

**왜 이 과제인가:** i18n은 범위 조절이 쉬운 실무 개발(1화면→N화면→N언어) · AI 활용이 자연스러운 핵심(번역·코드·카피 초안을 AI가, 창수는 **도메인 오역을 잡는 검수자**) · 성취가 눈에 보임(EN 렌더 여부) · 번역이 곧 도메인 학습.

---

## 2. 산출물 (D1~D7)

| # | 산출물 | 계열 | AI 역할 | 오너 |
| --- | --- | --- | --- | --- |
| **D1** | 한↔영 **도메인 용어집**(번역 SSOT) | 기획 | 초안 → 창수 검수 | 창수 |
| **D2** | **i18n 설계서**(문자열 외부화·ko/en 리소스·통화/날짜/숫자 로케일·언어전환 UX) | 설계 | 옵션 비교 | 창수 |
| **D3** | **영문 1-pager**(글로벌 포지셔닝·랜딩 카피) | 기획 | 카피 초안 → 검수 | 창수 |
| **D4** | **i18n 스캐폴드 구현**(한 화면 문자열 분리 + `t(key)` + 언어 토글) | 개발 | 코드 생성 페어 | 창수 |
| **D5** | **영문 화면 프로토타입**(EN 렌더, 자체완결 HTML/JS) | 개발 | 코드 생성 페어 | 창수 |
| **D6** | **AI 활용 플레이북**(프롬프트·워크플로우 + AI 오역 검수 사례) | 방법 | (대상) | 창수 |
| **D7** | **경력증빙**(역량 매핑·사인오프·회고·포트폴리오) | 경력 | — | 창수 |

---

## 3. R&R — AI 페어 × 팀 리뷰

```
① 팀(에이전트)  →  골격: 용어 시드·설계 템플릿·개발 스펙·체크리스트
② 창수(Troy)   →  AI를 페어로 초안 생성 → 도메인 검수·구현 → 본인 이름 커밋
③ 팀           →  리뷰: 번역(고지표·기획) · 설계(백연동) · 코드(구동민) · 품질(한도전) → 사인오프
```
- **AI 페어 원칙:** AI가 초안(번역·코드·카피)을 만들고, 창수가 **판단·검수·수정**한다. AI 산출물을 그대로 쓰지 않고 **오역/오류를 잡은 근거를 D6에 기록** = 핵심 역량 증빙.

---

## 4. 일정 · 마일스톤 (3주 기준, 조정 가능)

| Phase | 산출물 | 게이트 |
| --- | --- | --- |
| A 기획/설계 | D1 용어집 → D2 i18n 설계서 | 번역 QA + 설계 리뷰 |
| B 개발 | D4 i18n 슬라이스 → D5 영문 프로토타입 | 동작·검증·일관성 게이트 |
| C 정리 | D3 영문 1-pager + D6 AI 플레이북 + D7 경력증빙 | 한도전 품질 게이트 → 사인오프 |

---

## 5. 경력으로 남기는 메커니즘
- **귀속 커밋**(`troyk0725@gmail.com`) → git 히스토리가 증거.
- **역량 매핑표**(D7): 산출물 → 역량(i18n 개발·글로벌 기획·AI 협업·번역 QA) → 근거파일@커밋.
- **AI 플레이북**(D6): "AI를 어떻게 써서 무엇을 잡았나" = AI 시대 핵심 역량 그 자체.
- 리뷰 사인오프 + 회고.

---

## 6. 리스크 · 전제
| # | 전제 | 리스크 | 완화 |
| --- | --- | --- | --- |
| 1 | AI 번역이 도메인 정확 | 오역(퍼블리싱·본부·진행매출 등) | 창수 검수 필수, D1 용어집을 SSOT로 강제 |
| 2 | i18n 슬라이스 자체완결 가능 | con-mgt 실저장소 미보유 | 자체완결 HTML/JS로, 실통합은 후속 |
| 3 | 주 5~10h | 지연 | Phase B(개발)를 1화면으로 최소화 |

---

## 7. 확정 · 잔여
- ✅ Global-Ready 트랙 · AI 페어 · 개발 포함 · 커밋 계정 확정.
- 잔여(선택): 첫 대상 화면(기본=온보딩 STEP1 또는 코스트 대시보드 헤더) · 언어 범위(기본 ko/en) · 기간.

> 스타터 킷 발행: `창수-워크스페이스/`(README·D1 용어집 시드·D2 설계서·D4-5 개발가이드·D6 플레이북·D7 경력증빙).


---



<!-- ==================== ⑦ 창수 킥오프 안내문 ==================== -->


# ⑦ 창수 킥오프 안내문

> 원본 위치: `PROJECT/Convergence_SaaS/_과제운영/킥오프_안내_창수.md`


# 창수님께 — Converge Global-Ready 과제 킥오프 🚀

안녕하세요, 창수님(Troy). 이번에 맡아주실 과제를 한 장으로 정리했어요.

## 뭘 하는 과제인가
우리 사내 실적관리 도구(con-mgt)를 여러 회사가 쓰는 SaaS **"Converge"** 로 키우는 중인데,
그중 **"영어권에서도 쓸 수 있게 만드는" 파트**를 창수님이 맡습니다.
핵심은 하나예요 — **AI를 페어(짝)로 써서, 한국형 SaaS를 영문으로 기획·설계·개발한다.**

## 왜 창수님에게 좋은가
- 요즘 제일 값나가는 스킬 두 개 — **AI 활용 개발**과 **i18n(다국어) 실무** — 을 한 번에 익힘.
- 결과가 눈에 보임: 화면이 **영어로 도느냐 안 도느냐**.
- 끝나면 포트폴리오에 *"AI로 SaaS를 영문 기획하고 다국어 코드까지 구현"* 한 줄이 **근거(파일+커밋)와 함께** 남음.

## 만들 것 (3단계)
| 단계 | 산출물 |
| --- | --- |
| A 기획 | D1 용어집 검수 → D2 i18n 설계서 |
| B 개발 | D4 다국어 코드(ko/en 토글) → D5 영문 프로토타입 |
| C 정리 | D3 영문 1-pager → D6 AI 플레이북 → D7 경력증빙 |

## 지금 첫 할 일 (딱 이것부터)
`D1_용어집_한영.md`를 열어 **⚠ 표시된 "직역하면 틀리는 용어 12개"를 확정**해 주세요.
AI가 초안을 이미 채워놨으니, 창수님은 **맞는지 검수**하면 됩니다.
> 예: `퍼블리싱`은 Publishing ❌ → **Front-end Markup** ✅ / `본부`는 HQ ❌ → **Division/BU** ✅
>
> 이게 이 과제의 핵심 방식이에요 — **AI가 초안, 창수님이 검수.**

## 일하는 방식
1. 팀이 골격(템플릿·스펙)을 깔아둠 → **이미 준비됨**.
2. 창수님이 **AI 페어로 초안** 만들고 `[작성]`·`[검수]`를 채움.
3. 막히면 리뷰 요청 — 용어=고지표 / 설계=백연동 / 코드=구동민 / 품질=한도전.
4. 본인 이름으로 커밋 → 자동으로 경력 근거가 쌓임.

## 커밋하는 법 (본인 계정으로)
```bash
cd PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/
# 파일 수정 후:
git add D1_용어집_한영.md
git commit --author="Troy(창수) <troyk0725@gmail.com>" -m "Feat: 용어집 오역 위험어 12개 검수 (창수)"
```
> 본인 PC라면 최초 1회: `git config user.name "Troy"; git config user.email "troyk0725@gmail.com"`
> 커밋 하나하나가 `경력증빙_템플릿.md`에 근거로 연결됩니다.

## 어디를 보면 되나
- **시작:** `창수-워크스페이스/README.md`
- **첫 작업:** `창수-워크스페이스/D1_용어집_한영.md`
- **전체 과제:** `과제정의서_Converge서비스화_기획설계.md`

막히면 언제든 편하게 물어봐 주세요. **첫 커밋 기대하고 있을게요!** 🙌


---



<!-- ==================== ⑧ 창수 워크스페이스 안내(README) ==================== -->


# ⑧ 창수 워크스페이스 안내(README)

> 원본 위치: `PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/README.md`


# 창수(Troy) 워크스페이스 — Converge Global-Ready 과제

> 여기는 **창수의 오너십 산출물** 공간. 상위 정의서: `../과제정의서_Converge서비스화_기획설계.md`.
> 컨셉: **AI를 페어로 삼아, 한국형 SaaS를 영문/글로벌 대응으로 기획·설계·개발.**
> 원칙: AI가 초안(번역·코드·카피) → 창수가 **검수·구현·판단** → 팀 리뷰·사인오프 → **본인 이름 커밋**.

## 아웃풋 (D1~D7)

**① 과정 산출물**
| 파일 | 계열 | 상태 |
| --- | --- | --- |
| `D1_용어집_한영.md` | 기획 | 🟡 **AI 시드 완료 → 창수 검수부터 시작** |
| `D2_i18n_설계서_템플릿.md` | 설계 | ⬜ 템플릿 |
| `D4-D5_i18n_개발가이드.md` (→ 코드 산출) | 개발 | ⬜ 가이드 |
| `D3 영문 1-pager` | 기획 | ⬜ (Phase C) |

**② 경력 산출물**
| 파일 | 내용 |
| --- | --- |
| `D6_AI활용_플레이북_템플릿.md` | AI로 뭘 만들고 뭘 잡았나(핵심 역량 증빙) |
| `경력증빙_템플릿.md` | 역량 매핑·사인오프·회고·포트폴리오 |

## 작업 사이클 (산출물 1건당)
1. 팀이 골격(용어 시드·설계 템플릿·개발 스펙)을 둔다.
2. 창수가 **AI 페어로 초안 → 검수/구현**. `[작성]`·`[검수]`를 채운다.
3. 본인 이름으로 커밋 (계정 `troyk0725@gmail.com`):
   ```bash
   git commit --author="Troy(창수) <troyk0725@gmail.com>" -m "Feat: 용어집 검수 v1 (창수)"
   # 본인 로컬이면 최초 1회: git config user.name "Troy"; git config user.email "troyk0725@gmail.com"
   ```
4. 팀 리뷰(고지표·백연동·구동민·한도전) → 보완 → **사인오프**를 `경력증빙_템플릿.md`에 기록.

## 지금 시작 (Phase A)
`D1_용어집_한영.md`를 열어 **⚠ 표시 12개(오역 위험)부터 `[검수]` 확정**. 이어서 D2 설계서.
```bash
cd PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/
# D1 검수 → D2 작성 → (Phase B) D4-D5 개발가이드대로 코드 → (Phase C) D3·D6·D7
```


---



<!-- ==================== ⑨ D1 도메인 용어집(한↔영·번역 SSOT) ==================== -->


# ⑨ D1 도메인 용어집(한↔영·번역 SSOT)

> 원본 위치: `PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/D1_용어집_한영.md`


# D1. 도메인 용어집 (한↔영) — 번역 SSOT · 오너: Troy(창수)

> Converge의 모든 영문화(UI·문서·카피)가 참조하는 **단일 진실 원천**. AI가 초안을 냈고, 창수가 **검수·확정**한다.
> 사용법: `주의/검수` 열의 `[검수]`를 창수가 확정(✅)하거나 수정한다. 빈 행은 AI 페어로 이어서 채운다.
> ⚠ 이 도메인은 **직역하면 틀리는 용어가 많다**(아래 ⚠ 표시). 그걸 잡는 게 이 산출물의 핵심 가치.

## 1. 조직 · 사람

| 한국어 | English (권장) | 구분 | 주의 / 검수 |
| --- | --- | --- | --- |
| 본부 | Division / Business Unit (BU) | 조직 | ⚠ "Headquarters(HQ)" 오역 주의 — 여기선 사업 단위. [검수] |
| 그룹 / 팀 | Team | 조직 | [검수] |
| 직무 | Role | 사람 | [검수] |
| 직급(호칭) | Level / Title | 사람 | Growth Partner/Leader/… 는 고유 → 유지 or 매핑. [검수] |
| 등급(초·중·고·특급) | Grade — Junior / Mid / Senior / Expert | 사람 | 또는 Level 1–4. 회사 관례 확인. [검수] |
| PM | PM (Project Manager) | 직무 | 그대로. |
| 기획 | Planner / Product Planner | 직무 | ⚠ 문맥상 "Service Planner". [검수] |
| 디자인 | Designer | 직무 | |
| 퍼블리싱 | Front-end Markup (Web Publishing) | 직무 | ⚠⚠ "Publishing" 완전 오역 — 한국 웹 관례어(HTML/CSS 마크업). [검수] |
| 개발 | Developer / Engineering | 직무 | |
| 정직원 | Full-time (Internal) | 고용 | ⚠ 코드의 `empType='와일리'` → 중립 `internal`. [검수] |
| 외주 | Subcontractor / External | 고용 | [검수] |

## 2. 인력 운영 (핵심)

| 한국어 | English (권장) | 구분 | 주의 / 검수 |
| --- | --- | --- | --- |
| 맨먼스 (MM) | Man-Month (MM) | 지표 | 1.0 = 한 명 한 달 풀가동. [검수] |
| 가동률 | Utilization Rate | 지표 | ⚠ "Operation rate" 아님. PSA 표준어. [검수] |
| 유휴 | Idle / Bench | 상태 | ⚠ "Leisure/Spare" 아님. [검수] |
| 유휴비용 | Idle Cost / Bench Cost | 금액 | 핵심 가치어 — 신중히. [검수] |
| 투입 | Allocation / Staffing | 액션 | [검수] |
| 철수 | Roll-off | 액션 | ⚠ "Withdrawal" 어색 — HR/PSA선 roll-off. [검수] |
| 투입일 / 철수일 | Start (Join) / End (Roll-off) date | 필드 | |
| 맨파워 | Staffing / Resourcing | 화면 | ⚠ "Manpower"도 통용되나 현대어는 Staffing. [검수] |

## 3. 재무 · 실적 (직역 위험 큼)

| 한국어 | English (권장) | 구분 | 주의 / 검수 |
| --- | --- | --- | --- |
| 실적관리 | Performance / Actuals Management | 도메인 | [검수] |
| 손익 | P&L (Profit & Loss) | 재무 | |
| 진행매출 | Recognized Revenue (POC) | 재무 | ⚠⚠ "Progress sales" 오역. 진행기준(percentage-of-completion) 인식매출. [검수] |
| 발행매출 | Invoiced Revenue / Billings | 재무 | ⚠ 세금계산서 발행 기준. [검수] |
| 계약매출 | Contract Value / Bookings | 재무 | [검수] |
| 매출총이익 (GP) | Gross Profit (GP) | 재무 | |
| 영업이익 (OI) | Operating Profit / Income | 재무 | |
| 판관비 | SG&A | 재무 | Selling, General & Administrative. |
| 직접비 / 간접비 | Direct Cost / Indirect Cost (Overhead) | 재무 | [검수] |
| 인건비 | Labor Cost | 재무 | |
| 매입 (턴키) | Purchase / COGS (Turnkey) | 재무 | [검수] |
| 표준단가 | Standard Rate (bill/cost rate) | 마스터 | [검수] |
| 사업계획 (baseline) | Business Plan / Annual Baseline | 계획 | [검수] |
| 결산 | Monthly Close (Financial Close) | 프로세스 | ⚠ "Settlement" 아님. [검수] |
| 마감월 | Closed Period / Last Closed Month | 상태 | [검수] |
| BEP 캐치업 | Break-even Catch-up | 시나리오 | [검수] |

## 4. 제품 · SaaS

| 한국어 | English (권장) | 구분 | 주의 / 검수 |
| --- | --- | --- | --- |
| 코스트 대시보드 | Cost Dashboard | 화면 | |
| 맨파워 대시보드 | Staffing Dashboard | 화면 | [검수] |
| 승인제 가입 | Approval-based Sign-up | 인증 | [검수] |
| 테넌트 | Tenant | SaaS | |
| 온보딩 | Onboarding | SaaS | |
| 기준 데이터 | Master / Baseline Data | 온보딩 | [검수] |
| 보고자료 (경영회의) | Report (Executive/Board Deck) | 산출물 | [검수] |

## 5. 로케일 표기 규칙 (D2 설계서와 연동)

| 항목 | ko | en | 검수 |
| --- | --- | --- | --- |
| 통화 | ₩ (원) | $ (USD) 또는 표기만 · 환산은 별도 | ⚠ **환산 vs 표기만** 결정 필요. [검수] |
| 숫자 | 1,234만 · 억 단위 | 1,234K / M (단위 체계 다름) | ⚠ "억/만" ↔ "M/K" 로직. [검수] |
| 날짜 | YYYY년 M월 | MMM YYYY / YYYY-MM | [검수] |
| 회계연도 | 1월 시작 가정 | 테넌트별 가변 | [검수] |

---

## 검수 진행 (창수)
- [ ] ⚠ 표시 12개(오역 위험)를 우선 확정
- [ ] 회사 관례어(등급·직급) 확인
- [ ] 통화/숫자 표기 방식 결정 → D2에 반영
- [ ] 빈 행 추가(화면 캡처·매뉴얼에서 미수록 용어 수집)
- [ ] 완료 후 고지표(데이터)·정우선(PO) 리뷰 요청 → D7 사인오프


---



<!-- ==================== ⑩ D2 i18n 설계서(템플릿) ==================== -->


# ⑩ D2 i18n 설계서(템플릿)

> 원본 위치: `PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/D2_i18n_설계서_템플릿.md`


# D2. i18n(다국어) 설계서 (템플릿) — 오너: Troy(창수)

> 목적: Converge를 ko/en으로 대응하기 위한 **문자열 외부화·리소스 구조·로케일 규칙·전환 UX**를 설계.
> `[작성]`을 AI 페어로 초안 → 창수가 결정. D1 용어집을 문자열 값의 SSOT로 사용.

## 1. 문자열 외부화 전략
- 현행: 문자열이 코드에 하드코딩(con-mgt `index.html`, clubschool 컴포넌트). 
- 전략: `t('key')` 헬퍼 + 언어별 리소스 파일. **키 네이밍 규칙** 정의: [작성] 예 `onboarding.company.title`.
- 범위(Phase B): [작성] — 첫 대상 화면 1개의 문자열만(전면 X).

## 2. 리소스 구조 (제안 → 결정)
```
i18n/
  ko.json   { "onboarding.company.title": "회사·조직", ... }
  en.json   { "onboarding.company.title": "Company & Org", ... }
```
- 포맷: [작성] (flat key vs nested) · 누락 키 폴백: [작성] (en 없으면 ko? key?).
- 복수형/변수 치환 필요 여부: [작성] (예 `{count}명` → `{count} people`).

## 3. 로케일 규칙 (D1 §5 확정 반영)
| 항목 | 규칙 결정 |
| --- | --- |
| 통화 | [작성] — 표기만 vs 환산(환율 출처?) |
| 숫자 단위 | [작성] — 억/만 ↔ M/K 변환 로직 |
| 날짜 | [작성] — ko `YYYY년 M월` / en `MMM YYYY` |
| 정렬/문장 | [작성] — 조사 없는 영어 문장 재구성(직역 금지) |

## 4. 언어 전환 UX
- 전환 위치: [작성] (헤더 · 설정 · 온보딩) · 저장: [작성] (localStorage `lang` · 테넌트 설정 · 사용자 프로필).
- 기본 언어 결정: [작성] (브라우저 `navigator.language` · 테넌트 기본).

## 5. 구현 인계 (→ D4)
- `t(key)` 헬퍼 시그니처: [작성] `t(key, vars?)`.
- 대상 화면의 문자열 키 목록(초안): [작성] — D1과 대조해 값 채움.

## 6. 게이트
백연동(설계)·구동민(프론트) 리뷰 — 확장성(N언어)·폴백·로케일 규칙 타당성. → D7 사인오프.


---



<!-- ==================== ⑪ D4·D5 i18n 개발 가이드 ==================== -->


# ⑪ D4·D5 i18n 개발 가이드

> 원본 위치: `PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/D4-D5_i18n_개발가이드.md`


# D4·D5. i18n 개발 가이드 — 한 화면 다국어 구현 + 영문 프로토타입 · 오너: Troy(창수)

> 목표: D1 용어집·D2 설계를 **실제 동작 코드**로. con-mgt가 vanilla JS라 **자체완결 HTML/JS**로 저장소 없이 구현 가능.
> AI 페어: 뼈대·반복 코드는 AI로 생성, 창수는 **키 매핑·검증·동작 확인**을 책임. AI가 넣은 오역/버그를 잡아 D6에 기록.

## 대상 화면 (택1, 기본=온보딩 STEP1)
회사·조직 화면 또는 코스트 대시보드 헤더 — 문자열 10~20개 규모로 시작.

## D4 — i18n 스캐폴드 구현 (`D4_i18n_slice.html` 등)
**구현 스펙**
```js
// 1) 리소스 (D2 구조)
const dict = {
  ko: { "onboarding.company.title": "회사·조직", "btn.next": "다음", /* … */ },
  en: { "onboarding.company.title": "Company & Org", "btn.next": "Next", /* … */ }
};
// 2) 헬퍼
let lang = localStorage.getItem('lang') || 'ko';
const t = (k, v={}) => (dict[lang][k] ?? dict.ko[k] ?? k)
  .replace(/\{(\w+)\}/g, (_, n) => v[n] ?? '');
// 3) 렌더: 모든 텍스트를 t('key')로. 언어 토글 버튼 → lang 교체 → 재렌더.
```
**체크리스트**
- [ ] 대상 화면의 하드코딩 문자열을 **전부** `t(key)`로 치환(누락 0)
- [ ] `en.json` 값이 **D1 용어집과 일치**(진행매출→Recognized Revenue 등)
- [ ] 언어 토글 → 즉시 전환, 새로고침 후 유지(localStorage)
- [ ] 누락 키 폴백 동작(en 없으면 ko 또는 key)

## D5 — 영문 화면 프로토타입 (`D5_en_prototype.html`)
**목표:** D4를 얹어 그 화면이 **영어로 자연스럽게 렌더**되고, 로케일(통화·숫자·날짜) 규칙이 적용되게.
**추가 구현**
- 통화/숫자: D2 결정대로(예 `₩1,234만` ↔ `$…` 또는 표기 규칙) 포맷 함수.
- 날짜: `YYYY년 M월` ↔ `MMM YYYY`.
- (선택) 검증 메시지·빈/오류 상태도 t() 적용.
**체크리스트**
- [ ] EN 화면에 한글 잔존 0(문자열·라벨·에러 포함)
- [ ] 숫자/통화/날짜가 로케일 규칙대로
- [ ] 직역투 문장 없음(D1 뉘앙스 반영) — AI 초안을 창수가 다듬음
- [ ] 콘솔 에러 0, 외부 CDN 없이 열림

## 커밋 (본인 이름)
```bash
git commit --author="Troy(창수) <troyk0725@gmail.com>" -m "Feat: 온보딩 STEP1 i18n 슬라이스 (D4)"
```
## 게이트
구동민(프론트) 리뷰 — 동작·키 커버리지·용어 일치·확장성. → D7 사인오프.

## AI 페어 기록(→ D6)
- 사용한 프롬프트(리소스 생성·번역·포맷 함수)
- AI가 틀린 것(예: "퍼블리싱→Publishing", "본부→HQ") 과 창수의 수정


---



<!-- ==================== ⑫ D6 AI 활용 플레이북(템플릿) ==================== -->


# ⑫ D6 AI 활용 플레이북(템플릿)

> 원본 위치: `PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/D6_AI활용_플레이북_템플릿.md`


# D6. AI 활용 플레이북 (템플릿) — 오너: Troy(창수)

> 목적: "AI를 어떻게 페어로 써서 무엇을 만들고 무엇을 잡았나"를 기록. **AI 시대 개발자 핵심 역량**을 그대로 증빙한다.
> 이 문서 자체가 포트폴리오. `[작성]`을 과제 진행하며 실시간으로 채운다.

## 1. AI를 쓴 작업과 프롬프트
| 작업 | 쓴 도구 | 핵심 프롬프트(요약) | AI 산출 | 창수 조치 |
| --- | --- | --- | --- | --- |
| 용어 번역 초안(D1) | [작성] | [작성] | [작성] | 검수·수정 |
| i18n 리소스 생성(D4) | [작성] | [작성] | [작성] | 키 확인 |
| 영문 카피(D3) | [작성] | [작성] | [작성] | 톤 조정 |

## 2. AI가 틀린 것 → 창수가 잡은 것 (가장 중요)
> 도메인 오역·버그를 잡은 사례. 이게 "검수자 역량"의 증거.

| # | AI 산출(오류) | 왜 틀렸나 | 창수 수정 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 예: 퍼블리싱 → "Publishing" | 한국 웹 관례어(HTML 마크업) | "Front-end Markup" | D1 용어집 |
| 2 | [작성] | [작성] | [작성] | |
| 3 | [작성] | | | |

## 3. 잘 통한 워크플로우 / 함정
- **효과적:** [작성] (예: 용어집을 먼저 주고 번역시키니 일관성↑)
- **함정:** [작성] (예: 문맥 없이 시키면 직역/환각)
- **다음에 이렇게:** [작성]

## 4. 한 줄 결론 (포트폴리오용)
> [작성] 예: "AI로 초안 속도를 N배 올리되, 도메인 검수로 품질을 지키는 페어 방식을 체득."

## 게이트
한도전(품질) 리뷰 — 재현 가능·정직(과장 없음)·검수 사례 구체성. → D7 사인오프.


---



<!-- ==================== ⑬ D7 경력증빙(템플릿) ==================== -->


# ⑬ D7 경력증빙(템플릿)

> 원본 위치: `PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/경력증빙_템플릿.md`


# 경력 증빙 — 창수(Troy) · Converge 서비스화 과제

> 이 파일 하나가 창수의 **경력 산출물**입니다. 산출물이 하나씩 끝날 때마다 채워지고, 과제 종료 시
> 그대로 **이력서·포트폴리오·면접 자료**로 인용됩니다. (근거는 항상 파일 경로 + 커밋 해시로 추적)

---

## 1. 역량 매핑표 (산출물 → 역량 → 근거 → 사인오프)

| 산출물 | 계열 | 증명한 역량 | 근거(파일 @커밋) | 리뷰어 사인오프 | 상태 |
| --- | --- | --- | --- | --- | --- |
| D1 도메인 용어집 | 기획 | 도메인 이해·번역 QA | `D1_용어집_한영.md @______` | 고지표·정우선 · [ ] | 🟡 |
| D2 i18n 설계서 | 설계 | 국제화 설계·시스템 사고 | `D2_i18n_설계서.md @______` | 백연동 · [ ] | ⬜ |
| D4 i18n 슬라이스 | 개발 | 프론트 구현·i18n | `D4_i18n_slice.html @______` | 구동민 · [ ] | ⬜ |
| D5 영문 프로토타입 | 개발 | 로케일·구현 완성 | `D5_en_prototype.html @______` | 구동민 · [ ] | ⬜ |
| D6 AI 활용 플레이북 | 방법 | **AI 협업·검수 역량** | `D6_AI활용_플레이북.md @______` | 한도전 · [ ] | ⬜ |

> 상태: ⬜ 작성 전 · 🟡 작성·리뷰 중 · ✅ 사인오프 완료.

## 2. 리뷰 사인오프 로그 (품질 증빙)

| 일자 | 산출물 | 리뷰어 | 결과(통과/보완) | 핵심 피드백 |
| --- | --- | --- | --- | --- |
| [작성] | S6 | 정우선 | [작성] | [작성] |

## 3. 회고 (KPT — 과제 종료 시 창수 작성)

- **Keep (잘된 것):** [작성]
- **Problem (아쉬운 것):** [작성]
- **Try (다음에 시도할 것):** [작성]
- **습득 역량 한 줄:** [작성]

## 4. 포트폴리오 1-pager (최종 경력 아웃풋 — 이력서에 그대로)

```
[과제] Converge Global-Ready — 한국형 SaaS의 영문/글로벌 대응 (AI 페어 · 기획·설계·개발)
[기간] 20__.__ ~ 20__.__ · [역할] 개발/종합 · AI 페어 프로그래밍 · 팀 협업
[한 줄] AI를 페어로 삼아 한국형 실적관리 SaaS를 영문 대응 가능하게 기획·설계하고 한 화면을 i18n으로 실제 구현.

[기여 · 성과]
- [기획] 한↔영 도메인 용어집 구축: AI 초안의 도메인 오역 __건을 잡아 번역 SSOT 확정
- [설계] i18n 설계서: 문자열 외부화·ko/en 리소스·통화/날짜/숫자 로케일·언어전환 UX
- [개발] 온보딩 화면 i18n 구현: t(key) 헬퍼 + ko/en 토글 실제 동작, 영문 프로토타입 완성
- [AI 협업] AI 활용 플레이북: 프롬프트·워크플로우 + AI 오역/버그 검수 사례 문서화

[증명 역량] i18n 프론트 개발 · 국제화 설계 · 도메인 번역 QA · AI 페어 프로그래밍 · 팀 협업
[근거] github.com/parkh37t/clubschool · _과제운영/창수-워크스페이스/ (troyk0725@gmail.com 커밋 이력)
```

## 5. 사용법
- 산출물 하나 사인오프될 때마다 §1·§2를 즉시 갱신(미루면 근거 추적이 어려움).
- `@______`에는 커밋 해시(`git log --oneline`)를 기입.
- 과제 종료 시 §3·§4를 완성 → 이 파일을 PDF로 내보내면 그대로 포트폴리오.


---
