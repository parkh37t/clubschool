# Wylie AX Office — 오케스트레이터 서버

가상 사무실의 **브리핑 콘솔**에 브리핑(결과·맥락·제약·질문 기준)을 넣으면 → **팀장 에이전트**가 작업 3~8건으로 나눠
→ 12 AI 에이전트(`.claude/agents`)에게 **메시지(hive)** 로 배정 → 산출물마다 **QA 게이트**(pass/fail/error/not_run) →
승인이 필요한 작업은 **재하가 결정할 때까지 멈추고** → 현황판·보고를 남깁니다. 진행은 가상 사무실이 2초마다 그립니다.

> Munder Difflin 식 운영(오케스트레이터 + hive + 사무실 화면)을 와일리 업무용으로 옮긴 것입니다.
> 상태는 전부 `server/hive/` 의 평문 파일에 있습니다(`hive/README.md`). 서버를 재시작해도 남습니다.

## 실행

```bash
cd server
npm install        # Word 변환(docx) 등. claude_code 모드 자체는 의존성이 없다
```

### mock 모드 — 키 없이 배선 확인
```bash
node office-server.mjs          # 산출물은 목업, QA 내용검토는 not_run 으로 정직하게 표시
```

### claude_code 모드 — 이 PC 의 Claude Code 로 실제 실행 (권장)
```bash
claude                          # 한 번 로그인돼 있으면 됨 (Pro·Max·Team 구독)
OFFICE_MODE=claude_code node office-server.mjs      # Windows: $env:OFFICE_MODE="claude_code"; node office-server.mjs
```
API 키가 필요 없고 자격 증명을 코드가 보지 않습니다. 팀장 분해·QA 판정은 `claude -p --json-schema`(도구 없음, 격리),
역할 에이전트는 `claude -p`(Read/Write/Grep/Glob 허용, Bash 차단)로 돕니다. `claude` 가 없으면 **더미로 바꿔 돌리지 않고** 안내만 적고 끝냅니다.

### live 모드 — (구) Agent SDK + API 키
```bash
OFFICE_MODE=live ANTHROPIC_API_KEY=sk-ant-... node office-server.mjs
```
`.env.example` 의 선택 변수: `OFFICE_MODEL`, `OFFICE_MAX_USD`, `OFFICE_MAX_TURNS`, `CLAUDE_BIN`, `OFFICE_APPROVAL_TIMEOUT_MS`.

## 동작 계약 (I/O)

| 엔드포인트 | 용도 |
| --- | --- |
| `GET /office-state.json` | 가상 사무실이 2초 폴링. `{stage, phase, progress, agents, artifact, hive:{tasks, pending, mail, leader}, question}` |
| `POST /api/instruct` | 브리핑 `{title, result, context, constraints[], question_policy, deadline, attachments, gates?}` → 202, 백그라운드 실행. 구 지시(`goal`·`brief`·`gates`)도 받는다(gates = 그 단계 전부) |
| `GET /api/hive` | 작업 원장·승인 큐·메일 이벤트·현황판 |
| `GET /api/inbox/:agent` | 에이전트 inbox (재하의 보고·승인 요청은 `jaeha`) |
| `POST /api/approve` | `{id, decision:"approved"|"rejected", by, reason}` — by·reason 없으면 400 |
| `POST /api/upload` | 파일 첨부(본문=바이트, 헤더 `X-File-Name`). 25MB, `DELIVERABLES/_inbox/` |
| `GET /api/health` | 모드·실행 중 여부·승인 대기 건수 |

## 흐름

```
브리핑 → 팀장 분해(tasks.json) → assign 메시지(inbox/<담당>) → 담당 실행 → result 메시지(inbox/lead)
      → QA 판정(gate) → [승인 필요] approvals.json 에서 대기 → 완료 → 다음 작업 … → 팀장 보고(blackboard.md · inbox/jaeha)
```

- 결과 줄이 비어 있으면 팀장은 나누지 않고 `inbox/jaeha` 에 되묻습니다(`question`).
- 한 번에 작업 1건씩 돕니다(구독 사용량·경합 보호). 선행 작업이 실패·보류면 뒤 작업은 보류로 닫힙니다.
- 승인 대기는 기본 무한(`OFFICE_APPROVAL_TIMEOUT_MS=0`). 가상 사무실 승인 카드 또는 `/api/approve` 로 풉니다.

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `office-server.mjs` | HTTP 서버(상태·브리핑·hive·승인·업로드) |
| `orchestrator.mjs` | 브리핑 1건의 전체 흐름(분해→배정→실행→QA→승인→보고), office-state 갱신 |
| `leader.mjs` | 팀장 — 브리핑 정규화, 분해(mock 규칙 / claude_code 구조화 출력), assign 본문, 보고서 |
| `hive.mjs` | hive 파일 입출력 — 작업 원장·메일함·승인 큐·메모리·이벤트 |
| `qa.mjs` | QA 판정 — 기계 검사 + (claude_code) 고지표 내용 검토, 4값 |
| `claudeCode.mjs` | Claude Code CLI 어댑터(`runStructured`·`runAgent`), 실패 분류 |
| `agentRunner.mjs` | 역할 에이전트 1명 실행(`runTask`: mock / claude_code / live) |
| `roster.mjs` | 명단·스킬·산출물 폴더(단일 원천) |
| `gates.mjs` | 구 G1~G6 매핑(이름·페르소나 표로만 사용) |
| `skills.mjs` | 스킬 지침서 찾기(저장소 → 사용자 폴더 → 동기화 폴더) |
| `docxExport.mjs` | 마크다운 산출물 → Word |
| `state.mjs` | `office-state.json` 읽기/쓰기 |

## 산출물

- `DELIVERABLES/<과제>/<단계>/T-0001_<담당>_<작업>.md` (+ `.docx`), `briefing.json`, `_index.md`(= 보고서).
- 단계 폴더는 SI Lifecycle 의 번호를 따릅니다: `00_sales 01_rfp 02_requirements 03_proposal 04_rebaseline 05_plan 06_design 07_publish 08_test_scenario 09_test_run 10_growth`.
- 앞 산출물은 뒤 작업의 assign 메시지에 경로로 붙어 이어집니다.

## 스킬 연결 (업무 지침서)

각 작업에 맞는 스킬 지침을 서버가 찾아 **에이전트 지시문에 넣습니다**(`<skill>` 태그). 모델을 훈련하는 게 아니라
작업 방법을 쥐여 주는 방식입니다. 역할별 매핑은 `roster.mjs`가 단일 원천입니다(아래 표는 구 게이트 기준 참고).

| 게이트 | 작업(순서대로) | 스킬 |
| --- | --- | --- |
| G1 영업/평가 | 김영업 · 고객·경쟁 조사 | competitor-benchmark |
| | 한도전 · RFP 분석·제안 전략 | rfp-analysis, **wylie-proposal**(없으면 proposal-writing), **wylie-proposal-visual** |
| | 한도전 · 제안 품질 검수 | **wylie-proposal-review** — 이 스킬이 없으면 이 작업은 건너뜀 |
| G2 기획 | 정우선 · PRD 초안 / 나기획 · IA·플로우 | product-strategy, **ba-agent** / ia-flow-design |
| G3 디자인 | 오색감 · 브랜드 / 차도안 · UI 시안 | brand-guideline / design-system-build, ui-review |
| G4 구현 | 이풍뎅 · 인터랙션 (나머지는 스킬 없음) | accessibility-audit |
| G5 검증 / G6 그로스 | 고지표 · QA·지표 / 홍보라 · 런칭 캠페인 | kpi-event-tracking / landing-copywriting |

- **굵게 표시한 사내 스킬**(`wylie-*`, `ba-agent`, `proposal-maker`)은 회사 내부 자산이라 **공개 저장소에 올리지 않습니다**(`.gitignore`).
  각 PC의 `.claude/skills/<이름>/` 에 직접 두거나, Claude 계정 동기화 폴더(`~/.claude/skills/synced/…`)에 있으면 자동으로 씁니다.
  없으면 공용 스킬로 대체되거나 건너뛰고, 그 사실을 로그와 목업 산출물에 남깁니다.
- 이 대시보드 저장소 전용 내용이 담긴 스킬(frontend-implementation·api-design·db-modeling·quality-gate·service-planning)은
  고객 과제에 혼선을 주므로 연결하지 않았습니다.
- 지시문에는 "이번 단계는 마크다운 문서만 작성(PPTX·코드 실행 없음), 질문 대신 가정·미해결로 표시"를 함께 넣습니다.

## 프론트 연결

가상 사무실 뷰는 `components/VirtualOffice/officeBackend.ts`의 `resolveOfficeBackend()`로 이 서버 위치를 정합니다.
- `?api=<주소>` → 그 주소의 서버에 연결(예: PC를 터널로 공개한 주소 — 공개 사이트에서 실제 실행 관람)
- `localhost`(개발) → 같은 오리진. `vite.config.ts` 프록시가 `/office-state.json`·`/api`를 이 서버(8787)로 넘김
- 지정 없는 정적 배포 → 미연결(오피스 자체 데모)

## 보안·비용 주의
- **API 키는 서버(환경변수)에만.** 브라우저/프론트 코드/저장소/채팅에 넣지 않습니다.
- 무인 실행 에이전트는 **문서 읽기·쓰기만** 허용합니다(PC 명령 실행 `Bash` 차단). claude_code 모드도 같습니다.
- 작업 1건마다 **비용 상한(`OFFICE_MAX_USD`)·턴 상한(`OFFICE_MAX_TURNS`)** 이 걸려 있어, 넘으면 그때까지 쓴 내용으로 마감합니다.
  표시되는 비용은 SDK 추정치이며 청구서가 아닙니다 — 실제 사용량은 Anthropic 콘솔에서 확인하세요.
- 업로드한 고객 원본(`DELIVERABLES/_inbox/`, `*/_attachments/`)은 커밋되지 않습니다(`.gitignore`).
- 터널로 공개한 엔드포인트에는 인증이 없습니다. 쓸 때만 켜고, 상시 운영하려면 인증을 앞단에 두세요.
