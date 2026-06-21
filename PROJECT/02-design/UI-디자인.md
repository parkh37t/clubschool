# UI 디자인 (화면 적용) — 전자지갑 & 고객센터

> 담당: 차도안 · 입력: `화면설계서.md` + `디자인시스템.md`
> 각 화면을 컴포넌트로 매핑하고 상태별 UI를 지정(퍼블리싱 직접 구현 기준).

## 공통 레이아웃
- 모바일 프레임 375×812, `AppBar`(상단) + 본문 스크롤 + `BottomCTA`(하단 고정).
- 배경 `--bg`, 카드 `--surface` + `shadow-card`, 반경 md(12).

## S0 Home
- `AppBar(home)`: 좌 로고(i-ONE Bank Global), 우 `LangSelector(inline:EN▾)` + **고객센터 작은 아이콘**(headset, 44px, aria-label="Customer center").
- 본문: 잔액 카드[mock] → 빠른메뉴(전자지갑 강조 카드) → 프로모션.
- 상태: 로딩=카드 스켈레톤.

## S1 지갑 발급
- 일러스트 + 타이틀 "Issue your digital wallet" + 설명.
- `FormRow(checkbox)` 필수약관, 인증수단 안내(공동/IBK, "金融인증서 불가" caption).
- `BottomCTA(single)` [Issue & Authenticate] (약관 전 disabled).
- 예외 UI: 인증서 미보유 → `StatusView(empty)` "No certificate" + [How to get a certificate].

## S2 지갑 홈
- 헤더 "My Digital Wallet" + 보유 N건 요약.
- 3개 `ListItem(nav)`: Request certificate / My certificates / Manage(stub→Toast "Coming soon").
- 빈 상태: 0건일 때 보관함 요약 자리에 `StatusView(empty)` + [Request your first certificate].

## S3 신청가능목록 ❶
- `StepHeader` ①active.
- `CertCard(available)` ×4 (거소신고/외국인등록/출입국/여권정보) + 우측 chevron.
- 상태: 로딩=카드 스켈레톤 ×3 / 빈="No certificates available" / **오류**=`StatusView(error)` "Issuing agency under maintenance" + [Retry].

## S4 신청·인증 ❷
- `StepHeader` ②active.
- 증명서 요약 카드 + `FormRow(radio)` 수령(전자지갑) + 부수 + 필수약관 `FormRow(checkbox)`.
- 인증수단 선택(공동/IBK) 세그먼트.
- `BottomCTA(single)` [Request & Authenticate] (약관 전 disabled).
- 오류 UI: 인증 실패 인라인 `--danger` 메시지 + [Try again], 타임아웃 토스트.

## S5 신청 완료 ❸
- `StepHeader` ③done.
- `StatusView(success-like)`: 성공 아이콘(`--success`) + "Request completed" + 접수번호[mock] + 신청정보 리스트.
- `BottomCTA(dual)` [View in storage] / [Home].

## S6 보관함
- 탭바: Stored(active) / Sent / Received / History (Stored 외 stub, 비활성 톤).
- `CertCard(owned)` 목록(명/발급일/상태 배지). 만료=배지 `--warning`.
- 빈: `StatusView(empty)` + [Request a certificate].

## S7 증명서 상세
- 증명서 프리뷰 영역[mock] + 메타(발급일/만료).
- `BottomCTA(dual)` [Download] / [Submit].
- 만료 시: 상단 `--warning` 배너 "Expired" + Submit disabled + [Reissue].

## S8 언어별 고객센터 (SFR-062)
- `AppBar(sub)` "Customer Center".
- 안내 문구 + 국가 `ListItem(contact)` 목록: 국기/언어명 + 번호 + **직통연결 아이콘**(phone, aria-label="Call {lang} support").
- tap → `tel:` 연결. 운영시간 외: 항목 하단 `--warning` "Outside business hours" + [Email us].
- 통화 불가 디바이스: 번호 long-press 복사 안내(caption).

## UI 검수(차도안 self-check)
- [x] 8화면 컴포넌트·상태 매핑, 토큰만 사용(하드코딩 색 없음)
- [x] 빈/로딩/오류/비활성/예외 UI 명시
- [x] 터치 타깃·접근명·대비 기준 반영 → 이풍뎅 접근성 게이트로 전달

## 핸드오프 → 표준수(마크업) · 이풍뎅(인터랙션/접근성)
