# DELIVERABLES — IBK i-ONE Bank Global (배포 산출물 대장)

> 정책: **Claude Design First + Claude-native Office First**
> - 비주얼 디자인 = Claude Design(HTML, SSOT). PDF/이미지는 브라우저 인쇄(무손실).
> - **편집형 오피스(PPTX/DOCX/XLSX) = Claude가 직접 생성**(`_generators/gen_office.py`,
>   python-pptx/docx/openpyxl). **이것이 1순위.** Adobe Express/Canva는 보조(템플릿/추가편집 필요 시).
> - 디자인 파일·다이어그램 = Figma · 협업 문서 = Google Docs/Sheets(선택).
> 폴더 체계: DELIVERABLES/프로젝트/업무 · 네이밍: `IBK_<업무>_<문서명>_v<버전>.<확장자>`
> 재생성: `python3 DELIVERABLES/_generators/gen_office.py` · 참고: `PROJECT/회의록/산출물도구-비교연구.md`

## 생성분
| 업무 | 산출물 | 포맷 | 위치 / 링크 | 상태 |
| --- | --- | --- | --- | --- |
| 01 영업제안 | **제안 발표자료** | **PPTX(Claude 네이티브, 10장)** + HTML(Claude Design, 인쇄용) | `01_영업제안/제안발표_v1.pptx` · `제안발표_v1.html` | ✅ |
| 01 영업제안 | **제안서 본문** | **DOCX(Claude 네이티브)** | `01_영업제안/제안서본문_v1.docx` | ✅ |
| 03 디자인 | 브랜드 가이드 | HTML(Claude Design, 인쇄용) + Adobe Express(보조) | `03_디자인/브랜드가이드_v1.html` · [Express](https://new.express.adobe.com/id/urn:aaid:sc:US:2fd8685b-3d84-43f8-a884-9c7cc0bb5b30?referrer=claude) | ✅ |
| 04 퍼블리싱 | 프로토타입 | **HTML(동작본)** | `04_퍼블리싱/프로토타입_v1.html` | ✅ |
| 05 개발준비 | KPI·이벤트 스키마 | **XLSX(Claude 네이티브)** | `05_개발준비/KPI-이벤트-스키마_v1.xlsx` | ✅ |
| 02 기획 | 화면설계서 | **DOCX(Claude 네이티브)** | `02_기획/화면설계서_v1.docx` | ✅ |
| 02 기획 | 인증서 예외 플로우 | **DOCX(Claude 네이티브)** | `02_기획/예외플로우-인증서_v1.docx` | ✅ |
| 05 개발준비 | 연동 인터페이스 계약 | **DOCX(Claude 네이티브)** | `05_개발준비/연동-인터페이스-계약_v1.docx` | ✅ |
| 00 회의록 | 회의록 01·02 통합 | **DOCX(Claude 네이티브)** | `00_회의록/회의록_v1.docx` | ✅ |
| 02 기획 | IA·User Flow 다이어그램 | Figma | 플랜 선택 대기 | ⏳ |
| 02/03 | 화면설계·UI 시안 | Figma | 플랜 선택 대기 | ⏳ |

> Adobe Express 링크(제안 발표 [이전본](https://new.express.adobe.com/id/urn:aaid:sc:US:af0b47b1-1104-41e8-b2a3-a7272e359771?referrer=claude))는 참고용 보조. 1순위는 네이티브 PPTX.

## 비고
- Adobe Express 문서는 열어서 **PPTX·PDF·이미지로 다운로드** 가능(편집 가능 네이티브 문서).
- Express 임포트 시 본문 폰트는 Acumin Pro → Source Sans 3로 대체될 수 있음(한글 보존).
- 컬러/로고는 IBK 공식 BI 확정 전 **근사치**. BI 수령 시 토큰 교체.
- 나머지 업무(회의록 DOCX, 화면설계서 DOCX, 연동계약/KPI XLSX)는 2차 일괄 생성 예정.
