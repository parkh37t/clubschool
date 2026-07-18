# 지시 계약 (instruction) — 샘플

> 사용자가 오케스트레이터에게 주는 업무 지시의 표준 형식.
> 채팅으로 줘도 되고, 이 형식을 `instruction.json`으로 기록해도 된다(경로 B에선 API 바디).

## 필드
| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `title` | ✅ | 과제명 (예: "IBK 제안 랜딩 개편") |
| `goal` | ✅ | 무엇을·왜 (한두 문장) |
| `gates` | | 돌릴 게이트 범위. 기본 전체 G1~G6. 예: `["G2","G3"]`(기획·디자인만) |
| `deliverables` | | 원하는 산출물 형식 (예: `["PPTX","화면설계서","시안HTML"]`) |
| `deadline` | | 마감 |
| `constraints` | | 제약·주의(대외비, 브랜드 톤 등) |

## JSON 예시 (`_orchestrator/instruction.json`)
```json
{
  "title": "컨버전스 SaaS 온보딩 화면 개편",
  "goal": "STEP1 회사·조직 화면을 기획·디자인·구현까지 관통",
  "gates": ["G2", "G3", "G4"],
  "deliverables": ["화면설계서", "시안HTML", "프로토타입"],
  "deadline": "2026-07-25",
  "constraints": ["Converge 톤 유지", "결과는 한국어"]
}
```

## 오케스트레이터가 하는 일(수신 후)
1. 게이트 순서로 담당 에이전트 위임 → 각 페이즈 전이마다 `office-state.json` 갱신.
2. 산출물을 `DELIVERABLES/<title-slug>/`에 실제 파일로 저장 + `_index.md` 대장.
3. 게이트 통과 시 `artifact` 기록(오피스 산출물 패널에 표시).
4. 전 게이트 완료 시 `phase:"done-all"` → 브리핑 룸 총회.
