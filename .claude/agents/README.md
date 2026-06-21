# 클럽스쿨 — 12인 디지털 프로덕트 조직 (Subagents)

`.claude/agents/`에 정의된 12개 서브에이전트로 영업부터 마케팅까지 한 제품을 만드는
디지털 에이전시 조직을 모델링합니다. 각 에이전트는 역할 경계가 분명하며, 정해진
핸드오프로 산출물을 다음 단계에 넘깁니다.

## 생성된 파일 목록
1. `handojeon-sales-lead.md`
2. `kim-sales-support.md`
3. `jung-wooseon-po.md`
4. `na-service-planner.md`
5. `cha-ui-designer.md`
6. `oh-brand-designer.md`
7. `pyo-publisher.md`
8. `lee-interaction-publisher.md`
9. `baek-backend-developer.md`
10. `gu-frontend-developer.md`
11. `go-data-analyst.md`
12. `hong-marketer.md`

## 역할 요약표
| 라인 | 에이전트 | 이름 | 핵심 책임 | 경계(넘기는 일) |
| --- | --- | --- | --- | --- |
| 영업·평가 | `handojeon-sales-lead` | 한도전 | RFP 분석·수주 판단·제안 전략·품질 평가 | 조사→김영업, 제품전략→정우선 |
| 영업·평가 | `kim-sales-support` | 김영업 | 고객·시장·경쟁 조사, 페인포인트 정리 | 최종 영업 판단→한도전 |
| 기획 | `jung-wooseon-po` | 정우선 | 문제정의·MVP·우선순위·로드맵 | 화면 상세→나기획 |
| 기획 | `na-service-planner` | 나기획 | IA·플로우·화면설계·정책·예외 | 우선순위→정우선 |
| 디자인 | `cha-ui-designer` | 차도안 | 제품 UI·디자인 시스템·컴포넌트 | 브랜드 정체성→오색감 |
| 디자인 | `oh-brand-designer` | 오색감 | 브랜드 콘셉트·로고·컬러·톤앤매너 | 제품 UI→차도안 |
| 퍼블리싱 | `pyo-publisher` | 표준수 | 시맨틱 마크업·반응형·기본 접근성 | 인터랙션/심화→이풍뎅 |
| 퍼블리싱 | `lee-interaction-publisher` | 이풍뎅 | 모션·마이크로 인터랙션·접근성 심화 | 기본 마크업→표준수 |
| 개발 | `baek-backend-developer` | 백연동 | API·DB·인증·보안·로그 | 화면 구현→구동민 |
| 개발 | `gu-frontend-developer` | 구동민 | 컴포넌트·상태·API 연동·폼 | 서버/DB→백연동 |
| 데이터 | `go-data-analyst` | 고지표 | KPI·로그·퍼널·리텐션·실험 | 캠페인 실행→홍보라 |
| 마케팅 | `hong-marketer` | 홍보라 | 세그먼트·포지셔닝·카피·캠페인 | KPI·분석→고지표 |

## Agent 간 협업 흐름
```
[영업·평가]
 김영업 ──조사 자료──▶ 한도전 ──수주 확정──▶ 정우선(PO)
                                   │
[기획]                             ▼
 정우선 ──MVP/우선순위──▶ 나기획 ──화면설계서──┐
                                              ├─▶ 차도안(UI)
[디자인]                                      ├─▶ 백연동(API/DB 요구)
 오색감 ──브랜드 가이드──▶ 차도안             └─▶ 구동민(화면 상태/기능)
 차도안 ──컴포넌트 명세──▶ 표준수 ──마크업──▶ 이풍뎅(인터랙션/접근성)
                                              │
[개발]                                        ▼
 백연동 ──API 명세──▶ 구동민 ◀──퍼블리싱 산출물── 표준수/이풍뎅
                         │
[데이터·마케팅]          ▼
 구동민/백연동 ──로그·이벤트──▶ 고지표 ──성과 기준──▶ 홍보라
 고지표 ──개선 인사이트──▶ 정우선        오색감 ──캠페인 비주얼──▶ 홍보라
```

## Claude Code 호출 예시

**조직 전체 워크플로우(체인) 실행**
```
클럽스쿨 방식으로 이 RFP를 분석해줘.
먼저 handojeon-sales-lead와 kim-sales-support가 영업 관점에서 정리하고,
jung-wooseon-po가 제품 전략을 잡은 뒤,
na-service-planner가 IA와 화면 범위를 도출해줘.
마지막으로 각 Agent의 산출물을 한 표로 통합해줘.
```

**단일 에이전트 호출**
```
@jung-wooseon-po
이 서비스 아이디어를 기준으로 문제 정의, MVP 범위, 기능 우선순위, 로드맵을 작성해줘.
```
```
@na-service-planner
정우선 PO의 MVP 정의를 기준으로 IA, 사용자 플로우, 화면 목록, 기능정의서를 작성해줘.
```
```
@baek-backend-developer
나기획의 기능정의서를 기준으로 API 명세서, ERD 초안, 인증 정책, 에러 코드를 설계해줘.
```
```
@cha-ui-designer
나기획의 화면설계서와 오색감의 브랜드 가이드를 기준으로 컴포넌트 명세와 상태별 UI를 정리해줘.
```

## 스킬 (.claude/skills) — 에이전트별 매핑
**공통/워크플로우 스킬**: `rfp-analysis`, `proposal-writing`, `product-strategy`,
`service-planning`, `ui-review`, `api-design`, `frontend-implementation`, `quality-gate`

**역할 특화 스킬** (이번에 추가):
| 스킬 | 용도 | 주 사용 에이전트 |
| --- | --- | --- |
| `competitor-benchmark` | 경쟁사 비교 매트릭스·시사점 | 김영업 |
| `ia-flow-design` | IA/User Flow → 화면 목록 | 나기획 |
| `design-system-build` | 토큰·컴포넌트 시스템 구축 | 차도안 |
| `brand-guideline` | BX 가이드(로고/컬러/톤) 산출 | 오색감 |
| `accessibility-audit` | WCAG 접근성 점검 | 이풍뎅 |
| `db-modeling` | ERD/스키마/정합성 설계 | 백연동 |
| `kpi-event-tracking` | KPI·이벤트 로그 설계 | 고지표 |
| `landing-copywriting` | 랜딩/캠페인 카피 | 홍보라 |
