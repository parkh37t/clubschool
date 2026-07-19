# Phase 1 — 멀티테넌트 코어 상세 설계 (con-mgt 기준 착수 문서)

> 대상: 백엔드/DB 구현팀. 근거: `_source-package/04_데이터_구조.md`(현 DDL·payload), `05_SaaS_전환_설계.md`(§3·§4), `06_배포_운영_노하우.md`(§1·§5). 상위: `00-strategy/01_패키징-방안.md` §7·§10.
> 목표 한 줄: **신규 회사 = `tenants` 1행 + `state` 1행 + `users` 1행**. "코드=공통 로직, `settings`=회사가 다른 모든 것."

---

## 0. 범위 (In / Out)

**In (Phase 1):**
- 스키마: `tenants` 신설 · 전 테이블 `tenant_id` · `state` 단일행(id=1)→테넌트당 1행 · `xmin`→명시적 `version` 컬럼.
- 격리: JWT `tenant` claim + Postgres **RLS**(2중 방어) + 앱계층 tenant-scope.
- 테넌트 라우팅: `{slug}.clubschool.io` 서브도메인 → tenant 해석.
- 하드코딩 → `tenants.settings` 추출(우선순위 1·2군, §3).
- 선행 리스크 병행: `version` 전환(리스크1) · `ADMIN_INITIAL_EMAIL` env화(리스크3).
- 기존 단일 테넌트(현 운영 데이터) → 첫 테넌트로 이관.
- 격리 자동 테스트(게이트).

**Out (후속 Phase):** 온보딩 마법사(Phase 2) · LLM(Phase 3) · 과금/좌석(Phase 4) · 단일 JSONB→도메인 테이블 분해(성장 테넌트, Phase 3) · 클라이언트→서버 마이그레이션 완전 이관(리스크2, 점진).

---

## 1. 스키마 설계 (idempotent DDL)

현 `ensureSchema()`(SCHEMA + SCHEMA_PATCH, `db.js`) 패턴을 유지 — 콜드스타트/기동 시 `CREATE TABLE IF NOT EXISTS` + `ALTER … ADD COLUMN IF NOT EXISTS`로 멱등 적용.

### 1.1 tenants (신설)
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,           -- 서브도메인 키 ({slug}.clubschool.io)
  name       TEXT NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'starter',-- starter|pro|enterprise
  status     TEXT NOT NULL DEFAULT 'active', -- active|suspended
  settings   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- §2 계약
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.2 users (tenant_id 추가 · username 유니크 범위 변경)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
-- 현재 username 전역 UNIQUE → 테넌트별 UNIQUE 로 전환(서브도메인 로그인 전제)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_username ON users(tenant_id, lower(username));
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
```
- `role`(admin|member)·`perms`(cost/report/manpower/project/exec × none/read/write) 구조는 **그대로 유지** — 테넌트 내부 권한으로 재사용(05 §2). admin은 이제 "테넌트 관리자"(전역 아님).

### 1.3 state (핵심: 단일행 → 테넌트당 1행, xmin → version)
```sql
-- 신규 배포: tenant_id PK. (기존 DB 이관은 §5)
CREATE TABLE IF NOT EXISTS state (
  tenant_id  UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  payload    JSONB NOT NULL,
  version    BIGINT NOT NULL DEFAULT 1,      -- xmin 대체(낙관적 잠금, §4)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
```
- **`CHECK(id=1)` 제거**가 핵심 변경. payload 스키마(months/projects/manpower/… — 04 §2)는 **불변**이라 프론트 렌더 코드 영향 최소.
- 10MB 캡(413)·완전중복 제거(`name|project|joinedAt|leftAt`)·`Cache-Control:no-store` 원칙 유지(04 §1.2, 06 §5.6).

### 1.4 인증 부속 테이블 (tenant_id 추가)
```sql
ALTER TABLE pending_signups  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE password_resets  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE login_attempts   ADD COLUMN IF NOT EXISTS tenant_id UUID;  -- FK 생략(고빈도·정리대상)
-- rate-limit 키를 테넌트로 분리: attempt_key = 'tenant_id|username|ip'
CREATE INDEX IF NOT EXISTS idx_pending_tenant ON pending_signups(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_preset_tenant  ON password_resets(tenant_id, status);
```

---

## 2. `tenants.settings` 키 계약 (하드코딩 추출의 목적지)

현 코드의 회사 고유 상수(04 §5)를 이 JSONB 하나로 이전한다. **런타임 로직은 이 계약만 읽는다.**

```jsonc
{
  "orgUnits": [                              // ← DIV_2/DIV_3, ORG_DEFAULT_DIVISIONS (개수 가변)
    { "id": "u1", "name": "본부 A", "order": 1 },
    { "id": "u2", "name": "본부 B", "order": 2 }
  ],
  "roles":  ["PM","PMO","LEADER","기획","디자인","퍼블리싱","개발"],  // ← ORG_DEFAULT_ROLES
  "grades": ["초급기술자","중급기술자","고급기술자","특급기술자"],
  "roleAliases": { "PA": "기획", "CD": "디자인" },                     // ← _normRole 하드코딩
  "employmentTypes": { "internalLabel": "정직원" },                    // ← empType==='와일리' 판정 중립화
  "branding": {                              // ← utils/mailer.js, 덱 표지, 회사명
    "companyName": "회사명",
    "logo": "https://…",
    "palette": { "primary": "#…", "accent": "#…" },
    "coverText": "월간 경영보고",
    "loginUrl": "https://slug.clubschool.io",
    "mailFromName": "회원 시스템"
  },
  "plan": {                                  // ← SAJEONG_BASELINE, TARGET_*, BONBU_LABOR_PLAN
    "targets": { "2026": { "revenue": 0, "opProfit": 0 } },
    "baseline": {                            // 조직×항목 사업계획(연도별)
      "2026": {
        "byUnit": { "u1": { "rev":0,"oi":0,"gp":0,"cogs":0,"sga":0 } },
        "total":  { "rev":0,"oi":0,"gp":0,"cogs":0,"sga":0 }
      }
    },
    "laborByUnit": { "u1": [0,0,0,0,0,0,0,0,0,0,0,0] }  // 본부×월 정직원 인건비 계획(forecast 근거)
  },
  "accounting": {                            // ← 진행매출 인식·SG&A 배부·마감월
    "recognition": "progress",               // progress|invoice
    "sgaAllocation": "even",                 // SG&A = 판관비−인건비, 균등/12
    "closedMonthDefault": null               // fallback '4' 제거 → 명시값만
  },
  "standardRatesDefault": {                  // ← STANDARD_RATES_DEFAULT (테넌트 기본값만; 편집본은 payload.standardRates 유지)
    "PM": { "특급":0,"고급":0,"중급":0,"초급":0 }
  },
  "uploadTemplate": {                        // ← 결산/실행 엑셀 양식 결합(04 §5.5)
    "version": "v2",
    "settlementSheets": { "인건비":"labor","세금계산서|발행매출":"invoice","입금":"payment","턴키|매입":"purchase","직접비":"expense","손익|요약":"summary","진행매출":"projects3" },
    "execCells": { "maxRows": 19 }           // ← EXEC_MAX_ROWS
  }
}
```

**추출 원칙**
- **제거(시드→데이터):** `KMAP`/`KMAP_PB`(→projects 이름매칭+확인 UI) · `EXEC_FILE_MAP`+`pnl_data.json` · `WOORI_PLAN` · `PEOPLE_SEED` · `HQ_PEOPLE_MASTER` · `defaultContractSalesSeed`(실계약) · 마이그레이션 내 실명/실프로젝트.
- **중립화:** `empType==='와일리'` → `settings.employmentTypes.internalLabel` 비교, 또는 `empType:'internal'|'external'` 코드.
- **payload 유지:** `standardRates`·`orgConfig`는 이미 payload 편집 가능 → 테넌트 **기본값만** settings에서 시드, 이후 편집본은 payload에.
- **문자열키→ID키:** 본부를 이름 문자열이 아니라 `orgUnits[].id`로 참조(참조-스왑 `_divData` 부채 제거는 리스크5, 점진).

---

## 3. 하드코딩 추출 착수 순서 (스프린트 분해)

| 순번 | 작업 | 대상 상수/파일 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | 조직 구조 데이터화 | `DIV_2/DIV_3`·`ORG_DEFAULT_*`·`_PROJ_DIV_CANON` (index.html) | 본부 N개 가변, 문자열키→`orgUnits[].id` |
| 2 | 관리자/브랜딩 env·settings화 | `seed.js:18`(admin 이메일)·`utils/mailer.js:9-11` | `ADMIN_INITIAL_EMAIL` 신설, 메일/URL은 `settings.branding` |
| 3 | 사업계획 baseline 데이터화 | `SAJEONG_BASELINE`·`TARGET_*`·`BONBU_LABOR_PLAN` | `settings.plan`에서 주입, SG&A 산식 옵션화 |
| 4 | 프로젝트 매핑 일반화 | `KMAP`/`KMAP_PB` | 이름 유사도 매칭 + 확인 UI, projects3 동적화 |
| 5 | 인사·단가·고용형태 | `HQ_PEOPLE_MASTER`·`PEOPLE_SEED`·`empType==='와일리'` | manpower를 SSOT로, 시드 제거, 고용형태 중립코드 |
| 6 | 정적 시드 번들 제거 | `EXEC_FILE_MAP`·`pnl_data.json`·`WOORI_PLAN` | 전부 업로드 기반(execPnLBaseline) |

---

## 4. `version` 낙관적 잠금 (xmin 대체 · 리스크1)

현: GET이 `xmin::text AS ver` 반환, PUT이 `baseVer==xmin`일 때만 UPDATE(409 시 최신 반환) — `routes/data.js:11,69-86`. Postgres 전용 시스템컬럼 의존 제거.

```sql
-- GET /api/data  (tenant 스코프 + RLS)
SELECT payload, version AS ver FROM state WHERE tenant_id = current_setting('app.current_tenant')::uuid;

-- PUT /api/data  (baseVer 일치 시에만)
UPDATE state
   SET payload = $1, version = version + 1, updated_at = NOW(), updated_by = $2
 WHERE tenant_id = current_setting('app.current_tenant')::uuid
   AND version = $baseVer
RETURNING version AS ver;
-- 0행 → 409 Conflict + 최신 payload/ver 반환 (기존 "먼저 저장 우선" 정책 유지)
```
- 경량 폴링 `GET /api/data/ver`도 `xmin` → `version`으로 교체.
- 서버측 완전중복 제거(routes/data.js:36-53)는 그대로.

---

## 5. 격리 강제 흐름 (JWT → 세션 GUC → RLS 2중 방어)

**핵심 규칙: 클라이언트는 `tenant_id`를 절대 전송하지 않는다. 서버가 JWT/서브도메인에서 도출한다.**

### 5.1 토큰·요청 파이프라인
```
{slug}.clubschool.io 요청
  → (a) 서브도메인 slug → tenants.id 해석(캐시)
  → (b) authOptional: JWT 검증(middleware/auth.js). JWT payload에 tenant_id 포함.
        signToken(user) = { id, username, role, tenant_id }   ← 확장
  → (c) 가드: JWT.tenant_id === 서브도메인 tenant_id 아니면 401 (토큰 교차 재사용 차단)
  → (d) req 스코프 DB 트랜잭션마다:
        SELECT set_config('app.current_tenant', $tenantId, true);  -- 트랜잭션 로컬(local=true)
        … 실제 쿼리 …
```
> ⚠ **풀러 주의:** 서버리스 + Supabase Transaction pooler(6543)에서는 세션 GUC가 커넥션 간 누수 위험 → 반드시 `set_config(…, true)`(트랜잭션 로컬) + 쿼리를 같은 트랜잭션(BEGIN/COMMIT)으로 감쌀 것. `db.js` 풀 `max:4`·pooler 필수 조건(06 §2.2)과 함께 관리.

### 5.2 RLS 정책 (DB 최종 방어선)
```sql
ALTER TABLE state           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_state ON state
  USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
-- users/pending_signups/password_resets 동일 패턴으로 각각 생성.
```
- 앱 계층(tenant-scoped 쿼리) + RLS(정책) = **2중 방어**. 앱 코드에 필터를 빠뜨려도 DB가 차단.
- 마이그레이션/시드 등 관리 작업은 `BYPASSRLS` 롤 또는 `SET app.current_tenant`로 대상 테넌트 지정.
- `tenants`·`login_attempts`는 RLS 미적용(전자는 slug 해석용 공개 최소필드, 후자는 앱 로직이 tenant 키로 스코프).

---

## 6. 기존 데이터 이관 (단일 테넌트 → 첫 테넌트)

현 운영 DB는 `state(id=1)` 단일행 + 전역 users. Phase 1 배포 시 1회 이관:
```sql
-- 1) 첫 테넌트 생성
INSERT INTO tenants(slug, name, plan) VALUES ('conv', '컨버전스', 'pro')
  ON CONFLICT (slug) DO NOTHING;
-- 2) 기존 payload 승계 (id=1 → tenant_id)
INSERT INTO state(tenant_id, payload, version, updated_at, updated_by)
  SELECT (SELECT id FROM tenants WHERE slug='conv'), payload, 1, updated_at, updated_by
  FROM state_legacy WHERE id = 1;   -- 구 테이블 리네임 후
-- 3) 기존 users 전원 이 테넌트로
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug='conv') WHERE tenant_id IS NULL;
```
- 이관 스크립트는 멱등·백업 선행(`SELECT payload FROM state WHERE id=1 > 백업.json`, 06 §5.2) 후 실행.
- 본부(`_divData` 2·3본부)는 이관 후에도 payload 내부 구조라 그대로 동작 → `orgUnits`로의 정규화는 리스크5(점진).

---

## 7. 영향 파일 · 변경 요약

| 파일 | 변경 |
| --- | --- |
| `db.js` | SCHEMA/PATCH에 tenants·tenant_id·version·RLS DDL 추가. 트랜잭션 헬퍼(`withTenant(tenantId, fn)`)로 GUC 설정 |
| `middleware/auth.js` | `signToken`에 tenant_id 포함, `authOptional`이 req.tenantId 세팅 + 서브도메인 일치 가드 |
| `routes/data.js` | GET/PUT을 `withTenant` 트랜잭션으로, `xmin`→`version`, tenant 필터 |
| `routes/auth.js` | 가입/승인/로그인/rate-limit 키에 tenant_id, `sanitizePerms` 재사용 |
| `seed.js` | `ADMIN_INITIAL_EMAIL` env화, 첫 테넌트 생성 + 이관 로직 |
| `utils/mailer.js` | 발신명·LOGIN_URL을 `settings.branding`에서 |
| `public/index.html` | 하드코딩 상수(§3) → 서버가 내려주는 `settings` 소비. 렌더 로직 골격 불변 |
| (신설) `middleware/tenant.js` | 서브도메인 slug→tenant 해석·캐시 |

---

## 8. 완료 게이트 (머지 조건)

- [ ] `npm run type-check`/`lint(--max-warnings 0)`/`build` 통과, 회귀 188개 유지·통과.
- [ ] **테넌트 격리 자동 테스트**: 테넌트 A 토큰으로 B의 `state`/`users`/가입큐 조회 시 **0행**(앱 필터 제거해도 RLS가 차단됨을 별도 케이스로 검증).
- [ ] `version` 낙관적 잠금: baseVer 불일치 PUT → 409 + 최신 반환(동시편집 시뮬).
- [ ] 이관 스크립트 멱등: 재실행해도 중복/손상 없음, 이관 후 기존 대시보드·예측·보고서 동일 렌더.
- [ ] 신규 테넌트 e2e: `tenants`+`state`+`users` 각 1행 생성만으로 빈 대시보드 진입.
- [ ] `settings` 미설정 테넌트도 기본값으로 크래시 없이 렌더(빈/누락 상태 방어).

---

## 9. 다음(Phase 2) 인계 포인트
- 온보딩 마법사 5단계는 이 `settings` 계약(§2)과 최소 데이터 5종(패키징 §5)에 직접 기록. 3·4단계는 검증된 결산 업로드 UX 재사용.
- 화면 정의(`service-planning`): 테넌트 생성·조직/브랜딩·목표 설정·멤버 초대 화면.

> 결정 대기(상위 §8): username 유니크 범위(테넌트별 권고) · slug 정책 · 첫 테넌트 slug('conv' 예시) · RLS 적용 테이블 범위.
