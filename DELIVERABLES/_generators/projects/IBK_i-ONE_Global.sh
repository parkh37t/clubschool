#!/usr/bin/env bash
# 프로젝트 설정 러너 — IBK i-ONE Bank Global (과제 #1).
# 과제 무관 엔진(gen_office.py / gen_docs_from_md.py)을 이 과제 경로로 호출한다.
# 신규 과제는 이 파일을 복제해 SLUG/경로/제목만 바꾼다.
set -euo pipefail
cd "$(dirname "$0")/../../.."          # repo root
G="DELIVERABLES/_generators"
SLUG="IBK_i-ONE_Global"
P="PROJECT"                             # 이 과제의 스펙 루트(현재 flat 레이아웃)
D="DELIVERABLES/$SLUG"

# 1) 과제 고유 콘텐츠(PPTX/DOCX/XLSX) — IBK 예시 생성기
python3 "$G/gen_office.py"

# 2) 공통 md→DOCX (과제 무관 엔진 호출)
python3 "$G/gen_docs_from_md.py" "$D/02_기획/화면설계서_v1.docx" \
  "IBK i-ONE Bank Global — 화면설계서 (v1)" "$P/01-planning/화면설계서.md"
python3 "$G/gen_docs_from_md.py" "$D/02_기획/예외플로우-인증서_v1.docx" \
  "IBK i-ONE Bank Global — 인증서 예외 플로우 (v1)" "$P/01-planning/예외플로우-인증서.md"
python3 "$G/gen_docs_from_md.py" "$D/05_개발준비/연동-인터페이스-계약_v1.docx" \
  "IBK i-ONE Bank Global — 연동 인터페이스 계약 (v1)" "$P/04-dev-prep/연동-인터페이스-계약.md"
python3 "$G/gen_docs_from_md.py" "$D/00_회의록/회의록_v1.docx" \
  "컨버전스1팀 — 회의록 모음 (v1)" "$P/회의록/회의록-01.md" "$P/회의록/회의록-02-산출물정리체계.md"

echo "[$SLUG] 오피스 산출물 재생성 완료"
