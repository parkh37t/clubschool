# KPI 정의서 & 이벤트 로그 스키마
# IBK i-ONE Bank Global — 외국인 모듈 (전자지갑·증명서 신청·고객센터)

> 담당: 고지표(데이터 분석) · 기준일: 2026-06-21
> 입력: `IA-사용자플로우.md`, `화면설계서.md` (S0~S8)
> 미확정 항목은 **[추측]** 으로 표기. 확정 전 개발·기획과 재검토 필요.

---

## 1. 이벤트 로그 스키마

### 1-1. 공통 속성 (모든 이벤트에 포함)

| 속성명 | 타입 | 설명 |
| --- | --- | --- |
| `user_id` | string | 로그인 사용자 식별자 (익명 추적 시 기기 ID로 대체) **[추측]** |
| `locale` | string | 현재 언어/국가 설정 (예: `en`, `vi`, `zh-CN`) |
| `timestamp` | ISO 8601 string | 이벤트 발생 시각 (UTC) |
| `session_id` | string | 세션 단위 묶음 식별자 **[추측]** |
| `platform` | string | `ios` / `android` |
| `app_version` | string | 앱 빌드 버전 (예: `1.2.3`) |

---

### 1-2. 이벤트 목록

#### E01 — `wallet_cert_step1_view`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S3 신청가능목록 진입 시 |
| 발화 조건 | 화면 마운트 완료(목록 렌더 후) |
| 이벤트별 속성 | `cert_list_count: number` (노출 증명서 종 수), `list_load_status: 'success' \| 'error' \| 'maintenance'` |
| 비고 | 기관 점검(maintenance) 진입 여부 확인용. 퍼널 진입 카운트 기준 이벤트 |

---

#### E02 — `wallet_cert_request`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S4 신청·인증 — [신청·인증] 버튼 탭 시 |
| 발화 조건 | 약관 동의 완료 + 인증 수단 선택 후 버튼 탭 |
| 이벤트별 속성 | `cert_type: string` (예: `foreign_reg`, `entry_exit`, `passport_info`, `domestic_reg`) **[추측: cert_type 코드]**, `auth_method: 'joint_cert' \| 'ibk_cert'`, `copy_count: number` (신청 부수) |
| 비고 | 인증 프로세스 시작 직전. 퍼널 Step 2 → Step 3 전환 측정 기준 |

---

#### E03 — `wallet_cert_auth_fail`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S4 신청·인증 — 인증 실패 응답 수신 시 |
| 발화 조건 | 인증 API 실패 응답 또는 사용자 취소 |
| 이벤트별 속성 | `cert_type: string`, `auth_method: string`, `fail_reason: 'wrong_pin' \| 'cert_expired' \| 'user_cancel' \| 'server_error' \| 'unknown'` **[추측]**, `fail_attempt: number` (현재 실패 누적 횟수) |
| 비고 | 이탈 원인 구분: `fail_reason` 로 인증실패/사용자취소/서버오류 분리 측정. `fail_attempt=3` 이면 차단 임박 신호 **[추측 정책: 3회 차단]** |

---

#### E04 — `wallet_cert_timeout`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S4 신청·인증 — 인증 또는 발급요청 타임아웃 발생 시 |
| 발화 조건 | 인증/발급 API 응답 대기 초과 |
| 이벤트별 속성 | `cert_type: string`, `timeout_stage: 'auth' \| 'issue_request'` (어느 단계에서 발생), `elapsed_ms: number` (소요 시간 ms) **[추측]** |
| 비고 | `E03`(인증실패)과 별도 이벤트로 분리. 네트워크 지연 vs 인증 실패를 구분 측정 |

---

#### E05 — `wallet_cert_complete`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S5 신청 완료 화면 진입 시 |
| 발화 조건 | 신청 완료 화면 렌더 성공 |
| 이벤트별 속성 | `cert_type: string`, `receipt_no: string` (접수번호, 로그 연결용), `auth_method: string`, `time_to_complete_ms: number` (S3 진입~S5 완료 경과 시간) **[추측]** |
| 비고 | 퍼널 최종 전환 이벤트. 신청 완료율 분자 기준 |

---

#### E06 — `cert_download`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S7 증명서 상세 — [다운로드] 버튼 탭 시 |
| 발화 조건 | 다운로드 버튼 탭 (성공/실패 무관, 의도 기록) |
| 이벤트별 속성 | `cert_type: string`, `cert_id: string`, `download_result: 'success' \| 'fail'`, `cert_status: 'valid' \| 'expired'` |
| 비고 | 만료 증명서 다운로드 시도 여부도 포함. 재발급 유도 필요 구간 파악 |

---

#### E07 — `cert_submit`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S7 증명서 상세 — [제출] 완료 시 |
| 발화 조건 | 제출 대상 선택 후 제출 확정 |
| 이벤트별 속성 | `cert_type: string`, `cert_id: string`, `submit_target: string` (제출 대상 분류) **[추측: 제출 대상 카테고리 코드]**, `submit_result: 'success' \| 'fail'` |
| 비고 | 증명서 활용률 측정. 제출 이력과 매핑 가능하도록 `cert_id` 필수 |

---

#### E08 — `cs_call_tap`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S8 언어별 고객센터 — [직통연결] 아이콘 탭 시 |
| 발화 조건 | `tel:` 링크 실행 직전 (탭 이벤트) |
| 이벤트별 속성 | `cs_country: string` (선택 국가/언어, 예: `VN`, `CN`), `call_time_type: 'business_hours' \| 'off_hours'` **[추측]** |
| 비고 | Flow D 핵심 전환 이벤트. 운영시간 외(off_hours) 탭 비율로 운영시간 안내 UX 개선 필요 여부 판단 |

---

#### E09 — `cs_screen_view`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S8 언어별 고객센터 진입 시 |
| 발화 조건 | 화면 마운트 완료 |
| 이벤트별 속성 | `entry_point: 'home_icon'` (현재 Home 아이콘 단일 진입) |
| 비고 | `cs_call_tap` 과 함께 고객센터 직통연결 이용률 분모 기준 이벤트 |

---

#### E10 — `wallet_cert_maintenance_view`

| 항목 | 내용 |
| --- | --- |
| 트리거 화면 | S3 신청가능목록 — 발급기관 점검 오류 상태 표시 시 |
| 발화 조건 | `list_load_status = 'maintenance'` 응답 수신 후 오류 화면 렌더 |
| 이벤트별 속성 | `cert_type_affected: string[]` (점검 영향 받는 증명서 종류 목록) **[추측]**, `maintenance_source: string` (기관 코드) **[추측]** |
| 비고 | 이탈 원인 구분 중 '기관 점검' 전용 이벤트. `E01`의 `list_load_status='maintenance'` 와 연계 분석 |

---

## 2. 이탈 원인 구분 측정 방법

| 이탈 원인 | 측정 이벤트 | 구분 속성 | 분석 방법 |
| --- | --- | --- | --- |
| 인증 실패 | `wallet_cert_auth_fail` | `fail_reason = 'wrong_pin' \| 'cert_expired' \| 'server_error'` | `fail_reason` 별 건수 집계. `fail_attempt` 분포로 차단 임박 구간 파악 |
| 타임아웃 | `wallet_cert_timeout` | `timeout_stage = 'auth' \| 'issue_request'` | `elapsed_ms` 분포 분석. P95 지연 임계 모니터링 |
| 기관 점검 | `wallet_cert_maintenance_view` | `maintenance_source` | 점검 발생 시간대·빈도 집계. `E01` 대비 점검 비율 추적 |
| 사용자 자발 이탈 | `wallet_cert_auth_fail` | `fail_reason = 'user_cancel'` | `E02` 발화 후 완료 없이 세션 종료 비율로 보완 측정 |
| 퍼널 중도 이탈 | (이벤트 부재) | S3 진입(`E01`) 후 S4 요청(`E02`) 미발생 | 세션 내 `E01` 있고 `E02` 없는 세션 비율 |

---

## 3. KPI 정의서

### KPI-01. 증명서 신청 완료율 (Certificate Request Completion Rate)

| 항목 | 내용 |
| --- | --- |
| 정의 | 신청가능목록(S3) 진입 후 신청 완료(S5)까지 도달한 비율 |
| 공식 | `wallet_cert_complete` 건수 ÷ `wallet_cert_step1_view` 건수 × 100 |
| 단위 | % |
| 기간 | 주간(W) / 월간(M) 집계 |
| 추적 이벤트 | `wallet_cert_step1_view` (분모), `wallet_cert_complete` (분자) |
| 세그먼트 | cert_type별, locale별, auth_method별, 플랫폼별 |
| 목표/임계값 | **[추측]** 런칭 초기 목표 ≥ 60%, 안정화 후 ≥ 75% |

---

### KPI-02. 단계별 이탈률 (Step Drop-off Rate)

| 항목 | 내용 |
| --- | --- |
| 정의 | 퍼널 각 단계 간 이탈 비율 |
| 공식 | (이전 단계 이벤트 수 - 다음 단계 이벤트 수) ÷ 이전 단계 이벤트 수 × 100 |
| 퍼널 단계 | Step 1(`wallet_cert_step1_view`) → Step 2(`wallet_cert_request`) → Step 3(`wallet_cert_complete`) |
| 단위 | % (단계별) |
| 기간 | 주간 / 월간 |
| 추적 이벤트 | `wallet_cert_step1_view`, `wallet_cert_request`, `wallet_cert_complete` |
| 세그먼트 | cert_type별, locale별 |
| 목표/임계값 | **[추측]** Step 1→2 이탈률 ≤ 30%, Step 2→3 이탈률 ≤ 25% |

---

### KPI-03. 인증 성공률 (Authentication Success Rate)

| 항목 | 내용 |
| --- | --- |
| 정의 | 인증 시도(`wallet_cert_request`) 중 실패 없이 완료된 비율 |
| 공식 | (`wallet_cert_request` 건수 - `wallet_cert_auth_fail` 건수 - `wallet_cert_timeout` 건수) ÷ `wallet_cert_request` 건수 × 100 |
| 단위 | % |
| 기간 | 일간(D) / 주간(W) 집계. 이상 급락 시 즉시 알림 필요 |
| 추적 이벤트 | `wallet_cert_request`, `wallet_cert_auth_fail`, `wallet_cert_timeout` |
| 세그먼트 | auth_method별(`joint_cert` / `ibk_cert`), fail_reason별, 플랫폼별 |
| 목표/임계값 | **[추측]** ≥ 80%. 70% 미만 시 알림 트리거 |

---

### KPI-04. 고객센터 직통연결 이용률 (CS Direct Call Rate)

| 항목 | 내용 |
| --- | --- |
| 정의 | 고객센터 화면(S8) 진입자 중 직통연결을 실제로 탭한 비율 |
| 공식 | `cs_call_tap` 건수 ÷ `cs_screen_view` 건수 × 100 |
| 단위 | % |
| 기간 | 주간 / 월간 |
| 추적 이벤트 | `cs_screen_view` (분모), `cs_call_tap` (분자) |
| 세그먼트 | cs_country별, call_time_type별(업무시간 내/외), locale별 |
| 목표/임계값 | **[추측]** 진입자의 ≥ 50% 직통연결 탭 (S8 진입이 대부분 통화 의도이므로) |

---

### KPI-05. 인증 실패율 세부 분류 (Auth Fail Breakdown Rate)

| 항목 | 내용 |
| --- | --- |
| 정의 | 인증 실패(`wallet_cert_auth_fail`) 중 fail_reason 유형별 구성 비율 |
| 공식 | 특정 `fail_reason` 건수 ÷ `wallet_cert_auth_fail` 전체 건수 × 100 |
| 단위 | % (reason별) |
| 기간 | 주간 |
| 추적 이벤트 | `wallet_cert_auth_fail` |
| 세그먼트 | fail_reason별, auth_method별 |
| 목표/임계값 | `server_error` 비율 ≤ 5% (서비스 안정성 지표) **[추측]** |

---

### KPI-06. 기관 점검 노출률 (Maintenance Exposure Rate)

| 항목 | 내용 |
| --- | --- |
| 정의 | 신청가능목록 진입자 중 기관 점검 상태를 만난 비율 |
| 공식 | `wallet_cert_maintenance_view` 건수 ÷ `wallet_cert_step1_view` 건수 × 100 |
| 단위 | % |
| 기간 | 일간 / 주간 |
| 추적 이벤트 | `wallet_cert_step1_view`, `wallet_cert_maintenance_view` |
| 세그먼트 | 시간대별, cert_type_affected별 |
| 목표/임계값 | 임계 없음(모니터링 지표). 급등 시 기관 점검 여부 확인 알림 트리거 **[추측]** |

---

### KPI-07. 증명서 활용률 (Certificate Utilization Rate)

| 항목 | 내용 |
| --- | --- |
| 정의 | 보관함에 있는 증명서 중 다운로드 또는 제출로 활용된 비율 |
| 공식 | (`cert_download` + `cert_submit`) 고유 cert_id 건수 ÷ 전체 보관 증명서 수 × 100 |
| 단위 | % |
| 기간 | 월간 |
| 추적 이벤트 | `cert_download`, `cert_submit` |
| 세그먼트 | cert_type별, download vs submit 구분 |
| 목표/임계값 | **[추측]** ≥ 40% (신청 후 미활용 방치 비율 관리) |

---

## 4. 수집 위치 — 구동민(프론트엔드 개발) 전달용

> 각 이벤트를 어느 컴포넌트/액션 시점에서 발화해야 하는지 명시합니다.
> 이벤트 수집 함수 예시: `analytics.track(event_name, properties)` **[추측: SDK 인터페이스]**

| 이벤트 | 화면 | 수집 위치 (컴포넌트/액션) | 발화 시점 |
| --- | --- | --- | --- |
| `wallet_cert_step1_view` | S3 | `CertListScreen` 마운트 후 데이터 렌더 완료 시점 | `useEffect` — 목록 렌더 완료 후 1회 |
| `wallet_cert_request` | S4 | `RequestAuthScreen` — [신청·인증] 버튼 `onPress` | 버튼 탭 핸들러 내부, API 호출 직전 |
| `wallet_cert_auth_fail` | S4 | `RequestAuthScreen` — 인증 API 에러 핸들러 | `catch` / 오류 응답 처리 블록 |
| `wallet_cert_timeout` | S4 | `RequestAuthScreen` — 타임아웃 에러 핸들러 | 타임아웃 에러 분기 처리 블록 |
| `wallet_cert_complete` | S5 | `CertCompleteScreen` 마운트 시 | `useEffect` — 화면 마운트 시 1회 |
| `cert_download` | S7 | `CertDetailScreen` — [다운로드] 버튼 `onPress` | 버튼 탭 핸들러 내부 (결과 무관 즉시) |
| `cert_submit` | S7 | `CertDetailScreen` — 제출 확정 API 응답 후 | 제출 성공/실패 응답 처리 블록 |
| `cs_screen_view` | S8 | `CsScreen` 마운트 시 | `useEffect` — 화면 마운트 시 1회 |
| `cs_call_tap` | S8 | `CsScreen` — [직통연결] 아이콘 `onPress` | `tel:` 링크 실행 직전 |
| `wallet_cert_maintenance_view` | S3 | `CertListScreen` — 기관 점검 오류 UI 렌더 시점 | `useEffect` — `list_load_status='maintenance'` 확인 후 |

---

## 5. 퍼널 분석표

```
[S3 진입] wallet_cert_step1_view          ← 퍼널 TOP (100%)
      │
      ▼ (이탈: 목록 이탈, 기관점검 이탈)
[S4 시작] wallet_cert_request              ← Step 2 전환율 = E02/E01
      │
      ├─ 이탈A: wallet_cert_auth_fail      ← 인증 실패 이탈
      ├─ 이탈B: wallet_cert_timeout        ← 타임아웃 이탈
      │
      ▼ (인증 성공)
[S5 완료] wallet_cert_complete             ← Step 3 전환율 = E05/E02
```

**이탈 원인 추가 분류:**
- 인증 실패: `wallet_cert_auth_fail.fail_reason` 기준 세부 분류
- 타임아웃: `wallet_cert_timeout.timeout_stage` 기준 Auth vs Issue Request 구분
- 기관 점검: `wallet_cert_maintenance_view` — S3 단계에서 이탈 처리

---

## 6. 대시보드 설계 (초안)

| 패널 | 지표 | 차트 유형 | 세그먼트 |
| --- | --- | --- | --- |
| 퍼널 현황 | 단계별 전환율 (KPI-02) | 퍼널 막대차트 | cert_type, locale |
| 신청 완료율 추이 | 완료율 주간 추이 (KPI-01) | 라인차트 | auth_method |
| 인증 성공률 | 일간 인증 성공/실패/타임아웃 (KPI-03) | 누적 막대 | fail_reason |
| 이탈 원인 분포 | fail_reason 비율 (KPI-05) | 도넛차트 | - |
| 고객센터 직통연결 | 이용률 + 운영시간 외 비율 (KPI-04) | 수치 카드 + 바차트 | cs_country |
| 기관 점검 노출 | 일간 노출률 추이 (KPI-06) | 라인차트 (경보 라인 포함) | - |
| 증명서 활용 | 다운로드 vs 제출 비율 (KPI-07) | 스택 막대 | cert_type |

---

## 7. 미확정 및 리스크

| 항목 | 내용 | 담당 |
| --- | --- | --- |
| 인증 3회 실패 차단 정책 | 화면설계서에 [추측]으로 표기. 차단 횟수 확정 필요 | 나기획, 백연동 |
| `cert_type` 코드 확정 | 4종 증명서 내부 코드명 미확정 | 백연동(API 스펙) |
| 제출 대상(`submit_target`) 코드 | 제출 대상 카테고리 정의 필요 | 나기획 |
| 운영시간 외 판정 기준 | `call_time_type` 판정 로직(서버/클라이언트 여부) | 백연동 |
| 분석 SDK 인터페이스 | `analytics.track()` 실제 SDK 미정 | 백연동, 구동민 |
| `user_id` 익명성 처리 | 외국인 개인정보 처리 방침에 따라 익명화 수준 결정 필요 | 정우선(PO), 법무 검토 |
| 타임아웃 기준 시간(ms) | `elapsed_ms` 임계값 미정 | 백연동(API 스펙) |

---

## 핸드오프

### → 구동민(프론트엔드 개발)
- 4절 "수집 위치" 기반으로 각 화면 컴포넌트에 이벤트 발화 코드 삽입 요청
- 공통 속성(`user_id`, `locale`, `session_id`, `timestamp`)은 전역 analytics 래퍼에서 자동 주입 권장 **[추측]**

### → 백연동(백엔드 개발)
- 이벤트 수집 엔드포인트 및 저장 스키마 설계 요청
- `cert_type`, `submit_target`, 운영시간 판정 API 스펙 확정 후 이벤트 속성값 업데이트 필요

### → 홍보라(마케팅)
- KPI-01(완료율), KPI-04(고객센터 직통연결 이용률)를 캠페인 성과 기준 지표로 전달
- locale/국가 세그먼트 기반 리텐션 분석은 캠페인 타겟 설계에 활용 가능

### → 정우선(PO)
- KPI 목표/임계값은 현재 [추측] 상태. 런칭 전 확정 요청
- `user_id` 익명화 처리 정책 결정 필요 (법무 연계)
