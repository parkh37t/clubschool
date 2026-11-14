# Wylie AX Office — 오케스트레이터 서버

가상 사무실의 **브리핑 콘솔**에 브리핑(결과·맥락·제약·질문 기준)을 넣으면 → **팀장 에이전트**가 작업 3~8건으로 나눠
→ 12 AI 에이전트(`.claude/agents`)에게 **메시지(hive)** 로 배정 → 산출물마다 **QA 게이트**(pass/fail/error/not_run) →
승인이 필요한 작업은 **재하가 결정할 때까지 멈추고** → 현황판·보고를 남깁니다. 진행은 가상 사무실이 2초마다 그립니다.

> Munder Difflin 식 운영(오케스트레이터 + hive + 사무실 화면)을 와일리 업무용으로 옮긴 것입니다. 코드는 가져오지 않고
> 운영 방식만 따랐습니다 — 팀장 상주 세션과 입력 대기열, hive 규칙(기억·편지함), "나에게 질문", 서킷 브레이커·예산, 역할 템플릿으로 인원 추가.
> 상태는 전부 hive(기본 `server/hive/`)의 평문 파일에 있습니다(`hive/README.md`). 서버를 재시작해도 남습니다.
> 더블클릭으로 쓰는 설치형 앱은 `desktop/README.md` 를 보세요(앱이 이 서버를 내부에서 띄웁니다).
> 화면·안내·역할 템플릿은 한국어(기본)와 영어 두 벌입니다. 언어는 화면 오른쪽 위에서 바꾸고 `hive/settings.json` 에 남습니다.

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
실행 파일은 부를 때마다 확인합니다 — Claude 데스크톱 앱이 업데이트되면 내장 CLI 폴더(`<버전>\<해시>`)가 바뀌고 옛 폴더가 지워지기 때문입니다.
CLI 를 찾지 못하거나 로그인이 풀려 있으면 브리핑을 시작하지 않고(대기열 '실패' + 안내), 이 환경 문제는 서킷 브레이커에 세지 않습니다.
API 키가 필요 없고 자격 증명을 코드가 보지 않습니다. 팀장 분해·QA 판정은 `claude -p --json-schema`(도구 없음, 격리),
역할 에이전트는 `claude -p`(Read/Write/Grep/Glob 허용, Bash 차단)로 돕니다. `claude` 가 없으면 **더미로 바꿔 돌리지 않고** 안내만 적고 끝냅니다.

### live 모드 — (구) Agent SDK + API 키
```bash
OFFICE_MODE=live ANTHROPIC_API_KEY=sk-ant-... node office-server.mjs
```
`.env.example` 의 선택 변수: `OFFICE_MODEL`, `OFFICE_MAX_TOKENS`, `OFFICE_AGENT_DAILY_TOKENS`, `OFFICE_MAX_TURNS`, `CLAUDE_BIN`, `OFFICE_APPROVAL_TIMEOUT_MS`.

### 환경 변수 (위치·동시 작업)

| 변수 | 기본 | 설명 |
| --- | --- | --- |
| `PORT` | 8787 | 서버 포트 |
| `OFFICE_HOST` | (모든 인터페이스) | 바인딩 주소. 설치형 앱은 `127.0.0.1` |
| `OFFICE_CONCURRENCY` | 2 (최대 3) | 브리핑 안에서 동시에 돌릴 작업 수 |
| `OFFICE_HIVE_DIR` | `server/hive` | 작업 원장·메일함·기억·이벤트 위치. 지정하면 `office-state.json` 도 그 안에 둔다 |
| `OFFICE_DELIVERABLES_DIR` | `<저장소>/DELIVERABLES` | 산출물·첨부 위치. 역할 에이전트가 이 폴더를 작업 폴더(cwd)로 돈다 |
| `OFFICE_DIST_DIR` | `<저장소>/dist` | 함께 내보낼 빌드된 화면 |
| `OFFICE_MAX_TOKENS` | 400000 | 작업 1건 실행의 사용 토큰 한도 기본값(사용 토큰 = 입력 + 캐시 생성 + 출력 + 캐시 읽기÷10). 설정 화면·모니터 탭에서 바꾸면 `settings.json` 값이 우선 |
| `OFFICE_AGENT_DAILY_TOKENS` | 1200000 | 에이전트 1명의 하루 사용 토큰 한도 기본값(80% 제한 · 100% 중지) |
| `OFFICE_MAX_USD` | 2 | `live`(API 키) 모드 전용 — 실제로 청구되는 API 요금의 작업당 상한(달러). claude_code 모드는 쓰지 않음 |
| `OFFICE_MOCK_TOKENS` | 0 | (mock 시험용) 작업 1건이 쓴 것처럼 볼 사용 토큰. 한도보다 크면 '사용량' 승인 카드가 뜬다. 합계에는 넣지 않음 |
| `OFFICE_MOCK_QUESTION` | (없음) | (mock 시험용) `1` 이면 역할 에이전트가 회신에 "재하에게 질문"을 한 줄 넣는다 |
| `OFFICE_MOCK_QA_FAIL` | (없음) | (mock 시험용) `once` 면 첫 실행만 본문이 빈 산출물을 써서 QA FAIL → 보완 재작업은 정상, `always` 면 보완 뒤에도 FAIL |

경로 계산은 `paths.mjs` 한 곳에 있습니다. 원장(`tasks.json`)의 `output`·`docx`, 첨부 경로는 산출물 폴더 기준 상대경로('/' 구분)입니다.

### 화면도 같은 주소로

`npm run build` 로 만든 `dist/` 를 서버가 함께 내보냅니다. `http://127.0.0.1:8787/?view=virtual-office` 에서 화면과 API 가
같은 오리진이 됩니다(`&shell=app` 을 붙이면 대시보드 사이드바 없이 사무실만). Vite 개발 서버(3000)도 그대로 쓸 수 있습니다.

## 동작 계약 (I/O)

| 엔드포인트 | 용도 |
| --- | --- |
| `GET /office-state.json` | 가상 사무실이 2초 폴링. `{stage, phase, progress, agents, artifact, concurrency, hive:{tasks, pending, mail, leader}, question}`. 브리핑 전에는 hive 로 만든 빈 사무실(`idle:true`) |
| `POST /api/instruct` | 브리핑 양식 `{title, result, context, constraints[], question_policy, deadline, attachments, gates?}` → 202 `{queued, position}`. 대기열에 넣고 차례가 오면 실행. 구 지시(`goal`·`brief`·`gates`)도 받는다 |
| `GET /api/queue` · `POST /api/queue` · `DELETE /api/queue/:id` | 팀장 대기열 보기 / 메시지 넣기 `{text}` / 아직 대기 중인 항목 취소. POST·DELETE 는 이 PC 화면에서 온 요청만 |
| `GET /api/questions` · `POST /api/questions/:id/answer` | "나에게 질문" 목록 / 답하기 `{answer, by}`(by 없으면 400). 팀장 질문의 답은 대기열 메시지로, 역할 에이전트 질문의 답은 그 사람 편지함으로 |
| `GET /api/settings` · `POST /api/settings` | 언어·작업당 토큰 한도·하루 토큰 한도·QA 반려 시 자동 보완·동시 작업 수 `{lang, max_task_tokens, agent_daily_tokens, auto_revise, concurrency(1~3)}`. GET 은 지금 쓰는 `deliverables_dir`·`deliverables_default`·`hive_dir`·`running` 도 준다(이 PC 화면이 아니면 사용자 폴더는 `~`). 팀장 세션 id 는 내보내지 않음. POST 는 이 PC 화면에서만이고 산출물 폴더는 바꾸지 않는다 |
| `POST /api/settings/deliverables` | 산출물 저장 위치 바꾸기 `{dir, copy?}` · 기본으로 `{reset:true}` · 검사만 `{check:true, dir}`. 절대경로·hive/앱 폴더와 겹치지 않음·쓰기 시험 통과일 때만. 브리핑이 진행 중이면 409. `copy` 면 지금 폴더 내용을 새 폴더로 복사(덮어쓰지 않음, 예전 폴더는 지우지 않음). 바로 적용되고 `settings.json` 의 `deliverables_dir` 에 남아 다음 시작 때도 쓴다(`storage.mjs`) |
| `GET /api/plan/packs` · `GET /api/plan/packs/:id[?verify=1]` | 기획 탭 — 패키지 상태와 팩 목록(이름·접두·SSOT 5계층 상태·화면 수) / 팩 한 개(화면 레지스트리·파일 유무, `verify=1` 이면 verify_page 결과) |
| `GET /plan-files/<packs\|core>/…` | 2단 화면설계서 뷰어용 — 패키지의 `packs/`·`core/` 아래 화면·자산(html·css·js·json·이미지·글꼴)만. HTML 은 `Content-Security-Policy: sandbox allow-scripts` 로 내보내 화면 스크립트가 이 앱 API 를 같은 오리진으로 부르지 못하게 한다. Host 가 루프백일 때만 |
| `POST /api/settings/plan-kit` | 기획 에이전트 패키지 폴더 `{dir}`(빈 값이면 끔). `scripts/new_screen.py`·`scripts/verify_page.py`·`packs/_template/pack.json`·`core/golden`·`core/template` 이 있어야 함. 이 PC 화면에서만 |
| `POST /api/open` | 이 PC 에서 열기 `{target:'deliverables'\|'hive'}` 또는 `{path, select?}`(산출물 폴더 기준 상대경로). 산출물 폴더 안의 문서·이미지만 기본 앱으로 열고, `select` 면 탐색기에서 그 파일을 고른 채로 폴더를 연다. 실행 파일은 열지 않음. 이 PC 화면에서만 |
| `GET /api/mail?limit=80&agent=` | 대화 탭 — 받은 편지함(`inbox/<사람>/`)·처리한 편지(`.done/`)·아직 옮기지 않은 outbox 의 메시지를 최근순으로 `{messages:[{id, from, to, type, task, ts, body, truncated}]}`. 같은 id 는 한 번만. `agent` 가 있으면 그 사람이 보내거나 받은 것만(없는 사람은 404). 본문은 앞 600자, 자료 울타리 안은 '(첨부 자료 생략)'. 읽기 전용 |
| `GET /api/templates?lang=` · `POST /api/templates` · `DELETE /api/templates/:id` | 브리핑 템플릿 — 기본 6개(코드, 한·영. `lang` 이 없으면 설정 언어) + 사용자 저장(`templates.json`, 최대 30개) / 저장 `{title, result, context?, constraints?}`(과제명·결과 필수) / 사용자 템플릿 삭제(기본은 400, 없으면 404). POST·DELETE 는 이 PC 화면에서만 |
| `GET /api/env` | 환경 점검 `{mode, cli:{found, version, path}, loggedIn, checked_at}` — `claude --version`·`claude auth status` 중 로그인 여부만(계정 메일·조직 정보는 버림). 실행 파일 경로의 사용자 폴더는 `~` 로 줄임. 30초 기억, `?refresh=1` 은 3초에 한 번까지 다시 확인하고 `/api/auth` 기억도 함께 맞춘다 |
| `GET /api/agents/templates` · `POST /api/agents` · `DELETE /api/agents/:id` | 역할 템플릿 12종 / 템플릿으로 인원 추가 `{template, name, name_en}`(최대 6명) / 빼기(진행·대기 작업이 있으면 409). POST·DELETE 는 이 PC 화면에서만 |
| `GET /api/breakers` · `POST /api/breakers/:agent/reset` | 서킷 브레이커 단계 / 재하가 초기화 `{by, reason}`(둘 다 필수) |
| `GET /api/triggers` · `POST /api/triggers` · `POST /api/triggers/:id` · `POST /api/triggers/:id/run` · `DELETE /api/triggers/:id` | 예약 목록 / 추가 `{title, schedule:{kind:weekly\|daily\|once, time:'HH:MM', days?, date?}, briefing:{result, context?, constraints?}}` / 켜기·끄기 `{enabled}`·내용 변경 / 지금 실행 / 삭제. 결과 줄이 없으면 400. 바꾸는 요청은 이 PC 화면에서만 |
| `GET /api/live?task=<id>` · `?stream=lead` · `&after=<n>` | 작업별(또는 팀장 세션) 실시간 기록 줄. `GET /api/live/latest?agent=` 는 그 사람의 가장 최근 작업 기록 |
| `GET·POST /api/pty` · `DELETE /api/pty/:id` · `WS /api/pty/ws?id=` | 대화형 터미널(node-pty) 목록·열기 `{agent}`·닫기, 입출력 WebSocket. 모두 이 PC 화면(Origin 이 127.0.0.1·localhost)에서만 |
| `GET /api/hive` | 작업 원장·승인 큐·메일 이벤트·현황판 |
| `GET /api/inbox/:agent` | 에이전트 inbox (재하의 보고·승인 요청은 `jaeha`) |
| `POST /api/approve` | `{id, decision:"approved"|"rejected", by, reason}` — by·reason 없으면 400 |
| `POST /api/upload` | 파일 첨부(본문=바이트, 헤더 `X-File-Name`). 25MB, 산출물 폴더의 `_inbox/`. 폴더 첨부는 `X-Folder-Id`(묶음)·`X-Rel-Path`(폴더 안 상대경로)를 더 보내 `_inbox/<묶음>/<상대경로>` 에 저장(`..` 조각은 버림) |
| `GET /api/health` | 모드·실행 중 여부·동시 작업 수·승인 대기 건수 |
| `GET /api/roster` | 팀장 + 12인의 이름·역할·스킬(이 PC 에서 쓸 수 있는지)·현재 상태(대기·진행·검수·승인대기)·지금 작업·누적 사용량 |
| `GET /api/memory/:agent` | 에이전트 기억 파일(`memory/<agent>.md`) 내용 |
| `GET /api/events?since=<ISO>` | events.log 증분(since 이후). 없으면 최근 200건 |
| `GET /api/auth` | `claude auth status` 중 `loggedIn` 만(계정 메일·조직 정보는 버림). 1분 기억, `?refresh=1` 로 다시 확인 |
| `POST /api/auth/login` | 새 PowerShell 창에서 `claude auth login`. 이 PC 화면(Origin 이 localhost·127.0.0.1)에서 온 요청만 받음 |
| `GET /api/usage/top` | 화면 위 사용량 막대 — 구독 사용 한도 창(`limits.json`), 오늘 사용 토큰(끝난 작업 + 실행 중), 담당별 하루 한도 대비, 실행 중 작업의 토큰/한도 |
| `POST /api/usage/probe` | 구독 사용 한도 지금 확인 — claude_code 모드·이 PC 화면·1분에 한 번. 작은 호출 1번(사용 토큰 기록) |
| `GET /api/skills/registry` | 문서·제안 스킬 등록부와 이 PC 에서 찾은 위치(저장소·사용자·동기화·플러그인), 고객사 전용 제안 스킬 이름. 경로는 보내지 않음 |
| `GET /api/usage` | 사용 토큰 합계 — 에이전트별·일별·작업별(실행·QA·작업 한도), 네 갈래 합계(`parts`·`parts_today`), 한도 설정값. `usd_ref` 는 API 단가 환산 참고값(청구 아님), `untracked` 는 토큰 기록 전이라 합계에서 빠진 기록 수 |

## 흐름

```
입력창 메시지 → 대기열(queue.json) → 팀장 상주 세션이 하나씩 처리 → [일을 맡긴 메시지면] 브리핑으로 정리해 대기열에 등록
브리핑 → 팀장 분해(tasks.json) → assign 메시지(inbox/<담당>) → 담당 실행(hive 규칙) → result 메시지(inbox/lead)
      → QA 판정(gate) → [승인 필요] approvals.json 에서 대기 → 완료 → 다음 작업 … → 팀장 보고(blackboard.md · inbox/jaeha)
```

### 팀장 상주 세션과 대기열
- 입력창은 두 방식입니다. **메시지**(기본)는 대기열에 들어가 팀장 상주 세션이 한 건씩 받습니다. 진행 상황을 묻거나 일을 맡길 수 있고,
  "결과: …"가 있으면 팀장이 브리핑으로 정리해 대기열에 다시 넣습니다. **브리핑 양식**은 4요소를 직접 채워 바로 대기열에 넣습니다.
- 상주 세션은 `claude -p --resume <세션 id>` 로 이어집니다(id 는 `settings.json`). 팀장은 hive 폴더에서 읽기만 하고 고치지 않습니다.
  세션이 깨지면 새 세션으로 한 번 다시 시도합니다.
- 대기열은 두 줄로 돕니다 — 메시지는 한 번에 1건(팀장 대화형 터미널이 열려 있으면 잠시 멈춤), 브리핑도 한 번에 1건.
  브리핑이 도는 동안 들어온 브리핑은 차례를 기다립니다(예전처럼 409 로 거절하지 않음). 대기 중인 항목은 화면에서 취소할 수 있습니다.

### hive 규칙 — 작업을 시작할 때마다
1. 자기 기억(`memory/<담당>.md`)을 읽고, 2. 재하가 준 답(질문 탭)을 따르고, 3. 편지함의 다른 안 읽은 편지를 자료 울타리 안에서 읽습니다.
4. 읽은 편지는 `inbox/<담당>/.done/` 으로 옮깁니다(이벤트 `inbox_done`). 회신의 "재하에게 질문"은 질문 탭(`questions.json`)에 쌓입니다.

### 서킷 브레이커와 예산
- 연속 문제(실행 실패·QA FAIL·사용 토큰 한도 초과) 1회 **조정**(다음 지시에 주의 메모) → 2회 **제한**(최대 턴·토큰 한도 절반) → 3회 **중지**.
- 하루 사용 토큰 한도 80% 사용이면 제한, 100%면 중지. 정상 완료가 나오면 연속 횟수는 0 으로 돌아가지만 **중지는 재하가 풀어야** 내려옵니다.
- 중지된 사람에게 작업이 가면 그 작업만 멈추고 '재개' 승인 카드가 뜹니다 — 승인하면 단계를 풀고 다시 배정, 반려하면 그 담당 작업 보류.
  모니터 탭의 [초기화]도 같은 일을 합니다(행위자·사유 필수). 상태는 `breakers.json`.
- 작업 1건이 상한을 넘으면 Claude Code 가 그 자리에서 멈추고(`--max-budget-usd`) '비용' 승인 카드가 뜹니다.
  승인하면 상한을 두 배로 올려 이어서 실행, 반려하면 보류.

### 인원 추가(역할 템플릿)
- 템플릿 12종(일정·품질·문서·리서치·카피·콘텐츠·데이터 엔지니어링·보안·모바일·접근성·모션·고객 지원) — 역할·목표·캐릭터·스킬이 한·영 두 벌입니다(`agentTemplates.mjs`).
- 추가한 사람은 `agents.json` 에 남고 팀장 명단에 들어가 다음 브리핑부터 배정받습니다. 사무실 아래쪽 확장 구역에 책상이 생깁니다(최대 6명).

### 예약(트리거)
- 예약 탭에서 매주(요일)·매일·한 번과 시각(PC 현지 시각)을 정하면, 그 시각에 브리핑을 대기열에 넣습니다(`triggers.json`, 최대 20개).
- **앱(서버)이 켜져 있을 때만** 돕니다. 꺼져 있던 동안 지난 예약은 뒤늦게 돌리지 않고 '놓침'으로 남긴 뒤 다음 시각으로 넘깁니다(몰아서 비용이 나가지 않게).
  같은 예약의 브리핑이 아직 대기 중이면 또 넣지 않고 놓침으로 남깁니다. 한 번짜리는 실행(또는 놓침) 뒤 꺼집니다.
- 실행할 때 제목 끝에 날짜를 붙입니다(매주 같은 과제 폴더를 덮어쓰지 않게). 예약을 만든 사람이 브리핑의 요청자(`by`)가 됩니다.

### 폴더 첨부
- 입력창의 [폴더] 또는 폴더 끌어다 놓기. 문서(PDF·Word·한글·엑셀·CSV·PPT·텍스트·JSON·이미지)만 고르고 숨김 폴더·실행 파일은 건너뜁니다(폴더당 최대 40개·200MB, 파일당 25MB).
- 과제 폴더로 복사할 때 `_attachments/<묶음>/<하위 폴더>/<파일>` 구조를 유지하고, 에이전트에게는 그 경로들을 Read 하라고 넘깁니다.

### 실시간 기록과 대화형 터미널
- 역할 실행은 `--output-format stream-json --verbose` 로 돌고, 사건마다 한 줄씩 `live/<작업>.jsonl` 에 쌓입니다(시작·글·도구·결과·QA·완료).
  터미널 탭이 책상별로 1초마다 이어 받아 xterm 에 그립니다.
- [터미널 열기]는 그 사람의 페르소나를 붙인 대화형 Claude Code 를 node-pty 로 엽니다(팀장은 hive 폴더에서 상주 세션을 이어서,
  역할 에이전트는 최근 산출물 과제 폴더에서). 재하가 직접 입력하는 세션이므로 Claude Code 의 평소 권한 확인을 그대로 거칩니다.

- 결과 줄이 비어 있으면 팀장은 나누지 않고 `inbox/jaeha` 에 되묻습니다(`question`).
- **QA 반려 시 1회 자동 보완(reflection)**: 작업이 QA FAIL 이면 같은 담당에게 QA 지적(issues·summary)을 붙여 **한 번만** 다시 실행하고 다시 판정합니다.
  두 번째도 FAIL 이면 지금처럼 실패로 닫습니다. 서킷 브레이커 `qa_fail` 은 최종 결과에서만 1회 셉니다. 보완 실행의 상한은 원래 작업 상한 그대로이고
  두 번 쓴 비용은 `cost_usd`(QA 는 `qa.cost_usd`)에 더해집니다. 작업 레코드에 `revised: 1`·`revise`(지적·요약·앞 산출물)가 남고, 실시간 기록(`k: revise`)·
  events(`kind: revise`)·보고서 표(`보완 1회`)에 표시됩니다. CLI 없음·로그인 풀림·그 밖의 QA 검토 오류(판정 자체가 실패)는 보완하지 않습니다.
  모니터 탭의 [QA 반려 시 1회 자동 보완] 체크박스(`settings.json` 의 `auto_revise`, 기본 켜짐)로 끕니다. 보완 중 사용 토큰 한도로 멈췄다가 승인으로 다시 돌면 지적을 이어 붙이고 더 보완하지 않습니다.
- **QA 기계 검사**: 파일 있음 · 본문이 비지 않음(제목 줄 빼고 20자 이상) · 분량 하한(200자) · 제목(#) · 목업 표시 없음.
  브리핑 결과·제약이나 작업 완료 기준에 짧은 형식 요청('3줄'·'한 줄'·'5문장 이내'·'200자 이내'·'짧게' — 줄·문장 10, 단어 60, 글자 300 이하)이 있으면
  분량 하한·제목 검사는 결과만 남기고 게이트 판정에서 뺍니다(로그에 `(참고)`). 판정에 넣는 검사가 fail 이면 내용 검토가 PASS 여도 FAIL 입니다.
- **작업 풀**: 선행이 끝난 작업을 `OFFICE_CONCURRENCY` 건(기본 2, 최대 3)까지 동시에 돌립니다. 같은 담당자의 작업은 동시에 돌리지 않습니다.
  `tasks.json`·`approvals.json` 쓰기는 `hive.mjs` 의 프로세스 안 잠금으로 한 줄로 세워 서로 덮어쓰지 않습니다.
- 승인 대기는 그 작업만 멈추고 풀 자리를 차지하지 않습니다 — 다른 작업은 계속 돕니다. 기본 무한 대기(`OFFICE_APPROVAL_TIMEOUT_MS=0`).
  커맨드 센터 '승인' 탭 또는 `/api/approve` 로 풉니다.
- 선행 작업이 실패·보류로 끝나면 뒤 작업은 그 자리에서 보류로 닫힙니다.
- 브리핑은 한 번에 1건이고, 나머지는 대기열에서 차례를 기다립니다.
- 같은 제목의 과제 폴더가 이미 있으면 덮어쓰지 않고 `_2`, `_3` … 을 붙여 새 폴더를 만듭니다.
- 서버가 다시 켜지면, 지난번에 돌다 끊긴 작업(대기·진행·검수)은 보류로 닫고 남은 승인 대기는 이어서 지켜봅니다(결정되면 작업 상태만 마감, 보고서는 다시 쓰지 않음).

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `office-server.mjs` | HTTP 서버(상태·브리핑·hive·승인·업로드·명단·기억·이벤트·로그인·사용량) + 화면(dist) 정적 제공 |
| `orchestrator.mjs` | 브리핑 1건의 전체 흐름(분해→작업 풀(배정→실행→QA→승인)→보고), office-state 갱신 |
| `paths.mjs` | 코드·데이터 위치(hive·산출물·화면)의 단일 원천 |
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
| `leaderSession.mjs` | 팀장 상주 세션과 대기열(`queue.json`) — 메시지 처리·브리핑 등록·두 줄 실행 |
| `xlsxExport.mjs` | 마크다운 산출물의 표 → 엑셀(.xlsx, 표 하나 = 시트 하나). 견적 단계처럼 `task.export` 에 xlsx 가 있는 작업만 |
| `skillRegistry.mjs` | 문서·제안 스킬 등록부 — 이름·쓰임새·담당·넣는 방식(지시문/참고)·자동 부착·사용 가능 여부 |
| `settings.mjs` | 언어·작업당·하루 사용 토큰 한도·자동 보완·동시 작업 수·산출물 폴더·기획 패키지·팀장 세션 id(`settings.json`), 서버가 만드는 상태 문구의 한·영 |
| `tokens.mjs` | 사용 토큰 계산(입력·캐시 생성·캐시 읽기·출력 → 한 숫자), 실행 중 스트림 집계(한도 판정), 표기 |
| `breaker.mjs` | 서킷 브레이커(조정·제한·중지)와 하루 토큰 한도 판정(`breakers.json`) |
| `agentTemplates.mjs` | 인원 추가용 역할 템플릿 12종(한·영) |
| `live.mjs` | stream-json 사건 → 실시간 기록 줄(`live/`) |
| `pty.mjs` | 대화형 터미널(node-pty) 세션과 WebSocket 입출력 |
| `triggers.mjs` | 예약 — 다음 실행 시각 계산, 20초마다 확인해 브리핑 대기열에 넣기, 꺼져 있던 동안의 놓침 처리(`triggers.json`) |
| `templates.mjs` | 브리핑 템플릿 — 기본 6개(RFP 검토·제안서 초안·주간 보고·회의록·경쟁사 벤치마킹·화면설계 초안, 한·영)와 사용자 템플릿(`templates.json`, 최대 30개) |

## 산출물

- `<산출물 폴더>/<과제>/<단계>/T-0001_<담당>_<작업>.md` (+ `.docx`), `briefing.json`, `_index.md`(= 보고서). 기본 산출물 폴더는 `DELIVERABLES/`.
- 단계 폴더는 SI Lifecycle 의 번호를 따릅니다: `00_sales 01_rfp 02_requirements 03_proposal 04_rebaseline 05_plan 06_design 07_publish 08_test_scenario 09_test_run 10_growth`.
- 앞 산출물은 뒤 작업의 assign 메시지에 경로로 붙어 이어집니다.

## 제안서 작성 프로세스 (`proposal.mjs`)

결과 줄이 제안서(작성·초안·발표자료)인 브리핑은 팀장의 자유 분해 대신 **표준 제안 프로세스**로 나눕니다(모델 호출 없음).
'제안서 검수'처럼 이미 있는 제안서를 보는 일, RFP 검토만 하는 일은 해당하지 않습니다. 브리핑에 `process: 'free'` 를 주면 쓰지 않고,
`process: 'proposal'` 이면 항상 씁니다.

| # | 단계 | 담당 | 산출 폴더 | 스킬('a|b' = a 없으면 b) | 승인 |
| --- | --- | --- | --- | --- | --- |
| 1 | 제안 조사 — 고객·경쟁·페인포인트 | 김영업 | 00_sales | competitor-benchmark, strategy-proposal-analyzer | |
| 2 | RFP 분석 — 요구·평가 대응표와 Go/No-Go | 한도전 | 01_rfp | rfp-analysis, wylie-proposal\|proposal-writing | **Go/No-Go** |
| 3 | 제안 전략 — 승부 메시지·스토리·목차 | 한도전 | 03_proposal | wylie-proposal\|proposal-writing, proposal-maker | |
| 4 | UX·디자인 제안 섹션 *(화면·서비스 과제일 때)* | 차도안 | 03_proposal | proposal-skills, wylie-proposal-visual\|ui-review | |
| 5 | 성과 지표(KPI) 설계 *(성과·지표 언급 시)* | 고지표 | 03_proposal | kpi-event-tracking | |
| 6 | 장표 구성안·근거표(구조 단계) | 차도안 | 03_proposal | wylie-proposal-visual\|ui-review, wylie-proposal\|proposal-writing | |
| 7 | 제안서 본문(본문 단계) | 한도전 | 03_proposal | wylie-proposal\|proposal-writing, proposal-maker | 견적·인력 수치가 걸리면 **수치확정** |
| 8 | 제안서 검수(정합 단계) | 고지표 | 03_proposal | wylie-proposal-review\|proposal-review | |

- 담당은 한 사람이 하루 토큰 한도를 혼자 넘기지 않게 나눴다(한도전 RFP·전략·본문 3단계, 차도안 UX 섹션·장표 구성안, 고지표 KPI·검수). 고객사 전용 스킬은 2·3·6·7단계에 붙는다.
- 단계별 스킬은 작업 원장(`tasks.json`)의 `skills` 에 남고, 실행기는 이 값이 있으면 담당의 기본 스킬 대신 씁니다. `process: 'proposal'`·`step` 도 함께 남습니다.
- Go/No-Go 승인 전에는 3단계 이후가 시작되지 않습니다(반려하면 보류). 6단계는 3·4·5단계가 모두 끝나야 시작합니다.
- **고객사 전용 제안 스킬** — 사용자 스킬 폴더(`~/.claude/skills`, 동기화 폴더 포함)의 `<고객>-…-proposal` 가운데 브리핑에 그 고객사가 나오면
  (폴더 이름 첫 토큰이나 설명 첫 단어로 맞춤) 제안 문서를 쓰는 단계(2·3·6·7)에 붙습니다. 저장소에는 두지 않습니다(`.gitignore` 의 `.claude/skills/*-proposal/`).
- 사내 제안 스킬이 없는 PC 에서는 저장소의 공용 스킬(`proposal-writing`·`rfp-analysis`·`proposal-review`)로 대체됩니다. 공용 스킬은 사내 방법론을 옮기지 않고 일반 원칙으로 썼습니다.
- `claude_code` 모드에서는 시작 전에 CLI·로그인을 확인하고, 없으면 브리핑을 시작하지 않습니다(분해에 모델을 쓰지 않아도 같은 규칙).

## 표준 기획 프로세스 (`planning.mjs`)

결과 줄이 화면설계·화면 기획·IA·스토리보드·와이어프레임인 브리핑은, 설정에 **기획 에이전트 패키지**(`plan_kit_dir`)가 연결돼 있으면
팀장 분해 대신 아래 6단계로 나눕니다(제안서 브리핑이 먼저 판단됨). 패키지는 이 PC 의 폴더이며 저장소에 두지 않습니다 — 규격 SKILL·린트·검증·골든·팩 템플릿이 들어 있고,
서버는 그 폴더의 `scripts/new_screen.py`·`scripts/verify_page.py`·`scripts/pack_index.py` 를 파이썬으로 부릅니다(역할 에이전트는 명령을 실행하지 않음).

| # | 단계 | 담당 | 서버가 하는 일 | 승인 |
| --- | --- | --- | --- | --- |
| ① | 요구 원장·미확정 목록 | 정우선 | 팩이 없으면 `packs/_template` 복사(nav.config.js 는 빈 구조로) | |
| ② | 작업가이드·규칙·IA 확정안 + 화면 목록 JSON | 나기획 | — | **가이드확정** → 팩 `layers.rules/ia/guide = confirmed` |
| ③ | 2단 화면설계서(앞쪽 화면) | 나기획 | 화면 목록으로 `new_screen.py` 뼈대 생성·등록 → QA 에 verify(L01~L13·V01~V08) | |
| ③ | 2단 화면설계서(뒤쪽 화면) | 표준수 | 같음(화면을 반씩 나눠 두 사람이 동시에) | |
| ④ | 화면설계서 리뷰 | 고지표 | 이번 화면 verify 결과·레지스트리를 지시문에 붙이고 `pack_index.py` 로 목록 페이지 갱신 | |
| ⑤ | 추적 매트릭스·3키 인계 | 정우선 | 같음 | **컨펌** |

- 팩은 브리핑에 `팩: <id>`(영문 소문자·숫자·하이픈)로 고르고, 없으면 시각으로 새로 만듭니다. 브리핑 하나에서 화면은 최대 6개.
- 화면 생성 단계의 QA 는 기계 검사 `spec_verify` 가 fail 이면 FAIL → 위반 목록이 1회 자동 보완의 지적으로 붙습니다. mock 모드에서는 참고로만(required:false).
- 원장(`tasks.json`)에 `process:'planning'`·`step`·`pack`·`slice`·`plan_files`(패키지 기준 화면 경로)가 남습니다.

## 스킬 연결 (업무 지침서)

각 작업에 맞는 스킬 지침을 서버가 찾아 **에이전트 지시문에 넣습니다**(`<skill>` 태그). 모델을 훈련하는 게 아니라
작업 방법을 쥐여 주는 방식입니다. 역할별 매핑은 `roster.mjs`가 단일 원천입니다(아래 표는 구 게이트 기준 참고).

| 게이트 | 작업(순서대로) | 스킬 |
| --- | --- | --- |
| G1 영업/평가 | 김영업 · 고객·경쟁 조사 | competitor-benchmark, strategy-proposal-analyzer |
| | 한도전 · RFP 분석·제안 전략 | rfp-analysis, **wylie-proposal**(없으면 proposal-writing), **wylie-proposal-visual** |
| | 한도전 · 제안 품질 검수 | **wylie-proposal-review**(없으면 proposal-review) |
| G2 기획 | 정우선 · PRD 초안 / 나기획 · IA·플로우 | product-strategy, **ba-agent** / ia-flow-design |
| G3 디자인 | 오색감 · 브랜드 / 차도안 · UI 시안 | brand-guideline / design-system-build, ui-review |
| G4 구현 | 이풍뎅 · 인터랙션 (나머지는 스킬 없음) | accessibility-audit |
| G5 검증 / G6 그로스 | 고지표 · QA·지표 / 홍보라 · 런칭 캠페인 | kpi-event-tracking / landing-copywriting |

- 제안서 브리핑은 위 '제안서 작성 프로세스'의 단계별 스킬이 우선합니다.
- **굵게 표시한 사내 스킬**(`wylie-*`, `ba-agent`, `proposal-maker`, `proposal-skills`, `strategy-proposal-analyzer`, 고객사 전용 `*-proposal`)은 회사 내부 자산이라 **공개 저장소에 올리지 않습니다**(`.gitignore`).
  각 PC의 `.claude/skills/<이름>/` 에 직접 두거나, Claude 계정 동기화 폴더(`~/.claude/skills/synced/…`)에 있으면 자동으로 씁니다.
  없으면 공용 스킬로 대체되거나 건너뛰고, 그 사실을 로그와 목업 산출물에 남깁니다.
- 이 대시보드 저장소 전용 내용이 담긴 스킬(frontend-implementation·api-design·db-modeling·quality-gate·service-planning)은
  고객 과제에 혼선을 주므로 연결하지 않았습니다.
- 지시문에는 "이번 단계는 마크다운 문서만 작성(PPTX·코드 실행 없음), 질문 대신 가정·미해결로 표시"를 함께 넣습니다.

## 프론트 연결

가상 사무실 뷰는 `components/VirtualOffice/officeBackend.ts`의 `resolveOfficeBackend()`로 이 서버 위치를 정합니다.
- `?api=<주소>` → 그 주소의 서버에 연결하고 브라우저에 기억(다음부터 `?api` 없이도 연결). `?api=off` 로 지움
- `localhost`(개발) → 같은 오리진. `vite.config.ts` 프록시가 `/office-state.json`·`/api`를 이 서버(8787)로 넘김
- 기억해 둔 주소 → 공개 사이트의 "PC 서버 주소" 칸에 넣은 값
- 지정 없는 정적 배포 → 미연결(오피스 자체 데모)

### 공개 사이트(GitHub Pages)에서 PC 서버 보기

서버는 PC 에서 돌고, 화면은 `https://parkh37t.github.io/clubschool/?view=virtual-office` 로 봅니다.
브라우저(https)가 PC 의 `localhost:8787` 에 직접 닿을 수 없으므로 PC 를 https 주소로 공개하는 단계가 하나 필요합니다.

```
start-ax-office.cmd   ← 저장소 루트에서 더블클릭(또는 powershell -ExecutionPolicy Bypass -File start-ax-office.ps1)
```
1. `server/office-server.mjs` 를 `OFFICE_MODE=claude_code` 로 새 창에 띄움
2. cloudflared 임시 공개 주소(`https://xxxx.trycloudflare.com` → `localhost:8787`)를 새 창에 띄움(없으면 winget 설치를 물어봄 — 계정 불필요)
3. `https://parkh37t.github.io/clubschool/?view=virtual-office&api=https://xxxx.trycloudflare.com` 을 출력·복사·브라우저로 엶

공개 주소는 켤 때마다 바뀝니다. 사이트가 주소를 브라우저에 기억하므로, 바뀌면 "PC 서버 주소" 칸에 새 주소만 넣으면 됩니다.
산출물·hive 는 여전히 PC 의 `DELIVERABLES/`·`server/hive/` 에 쌓이고, 사이트는 그걸 보여 주기만 합니다.
공개 주소에는 인증이 없으니 쓸 때만 켜고 끝나면 창을 닫습니다.

## 보안·비용 주의
- **API 키는 서버(환경변수)에만.** 브라우저/프론트 코드/저장소/채팅에 넣지 않습니다.
- 무인 실행 에이전트는 **문서 읽기·쓰기만** 허용합니다(PC 명령 실행 `Bash` 차단). claude_code 모드도 같습니다.
- 작업 1건마다 **사용 토큰 한도(설정 화면 · 기본 `OFFICE_MAX_TOKENS`)·턴 상한(`OFFICE_MAX_TURNS`)** 이 걸려 있습니다. claude_code 모드는 앱이 스트림의 토큰을 세다
  한도에서 끊고 '사용량' 승인 카드를 띄우며, 에이전트별 하루 토큰 한도를 넘으면 서킷 브레이커가 그 사람을 중지합니다. 사용량은 구독 사용 토큰이며 금액으로 청구되지 않습니다.
  표시되는 비용은 CLI 추정치이며 청구서가 아닙니다 — 실제 사용량은 Anthropic 콘솔에서 확인하세요.
- 설정·대기열·인원 추가·브레이커 초기화·터미널처럼 상태를 바꾸는 API 는 이 PC 화면(Origin 이 127.0.0.1·localhost)에서 온 요청만 받습니다.
  대화형 터미널은 공개 주소(터널)로는 열리지 않습니다.
- 업로드한 고객 원본(`DELIVERABLES/_inbox/`, `*/_attachments/`)은 커밋되지 않습니다(`.gitignore`).
- 터널로 공개한 엔드포인트에는 인증이 없습니다. 쓸 때만 켜고, 상시 운영하려면 인증을 앞단에 두세요.
