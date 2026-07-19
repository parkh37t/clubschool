# APEX 가상 사무실 — 오케스트레이터 서버 (경로 B 뼈대)

웹 지시 콘솔에 프롬프트를 넣으면 → 이 서버가 **12 AI 에이전트**(`.claude/agents`)를
**G1~G6 게이트 파이프라인**으로 돌려 → 실제 산출물(`DELIVERABLES/`)을 만들고 →
오피스가 폴링하는 `office-state.json`을 갱신해 실시간 시각화합니다.

> 브라우저는 에이전트를 직접 못 돌립니다(보안). 그래서 화면 뒤에 이 작은 서버를 둡니다.
> 화면은 지시를 받고 결과를 보여주는 창구, 실제 일은 이 서버가 합니다.

## 처음엔 이 3단계만 (사장님 PC에서)

### 0단계 — 준비 (한 번만)
- Node.js 20+ 설치 확인: `node -v`
- 클론한 저장소 루트에서 프론트 실행: `npm install && npm run dev` → 오피스가 `http://localhost:3000` 에 뜸

### mock 모드 — **키 없이 지금 바로 (배선 확인용)**
```bash
cd server
npm run office          # 의존성 설치 불필요, 내장 모듈만으로 즉시 가동 (기본 mock 모드)
```
1. 브라우저에서 `http://localhost:3000/?view=virtual-office` 열기
2. 우측 **지시 콘솔**에 과제명·목표 입력 → 게이트(G1~G6) 선택 → **지시 보내기**
3. 12 에이전트가 회의실로 모였다가 자리에서 작업하고 결재받는 흐름이 **실시간으로** 흐름
   → `DELIVERABLES/<과제명>/` 에 목업 산출물 파일이 쌓임

여기까지 되면 **지시 → 오피스 → 산출물** 배선이 전부 연결된 것입니다.

### live 모드 — **실제 산출물 (키 필요)**
```bash
cd server
npm install                              # Claude Agent SDK 설치 (최초 1회)
export ANTHROPIC_API_KEY=sk-ant-...      # Anthropic 콘솔에서 발급한 키
OFFICE_MODE=live npm run office
```
같은 방법으로 지시하면, 이번엔 **진짜 에이전트**가 각자 페르소나·스킬로 실제 산출물을 씁니다.
(`.env.example` 를 `.env` 로 복사해 값을 채워도 됩니다.)

## 동작 계약 (I/O)

| 엔드포인트 | 용도 |
| --- | --- |
| `GET /office-state.json` | 오피스가 2초 폴링. 지시 전에는 404 → 오피스 자체 데모 유지 |
| `POST /api/instruct` | 지시 콘솔이 `{title, goal, gates, ts}` 전송 → 파이프라인 착수(202 즉시 응답, 백그라운드 실행) |
| `GET /api/health` | 서버/모드 상태 확인 |

`office-state.json` 스키마는 `components/VirtualOffice/officeSimulator.ts` 의 `OfficeState` 와 동일합니다.

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `office-server.mjs` | HTTP 서버(상태 제공 + 지시 수신). 내장 모듈만, 의존성 0 |
| `orchestrator.mjs` | 게이트 파이프라인 — 페이즈 전이마다 상태 갱신, 산출물 대장 작성 |
| `gates.mjs` | G1~G6 ↔ 담당 에이전트·작업·산출물 매핑 |
| `agentRunner.mjs` | 워커 1명 실행 — mock(즉시) / live(Agent SDK) |
| `state.mjs` | `office-state.json` 읽기/쓰기 |

## 프론트 연결

`components/ViewRenderer.tsx` 의 가상 사무실 뷰는 이미 이렇게 연결돼 있습니다:
```tsx
<VirtualOfficeView stateUrl="/office-state.json" instructUrl="/api/instruct" />
```
`vite.config.ts` 의 dev 프록시가 `/office-state.json` · `/api` 를 이 서버(8787)로 넘겨
같은 오리진처럼 동작시킵니다(CORS 불필요).

## 보안·비용 주의
- **API 키는 서버(환경변수)에만.** 브라우저/프론트 코드/저장소에 절대 넣지 않습니다.
- 지시 1건씩만 실행합니다(경합·비용 폭주 방지). 공개 배포 시엔 인증을 앞단에 두세요.
- 상시 가동(클라우드 호스팅)은 mock→live 로 PC 검증이 끝난 뒤 승격하는 것을 권장합니다.
