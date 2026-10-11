# APEX 가상 사무실 — 오케스트레이터 서버

웹 지시 콘솔에 지시를 넣으면 → 이 서버가 **12 AI 에이전트**(`.claude/agents`)를
**G1~G6 게이트 파이프라인**으로 돌려 → 실제 산출물(`DELIVERABLES/<과제명>/`, 마크다운 + Word)을 만들고 →
오피스가 폴링하는 `office-state.json`을 갱신해 실시간 시각화합니다.

> 브라우저는 에이전트를 직접 못 돌립니다(API 키·실행 환경이 없으므로). 그래서 화면 뒤에 이 서버를 둡니다.
> 화면은 지시를 받고 결과를 보여주는 창구, 실제 일은 이 서버가 합니다.
> 쉬운 사용 절차(공개 링크·터널 연결·시작/멈춤)는 저장소 루트의 [`사용안내.md`](../사용안내.md)를 보세요.

## 실행

```bash
cd server
npm install        # 최초 1회 + 코드 갱신(git pull) 후에도 다시. Windows PowerShell은 npm.cmd install
```

### mock 모드 — 키 없이 배선 확인
```bash
node office-server.mjs          # 기본 mock. 목업 산출물로 흐름·스킬 연결·Word 변환을 무료로 확인
```

### live 모드 — 실제 에이전트
```bash
export ANTHROPIC_API_KEY=sk-ant-...      # Windows: $env:ANTHROPIC_API_KEY="sk-ant-..."
OFFICE_MODE=live node office-server.mjs  # Windows: $env:OFFICE_MODE="live"; node office-server.mjs
```
`.env.example`의 선택 변수: `OFFICE_MODEL`(모델 지정), `OFFICE_MAX_USD`(작업 1건 비용 상한, 기본 $2),
`OFFICE_MAX_TURNS`(작업 1건 최대 턴, 기본 40).

## 동작 계약 (I/O)

| 엔드포인트 | 용도 |
| --- | --- |
| `GET /office-state.json` | 오피스가 2초 폴링. 지시 전에는 404 → 오피스 자체 데모 유지 |
| `POST /api/instruct` | `{title, goal, brief, attachments, gates, ts}` → 파이프라인 착수(202 즉시 응답, 백그라운드 실행). 한 번에 1건 |
| `POST /api/upload` | 파일 첨부(본문=파일 바이트, 헤더 `X-File-Name`). 25MB 상한, `DELIVERABLES/_inbox/`에 임시 저장 |
| `GET /api/health` | 서버/모드 상태 확인 |

`office-state.json` 스키마는 `components/VirtualOffice/officeSimulator.ts` 의 `OfficeState` 와 같습니다.

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `office-server.mjs` | HTTP 서버(상태 제공·지시 수신·파일 업로드) |
| `orchestrator.mjs` | 게이트 파이프라인 — 페이즈 전이마다 상태 갱신, 앞 산출물 인계, Word 변환, 비용 합계, 산출물 대장(`_index.md`) |
| `gates.mjs` | G1~G6 ↔ 담당 에이전트·작업·**스킬** 매핑 |
| `skills.mjs` | 스킬(업무 지침서) 찾기·읽기 — 저장소 → 사용자 폴더 → 계정 동기화 폴더 순 |
| `agentRunner.mjs` | 워커 1명 실행 — mock(즉시) / live(Agent SDK). 라이브 지시문 생성(`buildLivePrompt`) |
| `docxExport.mjs` | 마크다운 산출물 → Word(.docx) 변환(Node 전용, Python 불필요) |
| `state.mjs` | `office-state.json` 읽기/쓰기 |

## 스킬 연결 (업무 지침서)

각 작업에 맞는 스킬 지침을 서버가 찾아 **에이전트 지시문에 넣습니다**(`<skill>` 태그). 모델을 훈련하는 게 아니라
작업 방법을 쥐여 주는 방식입니다. 매핑은 `gates.mjs`가 단일 원천입니다.

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

## 산출물

- 작업마다 `DELIVERABLES/<과제명>/G<게이트>_<담당>_<작업>.md` + 같은 이름의 **`.docx`**(고객 제출·공유용 사본).
- **앞 산출물 인계**: 각 작업자는 같은 과제에서 앞서 나온 문서 목록을 받아 Read로 읽고 이어서 씁니다
  (예: G1 검수는 조사·전략 문서를, G2 정우선은 G1 문서 전체를 근거로 삼음).
- `_index.md`에 산출물 목록과(라이브 모드) 예상 비용 합계를 기록합니다. `instruction.json`에 원 지시를 보관합니다.

## 프론트 연결

가상 사무실 뷰는 `components/VirtualOffice/officeBackend.ts`의 `resolveOfficeBackend()`로 이 서버 위치를 정합니다.
- `?api=<주소>` → 그 주소의 서버에 연결(예: PC를 터널로 공개한 주소 — 공개 사이트에서 실제 실행 관람)
- `localhost`(개발) → 같은 오리진. `vite.config.ts` 프록시가 `/office-state.json`·`/api`를 이 서버(8787)로 넘김
- 지정 없는 정적 배포 → 미연결(오피스 자체 데모)

## 보안·비용 주의
- **API 키는 서버(환경변수)에만.** 브라우저/프론트 코드/저장소/채팅에 넣지 않습니다.
- 무인 실행 에이전트는 **문서 읽기·쓰기만** 허용합니다(PC 명령 실행 `Bash` 차단).
- 작업 1건마다 **비용 상한(`OFFICE_MAX_USD`)·턴 상한(`OFFICE_MAX_TURNS`)** 이 걸려 있어, 넘으면 그때까지 쓴 내용으로 마감합니다.
  표시되는 비용은 SDK 추정치이며 청구서가 아닙니다 — 실제 사용량은 Anthropic 콘솔에서 확인하세요.
- 업로드한 고객 원본(`DELIVERABLES/_inbox/`, `*/_attachments/`)은 커밋되지 않습니다(`.gitignore`).
- 터널로 공개한 엔드포인트에는 인증이 없습니다. 쓸 때만 켜고, 상시 운영하려면 인증을 앞단에 두세요.
