# Wylie AX Office 3단계 작업 지시서 — 설치형 앱(Munder Difflin 구조)

작성 2026-11-08 · 요청 박재하 본부장 · 대상: 이 저장소에서 작업하는 Claude Code

1·2단계는 클라우드 대화 세션에서 구현했고, 3단계는 이 PC의 Claude Code에서 이어서 진행함. 이 문서는 그 대화의 결정 사항, 현재 상태, 다음 작업을 모두 담은 인수인계본임. 이 문서와 `CLAUDE.md` §8이 서로 다르면 재하에게 먼저 알리고 진행할 것.

## 0. 시작 순서

1. 이 문서 → `CLAUDE.md` §8 → `server/README.md` → `.claude/agents/leader.md` 순서로 읽을 것
2. `git status`, `git log --oneline -3`으로 상태를 확인하고, 2장과 다르면 재하에게 먼저 알릴 것
3. 이 문서를 추가한 커밋이 원격에 없으면 `git push origin ax-office`로 먼저 올릴 것
4. **1차만 진행할 것.** 2·3차는 재하가 1차 결과를 확인한 뒤 진행함
5. 차수가 끝날 때마다 6장 형식으로 보고하고 커밋·푸시할 것

## 1. 목표와 범위

Munder Difflin(오픈소스 Electron 데스크톱 앱, 9장 참고)과 같은 화면 구조로, Wylie AX Office를 더블클릭으로 쓰는 Windows 설치형 앱으로 만듦. 와일리 규칙(브리핑 4요소, QA 판정 4값, 승인 게이트, 12인 역할)은 그대로 유지함. 지금은 서버를 PowerShell로 직접 켜야 하고, 작업이 한 번에 1건씩만 돌고, 일하는 모습을 실시간으로 볼 수 없음 — 이 세 가지를 해소하는 것이 3단계의 목적임.

| 영역 | Munder Difflin | Wylie AX Office |
|---|---|---|
| 왼쪽 | 픽셀 사무실 | 기존 가상 사무실(`officeSimulator.ts`) 유지 |
| 오른쪽 | Command Center 탭(terminal·monitor·tasks·ask me·triggers·memory·graph·activity·skills) | 커맨드 센터 탭 — 작업·승인·기억·활동·스킬(1차), 터미널·모니터(2차), 예약·관계도(3차) |
| 오른쪽 아래 | 메시지 입력(files·folder·voice) | 기존 브리핑 콘솔(파일 첨부 포함). 폴더 첨부는 3차 |
| 하단 | 에이전트 카드 + add agent | 팀장 + 12인 카드(1차), 인원 추가(3차) |
| 앱 | 설치형, 트레이, auto mode | 설치형(NSIS), 트레이, 자동 진행 |

범위에서 뺄 것
- 기획 에이전트(요구사항 → 화면설계서 생성) 기능을 새로 만들지 않음. 기존 'AX 기획 에이전트' 메뉴(con-ai 연결)처럼 외부 도구를 불러 쓰는 방식만 둠
- 외부 인터넷 공개(터널 등)는 재하의 명시 요청 없이 만들지 않음
- 공개 사이트 반영(`master` 병합, `docs/` 재빌드)은 재하 확인 후

## 2. 현재 상태 (2026-11-08 기준)

| 항목 | 상태 |
|---|---|
| 브랜치 | 작업 브랜치 `ax-office`. `master`에는 1·2단계가 병합되지 않아 GitHub Pages는 옛 화면임 |
| 1단계 | 팀장 분해·hive·메일함·승인 게이트·QA 판정·claude_code 모드. 2026-10-11 이 PC에서 실제 실행 확인(브리핑 1건 → 작업 4건, 2건 산출·QA CONDITIONAL 후 재하 지시로 중단) |
| 2단계 | 사이드바 'AX 에이전트', 'AX 기획 에이전트' 메뉴와 서브 메뉴(con-ai iframe), 공개 사이트용 'PC 서버 주소' 칸 |
| 미커밋 파일 | `server/hive/blackboard.md`(시험 실행 기록), `DELIVERABLES/` 아래 시험 산출물 폴더 2개(고객사 내용 — **커밋 금지**), `ax-office-3.bundle`(필요 없음) |
| hive 실행 데이터 | `server/hive/tasks.json` 등에 10-11 시험 기록이 남아 있음(T-0003이 '진행'으로 멈춤). 새 시험 전에 `server/hive/_archive-20261011/`로 옮겨 둘 것. 지우지 말 것 |
| Claude Code CLI | PATH에 없음. Claude 데스크톱 앱 내장본 `%APPDATA%\Claude\claude-code\<버전>\<해시>\claude.exe`(현재 2.1.317)를 `server/claudeCode.mjs`가 자동으로 찾음. claude.ai 계정 로그인 방식이며 API 키 없음 |
| 실행 모드 기본값 | 코드(`office-server.mjs`)는 `OFFICE_MODE`를 주지 않으면 `mock`으로 뜸. `CLAUDE.md` §8에 "기본 claude_code"로 잘못 적혀 있던 것을 이번에 바로잡았음. 설치형 앱은 `claude_code`를 명시해 띄울 것 |

## 3. 지금 구조

```
server/
  office-server.mjs  HTTP(PORT, 기본 8787, 현재 모든 인터페이스에 바인딩)
                     GET  /office-state.json · /api/health · /api/hive · /api/inbox/:agent
                     POST /api/instruct(브리핑) · /api/approve {id,decision,by,reason} · /api/upload
  orchestrator.mjs   runBriefing: 첨부 복사 → 팀장 분해 → readyTasks를 1건씩 실행 → QA → 승인 대기 → 보고
  leader.mjs         normalizeBriefing · decompose(claude_code 구조화 호출, 실패 시 규칙 분해) · assignBody · buildReport
  agentRunner.mjs    runTask: mock | claude_code(역할 페르소나 + 스킬, 산출물은 DELIVERABLES/<과제>/<단계>/) | live
  qa.mjs             judge: 기계 검사 4종 + 고지표 내용 검토 → PASS / CONDITIONAL / FAIL
  claudeCode.mjs     runStructured(-p --json-schema, 도구 없음, 빈 임시 폴더) · runAgent(Read·Write·Edit·Grep·Glob만)
  hive.mjs           tasks.json · approvals.json · inbox/outbox · memory · events.log 읽기/쓰기 (HIVE_DIR = server/hive 고정)
  roster.mjs         팀장 + 12인 명단·스킬·단계 폴더의 단일 원천
components/VirtualOffice/
  VirtualOfficeView.tsx  헤더 · 브리핑 콘솔 · 되물음/승인 카드 · 작업판 · PC 서버 주소
  officeSimulator.ts     SVG 픽셀 엔진, applyHive(봉투 비행·피드·산출물)
  officeBackend.ts       백엔드 주소 결정(?api → localhost 상대경로 → 저장값 → 미연결)
```

환경 변수: `OFFICE_MODE`(mock | claude_code | live), `PORT`, `CLAUDE_BIN`, `OFFICE_MODEL`, `OFFICE_MAX_TURNS`, `OFFICE_MAX_USD`, `OFFICE_APPROVAL_TIMEOUT_MS`(기본 0 = 승인까지 무한 대기)

작업마다 `tasks.json`에 `cost_usd`(역할 실행)와 `qa.cost_usd`(QA)가 기록됨 — 재하 구독 사용량을 금액으로 환산한 값임.

## 4. 1차 작업 — 설치형 앱 + 커맨드 센터 + 에이전트 카드 + 동시 작업

### 4-1. 데이터 위치 분리
- hive와 산출물 위치를 환경 변수로 바꿀 수 있게 함: `OFFICE_HIVE_DIR`(기본 `server/hive`), `OFFICE_DELIVERABLES_DIR`(기본 저장소 `DELIVERABLES`)
- 설치형 앱에서는 `문서\Wylie AX Office\hive`와 `문서\Wylie AX Office\산출물`을 씀. 설치 폴더는 쓰기 권한이 없기 때문임

### 4-2. 동시 작업
- `orchestrator.mjs`의 1건씩 도는 루프를 작업 풀로 바꿈. `OFFICE_CONCURRENCY` 기본 2, 최대 3
- 같은 담당자의 작업은 동시에 돌리지 않음. 선행 작업(`depends_on`)이 끝나야 시작함
- 승인 대기는 해당 작업만 멈추고, 다른 작업은 계속 진행함
- **먼저 할 것**: `tasks.json`·`approvals.json`은 읽고-고치고-쓰는 구조라 동시에 쓰면 서로 덮어씀. `hive.mjs`에 프로세스 안 잠금(쓰기 직렬화)을 넣은 뒤 풀을 붙일 것
- `officeState()`의 stage·phase·agents가 여러 작업의 동시 진행을 보여 주도록 정리함

### 4-3. 서버 보강
- `office-server.mjs`가 빌드된 화면(`dist/`)도 함께 내보내도록 함. `http://127.0.0.1:8787/`에서 화면과 API가 같은 주소가 되므로 `officeBackend.ts`의 localhost 분기로 그대로 연결됨
- 설치형 앱으로 실행할 때는 `127.0.0.1`에만 바인딩함
- 새 API
  - `GET /api/roster` — 팀장·12인의 이름·역할·스킬·현재 상태
  - `GET /api/memory/:agent` — 에이전트 기억 파일 내용
  - `GET /api/events?since=<ISO>` — events.log 증분
  - `GET /api/auth` — `claude auth status` 결과 중 `loggedIn`만 돌려줌
  - `GET /api/usage` — 작업·QA `cost_usd` 합계(에이전트별·일별)

### 4-4. 화면
- 오른쪽 커맨드 센터 탭: 작업 / 승인 / 기억 / 활동 / 스킬. 기존 작업판과 승인 카드는 탭 안으로 옮김
- 하단 에이전트 카드: 팀장 + 12인. 이름·역할·상태(대기·진행·검수·승인대기)·지금 하는 작업·누적 사용량. 카드를 누르면 사무실에서 그 책상을 강조하고 기억·활동 탭을 그 에이전트로 거름
- 브리핑 콘솔은 오른쪽 아래(Munder Difflin의 메시지 입력 자리)로 옮김
- Claude 로그인이 풀려 있으면 상단 배너 + [로그인] 버튼. 버튼은 새 PowerShell 창에서 `claude.exe auth login`을 실행함(브라우저 승인 후 코드를 같은 창에 붙여 넣는 대화형이라 창을 따로 띄워야 함)
- 기존 톤 유지: 한국어 UI, 포인트 보라 `#6A4C9C`, 진한 `#43306B`, 틴트 `#EFEAF7`

### 4-5. Electron 앱
- `desktop/` 폴더 신설. main 프로세스가 office-server를 자식 프로세스(Electron 내장 Node, `ELECTRON_RUN_AS_NODE=1`)로 띄우고, 창에서 `http://127.0.0.1:8787/?view=virtual-office`를 엶
- 단일 실행(두 번째 실행 시 기존 창을 앞으로), 창 닫기는 트레이로 숨김
- 트레이 메뉴: 열기 / 산출물 폴더 열기 / Windows 시작 시 실행(켜기·끄기) / 종료. 종료 시 서버와 claude 자식 프로세스를 모두 정리함
- 패키징: electron-builder, NSIS 설치 파일, 결과물은 `release/`. 앱 이름 'Wylie AX Office'. 포함 대상: `server/`, `dist/`, `.claude/agents`, `.claude/skills`
- 스크립트: `npm run desktop:dev`(개발 실행), `npm run desktop:build`(설치 파일 빌드)
- 코드 서명은 하지 않음. 설치 시 Windows SmartScreen 경고가 뜰 수 있다는 점을 README에 적을 것

### 4-6. 1차 완료 기준
- 설치 파일 실행 → 시작 메뉴 'Wylie AX Office' → PowerShell 없이 창이 뜸
- 짧은 브리핑 1건(작업 2~3건)으로 팀장 분해 → 2명 동시 진행 → QA 판정 → 승인 카드 → 보고서까지 화면에서 확인됨
- 창을 닫아도 트레이에서 계속 진행되고, 트레이 '종료' 후 claude 자식 프로세스가 남지 않음
- 로그인이 풀린 상태에서 배너와 로그인 버튼이 뜸
- `npm run type-check` 오류 수가 기존(43건, 모두 기존 파일)보다 늘지 않음. 바꾼 파일은 eslint 경고 0, `npm run build` 통과

## 5. 2·3차 작업 (1차 확인 후)

2차 — 실시간 보기·모니터
- 역할 실행을 `--output-format stream-json --verbose`로 바꿔 진행 이벤트(읽은 파일·쓴 파일·도구 호출)를 받고, 책상별 실시간 기록으로 보여 줌(xterm.js 패널)
- [터미널 열기]: node-pty로 해당 작업 폴더에서 대화형 Claude Code 세션을 열어 직접 입력함. node-pty는 Electron용 재빌드(@electron/rebuild)가 필요하므로, 설치가 막히면 실시간 기록 보기만 두고 재하에게 알릴 것
- 모니터 탭: 에이전트별·일별 사용량. 작업당 상한(`OFFICE_MAX_USD`)을 넘으면 그 작업을 멈추고 승인 카드로 올림

3차 — 예약·관계도·입력 확장
- 예약 탭: 정해진 시각에 브리핑을 자동 실행(예: 매주 월요일 09:00 주간보고). `hive/triggers.json`에 저장하고, 앱이 켜져 있을 때만 실행함
- 관계도 탭: 작업 선후관계(`depends_on`)와 진행 상태를 그래프로 보여 줌
- 폴더 첨부: 폴더를 고르면 안의 문서를 첨부로 넣음
- 음성 입력은 만들지 않음. Electron에서는 브라우저 기본 음성 인식이 동작하지 않으므로 Windows 음성 입력(Win+H)을 안내함
- 인원 추가: `roster.mjs`에 역할을 추가하는 화면

## 6. 보고 형식

차수마다 재하에게 아래 네 가지와 화면 캡처 1~2장을 보고함.
- 완료 기능
- 실행 방법
- 검증 결과 — pass / fail / error / not_run. 돌리지 않은 검사는 not_run으로 적고 통과로 적지 않음
- 남은 제한

## 7. 지켜야 할 것

- 와일리 규칙: `CLAUDE.md` §8 전체(브리핑 4요소, hive 단일 진실, 상태 분리, 승인 게이트, 자료 울타리, 회신 형식)
- 사용량: claude_code 실행은 재하의 구독 사용량을 씀. 화면·배선 시험은 `OFFICE_MODE=mock`으로 하고, 실제 실행 시험은 작업 2~3건짜리 짧은 브리핑으로 하되 실행 전에 재하에게 알릴 것
- 커밋: `<타입>: <한국어 요약>` 형식(`.claude/rules/documentation.md`). `git add -A` 대신 파일을 지정해 add할 것. **이 저장소는 공개 저장소이므로** `DELIVERABLES/` 아래 시험 산출물(고객사 내용)과 `server/hive` 실행 데이터는 커밋하지 않음
- 모델 이름·세션 주소를 코드·문서·커밋에 남기지 않음
- 되돌리기 어려운 작업(대량 삭제, `master` 병합, 공개 배포, 외부 공개)은 재하 확인 후

## 8. Windows에서 확인된 주의점

- `claude.exe`를 셸(`shell: true`)로 실행하면 cmd.exe가 `--json-schema`의 인용부호를 깨뜨림 → `.exe`는 셸 없이, `.cmd`·`.bat`만 셸로 실행(`claudeCode.mjs`에 반영됨)
- `--bare`는 API 키 전용이라 claude.ai 로그인에서는 'Not logged in'이 남 → 쓰지 않음(반영됨). 격리는 `--tools "" --setting-sources "" --strict-mcp-config`와 빈 임시 폴더로 함
- 'OAuth session expired' 메시지는 not_logged_in으로 분류함(반영됨)
- PowerShell에서는 `npm` 대신 `npm.cmd`, 한글 출력은 `[Console]::OutputEncoding=[Text.Encoding]::UTF8`
- 데스크톱 앱이 업데이트되면 내장 CLI 폴더의 버전이 바뀜(2.1.295 → 2.1.317) → 경로를 고정하지 말고 매번 탐색할 것
- `pkill`처럼 이름으로 프로세스를 죽이면 작업 중인 셸까지 죽을 수 있음 → pid를 기록해 그 pid만 정리할 것

## 9. 참고

- Munder Difflin 소개: https://themenonlab.blog/blog/munder-difflin-office-of-coding-agents — Electron·React·TypeScript·Pixi.js·xterm.js·node-pty, hive(로컬 git 저장소), outbox → inbox 라우터, 승인 큐, 서킷 브레이커(steer → constrain → stop), 에이전트별 토큰 예산. MIT 라이선스로 소개됨
- 이 PC에 Munder Difflin v0.5.7이 설치돼 있음. 화면 비교용으로 참고하고, 코드를 가져올 때는 라이선스 고지를 함께 넣을 것
