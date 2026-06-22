# 우리 팀이 만들 MCP — 구상 제안서 (상시 회의 산출)

> 주재: 한도전 · 구상: 이풍뎅(인터랙션·접근성)·백연동(백엔드·파이프라인) 서브에이전트 실제 투입
> 목적: 컨버전스1팀의 반복 작업을 도구화. 후보 4종 → 우선순위·구축 순서 확정.

## 후보 MCP 4종
### 1) `deliverable-pipeline-mcp` (백연동) — 산출물 파이프라인
- 문제: md/스펙(SSOT) → PPTX/DOCX/XLSX/PDF 일괄 생성·버전 대장을 매번 수동 실행.
- 핵심 tool: `build_pptx` / `build_docx` / `build_xlsx`(spec→파일) · `md_to_docx`(md→docx) ·
  `render_pdf`(HTML→PDF) · `update_index`(_index 대장 갱신).
- 데이터: `DELIVERABLES/_generators/*.py` 래핑(이미 존재) · 네이밍/폴더 규칙 내장.
- 난이도: **하** (기존 스크립트 subprocess 래핑) · 의존: MCP SDK, python-pptx/docx/openpyxl.

### 2) `i18n-a11y-lint-mcp` (이풍뎅) — 다국어·접근성 정적 린트
- 문제: 다국어/lang/RTL/모션 정합성을 수동 점검(다국어-접근성-명세 P1 4항목).
- 핵심 tool: `check_translation_coverage`(HTML+번역JSON→누락키) · `validate_lang_bcp47`(lang 유효성) ·
  `detect_rtl_risks`(물리속성 RTL 위험) · `audit_reduced_motion`(@keyframes 분기 누락).
- 데이터: 정적 파일 분석(브라우저 불필요) · 의존: htmlparser2/postcss/bcp-47.
- 난이도: **하~중** · 커밋 게이트로 즉시 가치.

### 3) `a11y-audit-mcp` (이풍뎅) — WCAG 자동 점검 + 보고서
- 문제: `접근성체크.md`를 수작업 작성 → 자동화·누락 방지.
- 핵심 tool: `audit_wcag`(HTML→AA 항목 pass/fail) · `check_lang_attributes` · `check_color_contrast` ·
  `check_aria_roles` · `generate_a11y_report`(→ md 보고서).
- 의존: axe-core + jsdom(+선택 playwright) · 난이도: **중**.

### 4) `adapter-mock-mcp` (백연동) — 정부24/유통/인증 mock 서버
- 문제: 규격 미확정 상태에서 프론트/기획 독립 개발을 위한 계약 기반 가짜 응답.
- 핵심 tool: `mock_auth` · `mock_cert` · `mock_notify_log` · `list_scenarios` · `validate_contract`.
- 시나리오: happy_path / cert_unavailable / session_expired / gov24_timeout / idempotent_duplicate.
- 데이터: `연동-인터페이스-계약.md`(SSOT) 파싱 · 보안: 실 PII·토큰 절대 미포함, prod 기동 차단.
- 난이도: **중** · 계약 §3~§5 안정화 후.

## 우선순위 & 구축 순서 (결정)
| 순위 | MCP | 근거 | 선행조건 |
| --- | --- | --- | --- |
| **P0** | `deliverable-pipeline-mcp` | 기존 생성기 재활용·난이도 하·즉시 가치 | `_generators/*` 정상(완료) |
| **P0** | `i18n-a11y-lint-mcp` | 정적 분석·다국어 명세 P1 게이트 자동화 (이풍뎅 우선 추천) | 번역 리소스 구조 |
| P1 | `a11y-audit-mcp` | WCAG 자동 점검 | axe-core 환경 |
| P2 | `adapter-mock-mcp` | 독립 개발 가속 | 계약 안정화 |

## 다음 액션
- P0 2종의 tool 스펙을 `api-design` 스킬로 상세화 → PoC(파이썬 MCP SDK) 착수 검토.
- 본 제안서·마스터 인덱스는 주기 회의(loop)에서 갱신.
