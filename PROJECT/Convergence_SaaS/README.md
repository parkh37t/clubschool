# 과제 #3 — Convergence SaaS (컨버전스 실적관리 → 멀티테넌트 SaaS+AI)

> 컨버전스 실적관리 앱을 **여러 회사가 기준 데이터만 넣으면 즉시 쓰는 멀티테넌트 SaaS + AI 서비스**로
> 제품화하는 프로젝트.

## ⚠ 코드베이스 정합 (2026-07-08 갱신)
상품화 실제 대상은 **con-mgt**(vanilla JS + Express + PostgreSQL `state.payload` JSONB, v234, 라이브 운영)이며,
이 저장소의 **clubschool(React+localStorage)은 별개 참고 코드베이스**입니다.
- 사용자 업로드 실물 모델 6종 → `_source-package/`(SSOT, 읽기전용).
- con-mgt 기준 통합 패키징 → `00-strategy/01_패키징-방안.md` ⭐ **최신·우선**.
- `00_종합안.md`의 전략/시장/가격 골격은 유효하나 **기술 근거(clubschool의 M0 등)는 개정 대상**.

## 산출물 지도
| 문서 | 내용 |
| --- | --- |
| `00-strategy/01_패키징-방안.md` ⭐ | **con-mgt 기준 통합 패키징**(산출물·에디션·배포·온보딩·로드맵·첫 스프린트·§10 End-State) — 먼저 볼 것 |
| `01-architecture/Phase1-멀티테넌트-코어-설계.md` ⭐ | **첫 스프린트 착수 문서** — tenants DDL·settings 키 계약·RLS 정책·이관·게이트 |
| `02-planning/Phase2-온보딩-마법사-화면설계.md` ⭐ | **온보딩 5단계 화면설계서** — IA·플로우·화면정의서(빈/로딩/에러/예외)·엑셀 템플릿·API |
| `_source-package/01~06 + README` | 업로드 실물 모델(사용자·관리자 매뉴얼·아키텍처·데이터구조·SaaS전환·배포노하우) |
| `00-strategy/00_종합안.md` | 경영진용 제품 기획 종합안(가칭 **Converge**) — 전략 골격(기술 개정 대상) |
| `00-strategy/현황분석.md` | (clubschool 기준) 현황 + SaaS 전환 한계/기회 — con-mgt 정합 개정 대상 |
| `00-strategy/제품전략-MVP-로드맵.md` | ICP·가치제안·MVP·분기 로드맵 |
| `00-strategy/온보딩-기준데이터.md` | "기준 데이터만 넣으면 즉시 시작" 셋업 마법사·기준데이터 스키마 |
| `00-strategy/AI-기능세트.md` | AI 기능 세트·MVP AI 우선순위(자동 브리핑·자연어 질의 등) |
| `00-strategy/GTM-가격.md` | 세그먼트·포지셔닝·가격/패키징·획득채널 |
| `01-architecture/멀티테넌시-아키텍처.md` | 테넌트 격리(Supabase+RLS)·인증·데이터계층 전환 |
| `01-architecture/보안-데이터-컴플라이언스.md` | 멀티테넌트 보안·개인정보(PIPA)·체크리스트 |

## 핵심 결론 (종합안 요약)
- **가치:** "우리 팀이 지금 얼마나 놀고 있는지, 5분 만에 **금액(유휴비용)**으로 본다" — 한국형 Lite PSA SaaS.
- **ICP:** 프로젝트 인력 30~120명 조직(에이전시·SI·컨설팅·PMO).
- **3기둥:** ① 멀티테넌트 코어(기존 도메인·계산·UI 재사용) ② 기준데이터 온보딩 위저드 ③ AI 레이어(재무는 앱이 계산, Claude는 서사·추천).
- **아키텍처 권고:** Vercel + Supabase(Seoul) 공유 Postgres + **RLS row-level tenant 격리** + Owner/Admin/Editor/Viewer RBAC + `useDataStore`→`DataSource` 추상화(파생계산 서버 이전).
- **🔴 선행 블로커 M0:** `data/mockData.ts`의 파생계산이 모듈 상수(mock)를 직접 참조 → 편집해도 가동률·유휴비용이 목데이터로 고정되는 버그. **재무 신뢰의 전제라 최우선 수정.**
- **MVP(Q3~Q4):** M0 수정 → 테넌시/인증 → 온보딩 → 대시보드(유휴비용) → AI 배정추천 + 자동 브리핑. 파일럿 5~10개.

## 경영 결정 필요 (팀이 권고안 제시, 확정은 사용자)
격리 방식 / 요금 모델 / 조직 계층 깊이 / 기존 localStorage 데이터 이관 범위 / 컴플라이언스 목표 시점 / 교차테넌트 벤치마킹 상품화 여부.
