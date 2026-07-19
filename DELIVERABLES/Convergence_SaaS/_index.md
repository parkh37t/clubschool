# DELIVERABLES — 컨버전스 SaaS (과제 #3)

> 정책: Claude-native Office First (운영모델: `PROJECT/_team/팀운영모델.md`)
> 근거 원문: `PROJECT/Convergence_SaaS/00-strategy/00_종합안.md` + 세부 7종

## 보고 산출물
| 형태 | 산출물 | 포맷 | 위치 | 용도 |
| --- | --- | --- | --- | --- |
| **경영 보고형** | Converge 종합안 (12장 + **발표 노트**) | PPTX(네이티브) | `00_보고/경영보고_종합안_v1.pptx` ⭐ | 본부장·경영진 발표·의사결정 |
| **실무 보고형** | Converge 종합안 (표 5종 포함) | DOCX(네이티브) | `00_보고/실무보고_종합안_v1.docx` ⭐ | 팀 실행·상세 참조 |
| **요약 1-pager** | 한 장 요약 (인쇄용 A4) | HTML(Claude Design) | `00_보고/요약_1pager_v1.html` ⭐ | 브라우저 열람·A4 인쇄 배포 |

> 재생성(PPTX·DOCX): `python3 DELIVERABLES/_generators/projects/Convergence_SaaS.py`
> 1-pager: 브라우저로 열고 `Ctrl/Cmd+P` → A4 · 여백 없음 → PDF 저장.

## 구성 개요
- **경영 보고형(PPTX):** 요약·문제·ICP·제품 3기둥·MVP(M0~M6)·아키텍처·AI·GTM/가격·로드맵·리스크/경영결정 6건·즉시 액션 — 의사결정 흐름 중심. **12장 전부 발표자 노트(스크립트+진행 팁+예상 소요) 포함** → 회의 진행용.
- **실무 보고형(DOCX):** 동일 10개 섹션을 표(ICP·MVP·가격·로드맵·리스크)와 함께 상세화 — 착수 순서·영향 파일까지 명시.
- **요약 1-pager(HTML):** 전체를 A4 한 장에 압축(자체 완결 CSS, 외부 의존 없음). 인쇄 시 색 유지·여백 0.

## 비고
- 핵심 블로커 **M0 정합성 버그**(`data/mockData.ts` 파생계산의 모듈상수 참조)를 두 보고서 모두 최우선으로 강조.
- 경영 결정 필요 6건(격리/요금/계층/이관/컴플라이언스/벤치마킹 상품화)은 팀 권고안 제시 · 확정은 경영.
