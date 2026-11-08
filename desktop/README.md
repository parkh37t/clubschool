# Wylie AX Office — 설치형 앱(Windows)

PowerShell 없이 더블클릭으로 쓰는 Wylie AX Office. 앱이 오케스트레이터 서버(`server/`)를 내부에서 띄우고,
창에서 가상 사무실 화면을 엽니다. 화면 구조는 Munder Difflin과 같습니다.

| 자리 | 내용 |
| --- | --- |
| 왼쪽 | 픽셀 사무실(책상을 누르면 그 에이전트 선택) |
| 오른쪽 위 | 커맨드 센터 탭 — 작업 · 승인 · 기억 · 활동 · 스킬 |
| 오른쪽 아래 | 브리핑 콘솔(결과·맥락·제약·질문 기준, 파일 첨부) |
| 하단 | 에이전트 카드 — 팀장 + 12인(상태·지금 하는 작업·누적 사용량) |

## 설치

1. `release/Wylie-AX-Office-Setup-<버전>.exe` 를 실행합니다.
2. **Windows SmartScreen 경고**가 뜰 수 있습니다. 코드 서명을 하지 않은 설치 파일이라서입니다.
   [추가 정보] → [실행]을 누르면 설치가 진행됩니다.
3. 사용자 계정에 설치되므로 관리자 권한이 필요 없습니다(기본 위치 `%LOCALAPPDATA%\Programs\Wylie AX Office`).
4. 시작 메뉴·바탕 화면의 **Wylie AX Office** 로 실행합니다.

## 쓰기 전에 — Claude 로그인

앱은 이 PC의 Claude 데스크톱 앱에 들어 있는 Claude Code(`claude.exe`)를 불러 일합니다(API 키 없음, 구독 사용량).
로그인이 풀려 있으면 화면 위에 배너가 뜹니다. **[로그인]** 을 누르면 새 PowerShell 창이 열리고,
브라우저에서 승인한 뒤 화면에 나온 코드를 그 창에 붙여 넣으면 됩니다. 확인되면 배너가 사라집니다.

## 창·트레이

- 창을 닫아도 **트레이에서 계속 실행**됩니다(진행 중인 작업도 계속 돕니다).
- 트레이 아이콘 메뉴: 열기 / 산출물 폴더 열기 / Windows 시작 시 실행(켜기·끄기) / **종료**
- **종료**를 누르면 서버와 claude 자식 프로세스를 모두 정리하고 끝납니다. 진행 중이던 작업은 다음 실행 때 '보류'로 닫힙니다.
- 이미 실행 중일 때 다시 실행하면 새로 뜨지 않고 기존 창이 앞으로 옵니다.
- Windows 시작 시 실행을 켜면 로그인할 때 창 없이 트레이로만 뜹니다.

## 데이터 위치

설치 폴더에는 쓰지 않습니다(쓰기 권한이 없고 업데이트 때 지워짐).

| 내용 | 위치 |
| --- | --- |
| 작업 원장·승인·메일함·기억·이벤트(hive) | `문서\Wylie AX Office\hive` |
| 산출물·첨부 | `문서\Wylie AX Office\산출물` |
| 앱·서버 기록 | `문서\Wylie AX Office\logs\office-server.log` |

## 동작 방식

- 서버는 Electron 내장 Node 로 돌고(`ELECTRON_RUN_AS_NODE=1`), `127.0.0.1` 에만 바인딩합니다. 포트는 8787(사용 중이면 8788~8799).
- 실행 모드는 `claude_code` 입니다. 시험할 때는 환경 변수로 바꿀 수 있습니다: `OFFICE_MODE=mock`,
  `OFFICE_HIVE_DIR`, `OFFICE_DELIVERABLES_DIR`(데이터 위치), `OFFICE_CONCURRENCY`(동시 작업, 기본 2·최대 3).
- 설치본에는 live(Agent SDK) 모드 의존성을 넣지 않았습니다(260MB). live 모드는 저장소에서 서버를 직접 띄워 씁니다.

## 개발·빌드 (저장소 루트에서)

```bash
npm install
npm run desktop:dev     # 화면 빌드 후 개발 실행(Electron 창)
npm run desktop:build   # 화면 빌드 후 설치 파일 → release/
npm run desktop:icon    # 아이콘 다시 만들기(desktop/scripts/make-icon.mjs)
```

- 설치 파일에 들어가는 것: `desktop/`(main 프로세스·아이콘), `server/`(hive 데이터·live 의존성 제외), `dist/`, `.claude/agents`, `.claude/skills`.
  빌드하는 PC의 `.claude/skills` 에 사내 스킬이 있으면 그것도 들어가므로, 설치 파일을 외부에 배포하지 않습니다.
- `release/` 는 커밋하지 않습니다.

## 지우기

설정 → 앱 → Wylie AX Office → 제거. `문서\Wylie AX Office` 의 작업 기록·산출물은 남습니다(필요 없으면 직접 지움).
