# APEX 가상 사무실 — 단일 HTML 스탠드얼론

오피스 + 지시 콘솔을 **자체완결 단일 HTML**로 빌드한다(모든 JS/CSS 인라인).
정적 호스트 어디에 올려도 그대로 동작한다(앱 셸 불필요).

## 빌드
```bash
npm run build:standalone     # → dist-standalone/index.html (단일 파일)
```

## 웹에서 보기(호스팅)
`dist-standalone/index.html`을 정적 호스트에 올린다:
- GitHub Pages / Vercel / Netlify / S3 / 사내 서버, 또는 로컬: `cd dist-standalone && python3 -m http.server 8080`
- ⚠ ES 모듈 CORS 때문에 **file://(더블클릭)에서는 렌더되지 않는다 — 반드시 http(s)로 서빙**.

## 실제 오케스트레이터 연동
- 같은 폴더에 `office-state.json`(OfficeState 스키마)을 두면 오피스가 2초 폴링해 실제 상태를 반영(없으면 데모).
- 지시 콘솔: 백엔드가 있으면 `office-main.tsx`에서 `instructUrl` prop을 넘겨 자동 POST(경로 B),
  없으면 지시가 `instruction.json`으로 복사·다운로드되어 오케스트레이터 세션이 실행(경로 A).
