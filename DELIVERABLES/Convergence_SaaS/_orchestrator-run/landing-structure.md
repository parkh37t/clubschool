# Converge(가칭) 영문 글로벌 랜딩 1-Pager — 정보구조·메시지 설계

> 작성: 나기획(서비스기획) · 대상: 차도안(UI 디자인)·홍보라(마케팅 카피 확정)·구동민(퍼블리싱/구현) 인수인계용
> 형식: 한국어 설명 + 영문 카피(초안) 병기. **영문 카피는 헤드라인·서브의 "요지 초안"**이며, 최종 마케팅 문구 확정은 홍보라, 비주얼/타이포/컴포넌트 확정은 차도안 소관입니다.

## 0. 근거 문서 및 반영 원칙

| 근거 파일 | 반영 내용 |
| --- | --- |
| `PROJECT/Convergence_SaaS/00-strategy/01_패키징-방안.md` | 제품 정의(코스트+맨파워+예측+보고서 가치 루프), 에디션(Starter/Pro/Enterprise+AI 애드온), End-State(멀티테넌트 셀프서브·`{slug}.converge.io`), "보고서 무제한" 킬러 기능 |
| `PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/D1_용어집_한영.md` | 전 영문 카피의 용어 SSOT. **Man-Month, Utilization Rate(Operation rate 아님), Idle/Bench Cost, Recognized Revenue(POC), Division/BU(Headquarters 아님), Roll-off, Monthly Close(Settlement 아님)** 등 오역 주의 항목 전부 준수 |

보조 참고(교차 확인용, 지시 대상 파일은 아님): `00-strategy/GTM-가격.md`(포지셔닝·차별화 3대 축·기존 국문 랜딩 카피 초안), `00-strategy/제품전략-MVP-로드맵.md`(3대 손실 정의 원문). 두 문서와 패키징 방안 사이에 **에디션 체계 불일치**(GTM: Free/Pro/Business/Enterprise 좌석과금 vs 패키징 방안: Starter/Pro/Enterprise+AI 애드온, 좌석+조직단위)가 있어, 본 문서의 Pricing teaser는 **지시된 근거 파일(패키징 방안)의 에디션 체계를 기준**으로 하고 구체 가격 숫자는 넣지 않습니다(§6, 미해결 항목으로 별도 명시).

---

## 1. 포지셔닝 번역 결정 사항 (글로벌 랜딩 특유 판단)

국문 포지셔닝("한국형 맨먼스·본부/그룹·승인 프로세스")을 영문 글로벌 랜딩에 **직역하지 않습니다.** 근거:

- 글로벌 방문자에게 "Korean-style"은 그 자체로 셀링 포인트가 아님. 대신 **"Lite PSA"** 카테고리 포지셔닝(무겁고 비싼 Kantata·Mavenlink류 PSA 대비 가벼운 대안)을 전면에 세우고, Man-Month/Division·Team/Utilization Rate 같은 **용어집 표준 도메인 언어**는 "한국적 특수성"이 아니라 "PSA 업계 표준을 정확히 구현했다"는 신뢰 신호로 재구성합니다.
- **미해결(결정 필요, PO/마케팅 확인):** ① 글로벌 타깃이 신규 해외 시장인지, 해외거점 보유 한국계 조직(디아스포라) 인지에 따라 Hero 톤이 달라집니다 — 본 문서는 전자(순수 글로벌 신규 세그먼트) 가정으로 초안 작성. ② 통화/숫자 표기(D1 §5, `₩ vs $` 미확정)는 랜딩 카피에서 **구체 통화 기호를 하드코딩하지 않고** "in real currency" 식 중립 표현으로 처리(§2 Hero, §6 Pricing teaser 참고). 확정 시 전체 치환 필요.

---

## 2. 정보구조 — 스크롤 순서 · 전환 흐름

```
[Sticky Header: Logo · Product · Pricing · Start Free(CTA, 항상 노출)]
        │
   1. Hero            ── Attention:  정체성·대상·핵심가치 5초 전달 + 1차 CTA
        ↓ scroll
   2. Problem (3 losses) ── Agitate: "우리 얘기다" 공감 유발, 손실 3종 병렬 제시
        ↓ scroll
   3. Solution (3 pillars) ── Solve: 문제 → 해결 전환, 왜 우리 구조가 다른지
        ↓ scroll
   4. Key Features     ── Prove: 3 pillar를 구체 기능/화면으로 증거화(스캔형)
        ↓ scroll
   5. Social Proof (placeholder) ── Trust: 신뢰 보강(로고·수치는 확보 후 교체)
        ↓ scroll
   6. Pricing Teaser    ── Bridge: 가치 → 가격 연결, 저부담 진입점 제시
        ↓ scroll
   7. Final CTA         ── Convert: 전환 완결, 마찰 최소화 재확인
```

- **구조 논리**: PAS(Problem-Agitate-Solve) + AIDA 결합 — Hero(Attention/Interest) → Problem(Agitate) → Solution(Desire 형성) → Features(근거 보강) → Social Proof(신뢰) → Pricing(가격 저항 해소) → CTA(Action).
- **전환 설계 포인트**
  - Hero와 Final CTA 두 곳에만 CTA를 두지 말고, **Sticky Header에 "Start Free" 상시 노출**(스크롤 이탈 방지).
  - Problem 섹션 끝에는 CTA를 넣지 않음(아직 설득 전 단계 — 너무 이른 전환 요청은 이탈 유발).
  - Pricing teaser는 **가격표 전체를 노출하지 않고** "형태만" 보여준 뒤 "See full pricing →"로 별도 페이지 유도(1-pager의 정보 과부하 방지, 가격 페이지에서 세그먼트별 상세 설득).
  - 모바일 스크롤 기준 섹션 순서는 데스크톱과 동일(1-pager 특성상 분기 없음). 각 섹션은 자체적으로 완결된 카드형 블록으로 설계해 모바일에서 세로 스택 시에도 의미 손실 없도록 함(비주얼 상세는 차도안 소관).

---

## 3. Hero

| 항목 | 내용 |
| --- | --- |
| 목적 | 5초 내 "이게 무엇인지 / 누구를 위한 것인지 / 핵심가치가 뭔지" 전달 + 1차 CTA 노출. 방문자의 80%가 여기서 이탈 여부를 결정하는 구간 |
| 헤드라인(초안, EN) | **"Know Who's Idle. Know What It's Costing You. In 5 Minutes."** |
| 대안 헤드라인(초안, EN) | "The Lite PSA That Turns Utilization Into a Number Your CFO Understands." |
| 서브카피(초안, EN) | "Converge is a Lite PSA for project-based teams of 20–200 people — Man-Month allocation, Utilization Rate, and Idle Cost in one live dashboard. No heavyweight PSA rollout. No spreadsheets. Self-serve setup in 5 minutes." |
| 한국어 요지 | "누가 유휴(Idle)인지, 그게 얼마짜리 손실인지 5분 안에 안다"는 즉시성+금액 각성이 핵심 훅. 대안 헤드라인은 재무 언어 번역 가치를 전면에 세운 버전(A/B 테스트 후보로 홍보라 인계) |
| 비주얼 힌트 | 대시보드 목업 1장(Staffing Dashboard + Cost Dashboard 병치 크롭), 상단에 KPI 카드 강조(Utilization Rate %, Idle Cost 금액 카드에 빨간/주황 강조), 그 아래 1차 CTA 버튼 `[Start Free]` + 보조 마이크로카피 "No credit card required" |
| 용어 매핑(D1) | Utilization Rate(가동률, "Operation rate" 아님) · Idle Cost(유휴비용) · Man-Month(맨먼스) — 전부 D1 §2 원문 채택 |

---

## 4. Problem — 3 Losses

| 항목 | 내용 |
| --- | --- |
| 목적 | 방문자가 "이건 우리 회사 얘기다"라고 인식하게 만드는 공감 구간. 손실 3종을 병렬 카드로 제시해 스캔 가능하게 |
| 근거 | `제품전략-MVP-로드맵.md` §1 손실 정의(맥락 참고), 도메인 용어는 D1 준수 |

**Loss 1 — 실시간 가시성 부재**
- 헤드라인(EN): "You Find Out Who Was Idle — After the Month Already Closed."
- 서브(EN): "Bench time and over-allocation stay invisible until Monthly Close. By then, the Idle Cost has already eaten into margin."
- 한국어 요지: 유휴/과투입이 사후(월말/결산 시점)에야 드러남 → 유휴비용이 마진을 이미 깎은 뒤

**Loss 2 — 느린 투입 의사결정**
- 헤드라인(EN): "New Projects Get Staffed by Who's Available — Not Who's Right."
- 서브(EN): "Utilization Rate, remaining Man-Month capacity, and Standard Rate live in different spreadsheets, so staffing decisions default to gut feel."
- 한국어 요지: 투입 근거(가동률·맨먼스 여력·표준단가)가 흩어져 있어 "일단 되는 사람" 배정으로 귀결

**Loss 3 — 재무와 단절된 가동률**
- 헤드라인(EN): "Utilization Sits in a Spreadsheet. Idle Cost Never Reaches the P&L."
- 서브(EN): "A Utilization Rate is just a percentage until someone converts it into money. Most teams never make that conversion — so leadership never sees the real cost."
- 한국어 요지: 가동률(%)이 유휴비용(금액)으로 환산되지 않아 경영진 언어(P&L)로 보고되지 못함

| 비주얼 힌트 | 3열 카드(아이콘: 시계/물음표/단절된 화살표), 각 카드 상단에 짧은 "before" 스크린샷 느낌의 엑셀 캡처(흐릿하게) — Solution 섹션의 "after" 대시보드 캡처와 시각적으로 대구를 이루도록 설계 권장(차도안 협의) |
| 용어 매핑(D1) | Idle/Bench(유휴), Allocation/Staffing(투입), Man-Month(맨먼스), Utilization Rate(가동률), Standard Rate(표준단가), P&L(손익), Monthly Close(결산, "Settlement" 아님) |

---

## 5. Solution — 3 Pillars

GTM 문서의 "차별화 3대 축"을 패키징 방안의 실제 제품 구조(가치 루프·에디션)와 결합해 재구성.

**Pillar 1 — Domain-native staffing model**
- 헤드라인(EN): "Man-Month, Division/Team, Target Utilization — Modeled the Way Project Organizations Actually Run."
- 서브(EN): "Not a generic resource calendar. Converge is built around Man-Month allocation, Division/Team rollups, and target Utilization Rate tracking — the vocabulary project-based organizations already use."
- 한국어 요지: 범용 리소스 캘린더가 아니라 맨먼스·본부(Division)/팀 롤업·목표 가동률 추적이 네이티브 구조

**Pillar 2 — Utilization translated into finance language**
- 헤드라인(EN): "Every Utilization Rate Becomes an Idle Cost Number Your Finance Team Already Speaks."
- 서브(EN): "Converge multiplies Utilization Rate by Standard Rate and work calendar to auto-calculate Idle Cost and Labor Cost — so the dashboard your PM reads is the same number your CFO reads."
- 한국어 요지: 가동률×표준단가×근무캘린더 = 유휴비용/인건비 자동 환산 (패키징 방안 가치 루프의 핵심 킬러 기능인 "보고서" 락인과 직결)

**Pillar 3 — Self-serve setup, minutes not months**
- 헤드라인(EN): "Sign Up, Import Your Team, See Your Idle Cost — No Sales Call, No Implementation Project."
- 서브(EN): "Create your workspace, bring in your Division structure and roster, and reach your first Utilization/Idle Cost dashboard in about 5 minutes — with a one-click demo dataset if you want to look before you commit."
- 한국어 요지: 셀프서브 가입(`{slug}.converge.io`) + 5종 최소 온보딩 데이터 + 데모 원클릭 주입(패키징 방안 §5·§10 End-State 흐름 근거)

| 비주얼 힌트 | 3열 아이콘 + 1줄 카피(스캔형), 하단에 실제 화면 캡처 3종을 나란히: ① 그룹/본부 롤업 뷰 ② Idle Cost 카드가 강조된 Cost Dashboard ③ 온보딩 위저드 스텝바(진행률 표시) |
| 용어 매핑(D1) | Division/BU(본부, "Headquarters" 아님), Team(그룹/팀), Utilization Rate, Idle Cost, Standard Rate(표준단가), Labor Cost(인건비), Tenant/Onboarding(SaaS 표준어 그대로) |

---

## 6. Key Features

목적: 3 Pillar를 "말"이 아니라 "기능 목록"으로 증거화. 스캔 가능한 그리드 형태. **정직성 게이트**(GTM-가격.md 경고) 반영 — 아직 로드맵/베타 단계 기능은 배지로 명시하고 확정 약속처럼 쓰지 않음.

| # | 기능(EN) | 티어/성숙도 | 한국어 요지 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | **Staffing Dashboard** — Man-Month & Utilization Rate by member, Team, Division, live | Starter 이상 (Core, 완성) | 구성원/팀/본부별 맨먼스·가동률 실시간 집계 | 패키징 방안 §3 가치 루프 |
| 2 | **Cost Dashboard** — Idle Cost & Labor Cost auto-calculated from Standard Rate | Starter 이상 (Core, 완성) | 표준단가 기반 유휴비용·인건비 자동 산출 | 패키징 방안 §3 |
| 3 | **Allocation workflow** — draft → review → approved, with Roll-off tracking | Starter 이상 (Core, 완성) | 투입 승인 상태기계(초안→검토→승인)와 철수 추적 | D1 §2 (Allocation/Staffing, Roll-off) |
| 4 | **12-month forecast + Break-even Catch-up scenario** (Sales/Staffing/Project 3-lever) | Pro 이상 (Reports, 완성) | 미래월 예측 + BEP 캐치업 시나리오(3레버) | 패키징 방안 §3 가치 루프 |
| 5 | **One-click Reports** — Board Deck (PPTX) + tracker Excel, **unmetered / unlimited** | Pro 이상 (Reports, 완성) | 보고서는 미터링 없이 무제한 생성(핵심 락인 기능) | 패키징 방안 §3 "핵심 락인 = 보고서" |
| 6 | **AI narrative & anomaly explanation, natural-language query** `(Beta / Roadmap)` | Enterprise + AI Add-on (LLM, Phase 3) | 자연어 질의·이상감지 설명·자유양식 엑셀 자동매핑 — 초안은 사람이 승인 | 패키징 방안 §3 AI 3티어 구조 |
| 7 | **On-premise / dedicated DB, SSO (SAML/OIDC)** `(Enterprise)` | Enterprise | 온프레미스/전용 DB, SSO 연계 | 패키징 방안 §3·§4 |

- **배지 원칙**: 5번까지는 실선 체크(완성/제공 중), 6·7번은 "Beta" 또는 "Enterprise" 배지를 붙여 **과대약속 금지**(GTM-가격.md 정직성 게이트 원칙 그대로 계승).

| 비주얼 힌트 | 7개 카드 그리드(모바일 2열/데스크톱 3~4열), 아이콘 + 1줄 설명 + 상태 배지 칩. "Unlimited"는 별도 강조 배지(예: 초록 pill) |
| 용어 매핑(D1) | Roll-off(철수), Standard Rate(표준단가), Break-even Catch-up(BEP 캐치업), Report/Board Deck(보고자료), Tenant(테넌트) |

---

## 7. Social Proof (Placeholder)

| 항목 | 내용 |
| --- | --- |
| 목적 | 신뢰 보강 구간이나, **현재 고객 로고·정량 성과 수치 확보 전** — 과장 없이 자리만 확보하고 톤을 낮춘 "검증 근거" 문구로 대체 |
| 카피(초안, EN) | "Built on a calculation engine already running a real 56-person delivery division — Division/Team rollups, Utilization Rate, and Idle Cost, live." |
| 보조 카피(EN) | "Customer logos and pilot metrics will replace this section after our first pilots close." |
| 한국어 요지 | 실제 고객사 로고/성과 수치는 없으므로, "이미 56명 조직 운영에서 검증된 계산 엔진"이라는 사실 기반 근거만 제시. 정량 성과(예: "Idle Cost 00% 절감")는 파일럿 확보 전까지 **넣지 않음**(패키징 방안·GTM 공통 원칙: 과장 금지) |
| 비주얼 힌트 | 로고 스트립 자리에 회색 placeholder 박스 5~6개("Logo" 텍스트) + 인용구 카드 자리 1~2개(placeholder, "Customer quote — TBD after pilot") — 실제 자산 확보 시 이 자리에 교체만 하면 되도록 컴포넌트 설계(차도안 인계 시 명시) |
| 리스크 | 이 섹션이 비어 보이면 신뢰도가 오히려 떨어질 수 있음 → 최소한 "검증 근거" 카피 1줄은 반드시 노출하고, 완전한 빈 섹션으로 두지 않을 것 |

---

## 8. Pricing Teaser

| 항목 | 내용 |
| --- | --- |
| 목적 | 전체 가격표를 노출하지 않고 "구성 형태"만 보여줘 가격 저항을 낮추고 별도 가격 페이지로 유도. 무료 시작 가능함을 확실히 전달 |
| 근거 에디션 체계 | `01_패키징-방안.md` §3: **Starter / Pro / Enterprise + AI 애드온** (GTM-가격.md의 Free/Pro/Business/Enterprise 좌석과금 체계와 **불일치** — 최종 확정 전까지 본 랜딩에는 **구체 가격 숫자 표기하지 않음**, §9 미해결 참조) |

**티어 티저 카피(초안, EN)**

- **Starter** — "For one team getting started"
  - "Staffing + Cost Dashboard, Monthly Close upload, basic reports."
- **Pro** — "For divisions running the whole org"
  - "Everything in Starter, plus 12-month forecast, Break-even Catch-up, automated alerts, and the full Report suite — unlimited."
- **Enterprise** — "For regulated & large organizations"
  - "Everything in Pro, plus on-premise / dedicated DB, SSO, custom brand deck templates, and the LLM AI tier."
- 공통 하단 강조: **"Reports are never metered — on every plan."**

| 한국어 요지 | 보고서 무제한이라는 킬러 차별점을 3개 티어 공통 하단에 반복 노출해 "락인 가치"를 가격 저항 앞에서 먼저 각인. 구체 금액/좌석 단가는 표기하지 않고 "See full pricing"로 상세 페이지 유도 |
| CTA(보조) | `[See full pricing →]` (가격 상세 페이지 링크) |
| 비주얼 힌트 | 3열 카드(Starter/Pro/Enterprise), 체크마크 리스트 짧게(4~5줄), 가격 숫자 자리는 상세페이지에서만 노출("Custom" 또는 링크 형태로 대체), "Unlimited Reports" 배지를 3개 카드 공통 하단에 통일 배치 |
| 용어 매핑(D1) | Monthly Close(결산), Break-even Catch-up(BEP 캐치업), Report(보고자료) |

---

## 9. Final CTA

| 항목 | 내용 |
| --- | --- |
| 목적 | 마지막 전환 완결. 마찰 요소(카드 등록, 영업 상담) 없음을 재확인시켜 이탈 직전 방문자를 전환 |
| 헤드라인(EN) | **"Start Free — See Your Idle Cost in 5 Minutes."** |
| 서브(EN) | "No credit card. No sales call. Import your Division and roster, and see the number that's been hiding in your spreadsheets." |
| CTA 버튼 | 1차: `[Start Free]` / 2차(저관여 대안): `[Explore With Sample Data]` |
| 한국어 요지 | Hero와 동일한 "5분·금액 각성" 훅을 마지막에 재확인, 카드 불필요·영업상담 불필요를 명시해 저마찰 재확인 |
| 비주얼 힌트 | 배경색을 페이지 다른 섹션과 대비되게(예: 브랜드 프라이머리 톤 블록), 대시보드 미니 프리뷰 1장, 버튼 아래 "No credit card required" 마이크로카피 |
| 용어 매핑(D1) | Idle Cost(유휴비용) |

---

## 10. 용어 준수 체크 (D1 대조표)

| 랜딩 카피에 쓴 영문 | D1 근거 | 오역 방지 확인 |
| --- | --- | --- |
| Man-Month | D1 §2 | 그대로 채택 |
| Utilization Rate | D1 §2 | "Operation rate" 사용 금지 확인 — 미사용 |
| Idle / Bench, Idle Cost | D1 §2 | "Leisure/Spare" 사용 금지 확인 — 미사용 |
| Allocation / Staffing | D1 §2 | 투입 |
| Roll-off | D1 §2 | "Withdrawal" 사용 금지 확인 — 미사용 |
| Division / Business Unit (BU) | D1 §1 | "Headquarters(HQ)" 사용 금지 확인 — 미사용(본부) |
| Team | D1 §1 | 그룹/팀 |
| Standard Rate | D1 §3 | 표준단가 |
| Labor Cost | D1 §3 | 인건비 |
| Monthly Close | D1 §3 | "Settlement" 사용 금지 확인 — 미사용(결산) |
| Break-even Catch-up | D1 §3 | BEP 캐치업 |
| P&L | D1 §3 | 손익 |
| Report (Board Deck) | D1 §4 | 보고자료 |
| Tenant / Onboarding | D1 §4 | 그대로 채택 |

> **주의(차도안·홍보라 인계 시 재확인 요청)**: D1 문서 자체가 "AI 초안 → 창수 검수 대기" 상태(⚠ 12개 오역 위험 항목 미확정, D1 하단 검수 체크리스트 참조). 위 대조표는 D1의 "권장" 열을 그대로 채택한 것이며, **창수의 최종 검수(✅) 완료 전까지는 확정 카피로 배포하지 말 것.**

---

## 11. 핸드오프

```md
## 핸드오프: 기획(나기획) → 디자인(차도안) / 마케팅(홍보라)
- 완료한 것:
  - 랜딩 1-pager 정보구조(7섹션 스크롤 순서·전환 흐름) — 본 문서 §2
  - 섹션별 목적·영문 헤드라인/서브 초안·비주얼 힌트 — 본 문서 §3~9
  - 영문 도메인 용어 D1 대조표 — 본 문서 §10
- 결정 사항:
  - 포지셔닝은 "한국형" 직역이 아니라 "Lite PSA" 카테고리 포지셔닝으로 재구성(§1)
  - Pricing teaser는 패키징 방안(Starter/Pro/Enterprise+AI 애드온) 체계를 기준으로 하고 구체 금액은 미표기(§8)
  - Social proof는 실제 로고/수치 확보 전까지 사실 기반 문구 1줄 + placeholder로 구성(§7)
  - Key Features는 완성/베타/엔터프라이즈 배지로 정직성 게이트 반영(§6)
- 미해결/리스크:
  - 글로벌 타깃이 신규 해외 세그먼트인지 한국계 디아스포라 조직인지 — Hero 톤 재설계 필요할 수 있음(§1)
  - 통화/숫자 표기 방식(₩ vs $, 억/만 vs K/M) 미확정 — D1 §5, 확정 시 전체 카피 재검토
  - GTM-가격.md와 패키징 방안의 에디션/과금 체계 불일치 — PO(정우선) 확인 후 Pricing teaser 갱신 필요
  - D1 용어집 자체가 창수 검수 미완료 상태(⚠ 12개 항목) — 카피 최종 확정 전 재확인 필수
  - Social proof의 정량 지표(예: Idle Cost 절감률)는 파일럿 확보 후 삽입
- 다음 단계 권장 작업:
  1. (차도안) 본 정보구조 기반 와이어프레임/비주얼 시안 — §3~9 "비주얼 힌트" 우선 반영
  2. (홍보라) 헤드라인/서브 초안을 최종 마케팅 카피로 확정, A/B 후보(Hero 대안 헤드라인 등) 검증
  3. (정우선) 에디션/가격 체계 불일치 해소 — GTM-가격.md vs 패키징 방안 조정
  4. (창수) D1 용어집 ⚠ 12개 항목 검수 완료 → 본 문서 §10 재검증
- 영향받는 파일/타입: 신규 산출물(코드 타입 영향 없음). 참조 문서: `PROJECT/Convergence_SaaS/00-strategy/01_패키징-방안.md`, `PROJECT/Convergence_SaaS/_과제운영/창수-워크스페이스/D1_용어집_한영.md`, `PROJECT/Convergence_SaaS/00-strategy/GTM-가격.md`
```
</content>
