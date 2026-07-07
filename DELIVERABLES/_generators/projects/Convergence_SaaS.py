#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude-native 오피스 생성기 — 컨버전스 SaaS(과제 #3) 제품 기획 종합안.
두 형태로 산출한다.
  - 경영 보고형(PPTX): 의사결정 중심 12장 (본부장/경영진용)
  - 실무 보고형(DOCX): 전 섹션 상세 + 표 (팀 실행용)
엔진(python-pptx/docx)은 공유 자산, 내용만 과제별. 근거: PROJECT/Convergence_SaaS/00-strategy/00_종합안.md
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR
from pptx.oxml.ns import qn
from docx import Document
from docx.shared import Pt as DPt, RGBColor as DRGB, Inches as DIn
from docx.enum.text import WD_ALIGN_PARAGRAPH

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "..", "..", "Convergence_SaaS")
KO = "Malgun Gothic"

# Converge 팔레트 — 인디고 프라이머리 + 딥네이비 다크 + 시안 액센트
INDIGO = RGBColor(0x4F, 0x46, 0xE5)
NAVY   = RGBColor(0x0F, 0x17, 0x2A)
CYAN   = RGBColor(0x06, 0xB6, 0xD4)
FG     = RGBColor(0x1E, 0x29, 0x3B)
MUT    = RGBColor(0x64, 0x74, 0x8B)
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
RED    = RGBColor(0xDC, 0x26, 0x26)  # 블로커(M0) 강조


def ea(r, name=KO):
    r.font.name = name
    rPr = r._r.get_or_add_rPr()
    e = rPr.find(qn('a:ea'))
    if e is None:
        e = rPr.makeelement(qn('a:ea'), {}); rPr.append(e)
    e.set('typeface', name)


# ─────────────────────────────── 경영 보고형 (PPTX) ───────────────────────────────
def build_pptx(path):
    prs = Presentation(); prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]; W, H = prs.slide_width, prs.slide_height

    def slide(bg=WHITE):
        s = prs.slides.add_slide(blank); r = s.shapes.add_shape(1, 0, 0, W, H)
        r.fill.solid(); r.fill.fore_color.rgb = bg; r.line.fill.background(); r.shadow.inherit = False
        s.shapes._spTree.remove(r._element); s.shapes._spTree.insert(2, r._element); return s

    def tb(s, x, y, w, h, anc=MSO_ANCHOR.TOP):
        b = s.shapes.add_textbox(x, y, w, h); b.text_frame.word_wrap = True; b.text_frame.vertical_anchor = anc
        return b.text_frame

    def ln(tf, t, sz, c, b=False, first=False, sp=6):
        p = tf.paragraphs[0] if first else tf.add_paragraph(); p.space_after = Pt(sp)
        r = p.add_run(); r.text = t; r.font.size = Pt(sz); r.font.bold = b; r.font.color.rgb = c; ea(r)
        return p

    def bar(s):
        b = s.shapes.add_shape(1, 0, 0, Inches(0.14), H); b.fill.solid(); b.fill.fore_color.rgb = CYAN
        b.line.fill.background(); b.shadow.inherit = False

    def hdr(s, kicker, t):
        bar(s)
        ln(tb(s, Inches(0.8), Inches(0.42), Inches(11.7), Inches(0.4)), kicker, 14, INDIGO, True, True)
        ln(tb(s, Inches(0.8), Inches(0.78), Inches(11.7), Inches(0.9)), t, 30, NAVY, True, True)

    def bul(s, items, y=Inches(1.9), sz=17, x=Inches(0.9), w=Inches(11.6)):
        tf = tb(s, x, y, w, Inches(5))
        for i, it in enumerate(items):
            ln(tf, "•  " + it, sz, FG, first=(i == 0), sp=11)

    # 1 표지
    s = slide(NAVY)
    tf = tb(s, Inches(0.9), Inches(2.1), Inches(11.5), Inches(3.4))
    ln(tf, "컨버전스1팀 · 제품 기획 종합안 (경영 보고)", 16, CYAN, True, True, 14)
    ln(tf, "Converge", 54, WHITE, True, sp=2)
    ln(tf, "인력 가동률·유휴비용을 5분 만에 금액으로 보는 한국형 Lite PSA SaaS", 19, WHITE, sp=6)
    ln(tf, "과제 #3 · 컨버전스 실적관리 → 멀티테넌트 SaaS+AI · 기준일 2026-07-07", 14, MUT, sp=2)

    # 2 한 줄 요약 / 비전
    s = slide(); hdr(s, "SUMMARY", "한 줄 요약 · 비전")
    ln(tb(s, Inches(0.9), Inches(1.75), Inches(11.5), Inches(1.4)),
       "\"엑셀로 흩어진 가동률·맨먼스·유휴비용을, 여러 회사가 각자의 데이터로 5분 만에 보고 "
       "AI가 다음 투입 결정까지 돕는 SaaS\"", 22, INDIGO, True, True, 6)
    bul(s, [
        "이미 실조직(56명)에서 검증된 계산 엔진을 멀티테넌트로 전환",
        "목표: 2개 분기 내 파일럿 5~10개 테넌트 확보",
        "비전: 사람의 시간을 파는 프로젝트 조직이 가동을 실시간 가시화하고 투입 결정을 근거 기반으로",
    ], y=Inches(3.4))

    # 3 해결 문제
    s = slide(); hdr(s, "PROBLEM", "해결 문제 — 3대 손실")
    bul(s, [
        "유휴/과투입 비가시성 — 누가 벤치이고 누가 초과투입인지 월말에야 안다 → 유휴 인건비가 마진 잠식",
        "느린 투입 의사결정 — 가동률·여력·단가가 흩어져 '일단 되는 사람'으로 배정",
        "재무와 단절된 가동률 — 가동률(%)이 유휴비용·매출기여로 환산되지 않아 경영 언어로 보고 불가",
    ], y=Inches(1.95))
    ln(tb(s, Inches(0.9), Inches(5.5), Inches(11.5), Inches(1.2)),
       "핵심 Aha:  \"우리 팀이 지금 낭비하는 유휴비용이 월 ○○○만원\"을 처음 금액으로 봤을 때", 18, CYAN, True, True)

    # 4 타깃 ICP
    s = slide(); hdr(s, "TARGET", "타깃 ICP — 빈 시장(스윗스팟)")
    bul(s, [
        "업종: 디지털 에이전시 → SI/SM 개발사 → 컨설팅/리서치 대행 → 사내 PMO",
        "규모: 20~200명 (스윗스팟 30~120명) — 엑셀은 한계, 해외 PSA는 과함",
        "구조: 본부/그룹 2~3단계, 목표 가동률(예: 90%)을 관리하는 관리자 존재",
        "챔피언/바이어: PM·PMO·사업관리팀장 / 본부장·COO·대표",
        "구매 트리거: 50명 넘어 엑셀 붕괴 · 경영진 가동률 보고 요구 · 신규 수주 투입 시뮬",
        "Anti-ICP: 프리랜서 · 빌러블 없는 상시운영 · 5명 이하 · 이미 Kantata급 보유 대기업",
    ], y=Inches(1.9), sz=16)

    # 5 제품 개요 3기둥
    s = slide(); hdr(s, "PRODUCT", "제품 개요 — 3기둥")
    bul(s, [
        "① 멀티테넌트 코어 — 재사용 자산(도메인 타입·계산 규칙·useDataStore·shadcn UI·승인 WF)은 살리고 tenantId·인증·서버만 신설",
        "② 기준데이터 온보딩 — 하드코딩(그룹·근무일·단가·목표)을 테넌트가 CRUD하는 마스터로 승격, 4단계 위저드로 TTV 최소화",
        "③ AI 레이어 — 자연어 질의·자동 브리핑을 얹되 재무 수치는 앱이 계산, Claude는 서사·추천만 (환각 구조적 차단)",
    ], y=Inches(1.95), sz=16)
    ln(tb(s, Inches(0.9), Inches(5.4), Inches(11.5), Inches(1.2)),
       "차별화 3축:  한국형 맨먼스 네이티브 · 가동률의 유휴비용(금액) 환산 · 5분 셋업(마찰 1/10)", 17, INDIGO, True, True)

    # 6 MVP 범위
    s = slide(); hdr(s, "SCOPE", "MVP 범위 — M0~M6")
    tf = tb(s, Inches(0.9), Inches(1.85), Inches(11.6), Inches(5))
    ln(tf, "M0  정합성 버그 선수정 — 파생계산의 모듈상수 참조를 인자 주입으로 전환   ★ 협상 불가 선행조건", 17, RED, True, True, 10)
    for t in [
        "M1  멀티테넌시 최소 — 전 엔티티 tenantId · 단일 DB + RLS 격리",
        "M2  인증 + 최소 RBAC(관리자/편집자/뷰어) · 신원 서버 주입",
        "M3  온보딩 위저드 — 조직/그룹 → 멤버(CSV+수기) → 캘린더/목표",
        "M4  대시보드 + 가동률/유휴비용 (파생계산 서버 이전) — 핵심 Aha",
        "M5  인력·프로젝트·투입 CRUD + 승인 워크플로우",
        "M6  AI 1종 — 유휴 인력 → 적합 프로젝트 배정 추천",
    ]:
        ln(tf, t, 16, FG, sp=9)
    ln(tf, "제외(v1+): 결제 자동화 · 화이트라벨 · 3단계+ 계층 · SSO/SAML · 대량 마이그레이션", 14, MUT, sp=2)

    # 7 아키텍처
    s = slide(); hdr(s, "ARCHITECTURE", "아키텍처 요지 — 격리·인증·데이터계층")
    bul(s, [
        "격리: Vercel + Supabase(Seoul) 공유 Postgres + row-level tenant_id + Postgres RLS(최종 방어선) + 앱계층 2중 방어",
        "인증/인가: Supabase Auth(이메일/매직링크 + Google·Kakao·SSO), 시스템 역할(Owner/Admin/Editor/Viewer)을 직무와 분리",
        "데이터계층: useDataStore 시그니처 유지 + 내부 DataSource 추상화(즉시 롤백), 파생계산은 서버(SQL 뷰/RPC)로 이전",
        "보안 P0: 요율·개인정보 평문저장 제거 · import 스키마검증(zod) · TLS 전구간 · 감사로그 · PIPA 대응",
    ], y=Inches(1.9), sz=15)

    # 8 AI 로드맵
    s = slide(); hdr(s, "AI", "AI 로드맵 — MVP → 차기")
    bul(s, [
        "정직성 원칙: Claude를 빼도 성립하면 'AI 장식' → 코어는 자연어·서사, 재무 숫자는 앱이 계산",
        "MVP: F5 자동 주간/월간 인사이트 브리핑(1순위·리텐션 훅) · F4 자연어 질의→리포트/차트(차별화 핵심)",
        "차기1: F8 비용 최적화 시뮬(what-if) · F2 인력 최적 배치 추천",
        "차기2~3: 리스크/지연 예측·수요 예측 — 월별 스냅샷 6~12개월 축적 후 (기간 모델 인프라와 결합)",
    ], y=Inches(1.9), sz=16)

    # 9 GTM / 가격
    s = slide(); hdr(s, "GTM", "GTM · 가격 요지")
    bul(s, [
        "포지셔닝: 빌러블 팀을 위한 가볍고 한국형인 가동률·리소스 대시보드(Lite PSA)",
        "가격(연납): Free(10명) → Pro ₩9,900/명·월 → Business ₩19,000/명·월 → Enterprise 견적",
        "Converge AI 애드온 +₩4,000/명·월 · 뷰어 무료(바이럴 확장) · 14일 무카드 트라이얼",
        "획득: 엑셀 템플릿 리드마그넷+SEO · 디스콰이엇/제품헌트 런칭 · '유휴비용 30분 진단' 아웃바운드",
    ], y=Inches(1.9), sz=16)
    ln(tb(s, Inches(0.9), Inches(5.5), Inches(11.5), Inches(1.2)),
       "랜딩 헤드라인:  \"우리 팀이 지금 얼마나 놀고 있는지, 5분 만에 금액으로 봅니다\"", 17, INDIGO, True, True)

    # 10 로드맵
    s = slide(); hdr(s, "ROADMAP", "단계 로드맵 — 분기별")
    bul(s, [
        "MVP 2026 Q3~Q4 (파일럿 5~10) : Q3 M0→M1(테넌시·RLS)→Supabase 구축→M2(인증)  /  Q4 M3 온보딩→M4 대시보드→M5 CRUD→M6 AI+F5 브리핑",
        "v1 2027 Q1~Q2 (유료 30) : 결제/구독·좌석과금 · TTV 개선 · 서버 사전집계 · F4 자연어 질의 · 기간(period) 모델 정식화",
        "v2 2027 Q3~Q4 (스케일·엔터프라이즈) : 다본부 계층 · 화이트라벨 · SSO/SAML · 전용 DB · AI 3종 · 오픈 API",
    ], y=Inches(2.0), sz=15)
    ln(tb(s, Inches(0.9), Inches(5.4), Inches(11.5), Inches(1)),
       "게이트: type-check/lint(--max-warnings 0)/build 통과 + 테넌트 격리 자동 테스트(A토큰으로 B데이터 0건)", 14, MUT, True, True)

    # 11 리스크 · 경영 결정
    s = slide(); hdr(s, "RISK & DECISION", "핵심 리스크 · 경영 결정 필요 6건")
    tf = tb(s, Inches(0.9), Inches(1.85), Inches(11.6), Inches(2.4))
    ln(tf, "핵심 리스크", 17, NAVY, True, True, 6)
    for t in [
        "A1 지불의사(PMF) — 파일럿에서 ARPA·ROI 검증",
        "A3 데이터 정합성 = 재무 신뢰 전제 → M0 선수정 필수(치명)",
        "A4 단일 DB+RLS 격리 결함 = 타사 데이터 노출 → 격리 자동 테스트",
    ]:
        ln(tf, "• " + t, 15, FG, sp=6)
    tf2 = tb(s, Inches(0.9), Inches(4.35), Inches(11.6), Inches(2.6))
    ln(tf2, "경영 결정 필요 (팀 권고안 제시, 확정은 경영)", 17, INDIGO, True, True, 6)
    for t in [
        "① 격리 방식(단일 DB+RLS 권고)   ② 요금 모델(좌석당 vs 정액 vs 구간제)   ③ 조직 계층 깊이(2~3단계 권고)",
        "④ 기존 localStorage 이관 범위   ⑤ 컴플라이언스 목표(ISMS-P/SOC2 시점)   ⑥ 교차테넌트 벤치마킹 상품화 여부",
    ]:
        ln(tf2, "• " + t, 15, FG, sp=6)

    # 12 즉시 액션 + 마무리
    s = slide(NAVY)
    ln(tb(s, Inches(0.9), Inches(0.7), Inches(11.5), Inches(1)), "즉시 다음 액션 (착수 순서)", 30, WHITE, True, True)
    tf = tb(s, Inches(0.9), Inches(1.9), Inches(11.6), Inches(4.4))
    acts = [
        "[블로커] M0 정합성 버그 수정 — data/mockData.ts 파생계산 인자화 · Math.random 시드 제거",
        "타입 계약 확정 — types/index.ts에 Tenant/User/Membership/Role · 전 엔티티 tenantId 추가",
        "DataSource 추상화 도입 — useDataStore 리팩터(시그니처 유지, 사용자 무영향)",
        "경영 결정 4건 회수 — 격리·요금·계층·데이터 이관",
        "인프라 셋업 — Supabase(Seoul) 프로젝트 · tenant_id+RLS 스키마 초안 · 배포 일원화",
        "파일럿 3~5개사 사전 접촉 — '유휴비용 진단' 훅으로 지불의사·ARPA 인터뷰",
        "화면 정의 인계 — 온보딩 위저드 4단계·권한 설정·AI 배정추천 UX",
    ]
    for i, a in enumerate(acts):
        ln(tf, f"{i+1}.  {a}", 15, WHITE, first=(i == 0), sp=8)
    ln(tb(s, Inches(0.9), Inches(6.6), Inches(11.5), Inches(0.7)),
       "먼저 M0를 고치면, 나머지는 검증된 엔진 위에 얹는 일입니다.", 16, CYAN, True, True)

    prs.save(path)


# ─────────────────────────────── 실무 보고형 (DOCX) ───────────────────────────────
def build_docx(path):
    d = Document()
    d.styles['Normal'].font.name = KO; d.styles['Normal'].font.size = DPt(10.5)

    def H1(t):
        p = d.add_paragraph(); r = p.add_run(t); r.bold = True; r.font.size = DPt(15)
        r.font.color.rgb = DRGB(0x4F, 0x46, 0xE5); r.font.name = KO
        p.space_before = DPt(12); p.space_after = DPt(4)

    def H2(t):
        p = d.add_paragraph(); r = p.add_run(t); r.bold = True; r.font.size = DPt(12)
        r.font.color.rgb = DRGB(0x0F, 0x17, 0x2A); r.font.name = KO
        p.space_before = DPt(8); p.space_after = DPt(2)

    def P(t, color=None, bold=False):
        p = d.add_paragraph(); r = p.add_run(t); r.font.size = DPt(10.5); r.font.name = KO; r.bold = bold
        if color:
            r.font.color.rgb = color
        return p

    def B(items):
        for it in items:
            p = d.add_paragraph(); p.paragraph_format.left_indent = DIn(0.25)
            r = p.add_run("• " + it); r.font.size = DPt(10.5); r.font.name = KO

    def table(headers, rows):
        t = d.add_table(rows=1, cols=len(headers)); t.style = 'Light Grid Accent 1'
        for i, h in enumerate(headers):
            c = t.rows[0].cells[i]; c.text = ""
            r = c.paragraphs[0].add_run(h); r.bold = True; r.font.size = DPt(9.5); r.font.name = KO
        for row in rows:
            cells = t.add_row().cells
            for i, v in enumerate(row):
                cells[i].text = ""
                r = cells[i].paragraphs[0].add_run(v); r.font.size = DPt(9.5); r.font.name = KO
        d.add_paragraph()

    # 표지
    t = d.add_paragraph(); r = t.add_run("Converge — 컨버전스 SaaS 제품 기획 종합안 (실무 보고형 v1)")
    r.bold = True; r.font.size = DPt(18); r.font.color.rgb = DRGB(0x0F, 0x17, 0x2A); r.font.name = KO
    P("과제 #3 · 컨버전스 실적관리 → 멀티테넌트 SaaS+AI · 기준일 2026-07-07 · 대상: 실무 실행팀", color=DRGB(0x64, 0x74, 0x8B))
    P("근거: PROJECT/Convergence_SaaS/00-strategy/00_종합안.md + 세부 7종(현황·전략·온보딩·AI·GTM·아키텍처·보안)",
      color=DRGB(0x64, 0x74, 0x8B))

    H1("0. 요약")
    P("엑셀로 흩어진 가동률·맨먼스·유휴비용을 여러 회사가 각자 데이터로 5분 만에 보고, AI가 다음 투입 결정까지 돕는 "
      "한국형 Lite PSA SaaS. 실조직(56명)에서 검증된 계산 엔진을 멀티테넌트로 전환해 2개 분기 내 파일럿 5~10개 확보가 목표.")

    H1("1. 비전 · 해결 문제")
    P("비전: 사람의 시간을 팔아 매출을 내는 프로젝트 조직이 인력 가동을 실시간 가시화하고 투입 의사결정을 근거 기반으로 빠르게.", bold=True)
    H2("3대 손실")
    B([
        "유휴/과투입 비가시성 — 월말에야 파악 → 유휴 인건비가 마진 잠식",
        "느린 투입 의사결정 — 가동률·여력·단가가 흩어져 '일단 되는 사람'으로 배정",
        "재무와 단절된 가동률 — %가 유휴비용·매출기여로 환산되지 않아 경영 보고 불가",
    ])
    P("핵심 Aha: \"우리 팀이 지금 낭비하는 유휴비용이 월 ○○○만원\"을 처음 금액으로 봤을 때.", color=DRGB(0x06, 0xB6, 0xD4), bold=True)

    H1("2. 타깃 ICP")
    table(["축", "1차 타깃(Beachhead)"], [
        ["업종", "디지털 에이전시 → SI/SM 개발사 → 컨설팅/리서치 대행 → 사내 PMO"],
        ["규모", "20~200명 (스윗스팟 30~120명) — 엑셀은 한계, 해외 PSA는 과함 = 빈 시장"],
        ["구조", "본부/그룹 2~3단계, 목표 가동률(예: 90%) 관리자 존재"],
        ["챔피언/바이어", "PM·PMO·사업관리팀장 / 본부장·COO·대표"],
        ["구매 트리거", "50명 넘어 엑셀 붕괴 · 경영진 가동률 보고 요구 · 신규 수주 투입 시뮬"],
        ["Anti-ICP", "프리랜서 · 빌러블 없는 상시운영 · 5명 이하 · 이미 Kantata급 보유 대기업"],
    ])

    H1("3. 제품 개요 — 3기둥")
    B([
        "① 멀티테넌트 코어 — 재사용 자산(도메인 타입 20여 종·맨먼스↔가동률↔유휴비용 계산·useDataStore·shadcn UI·승인 WF) 유지, tenantId·인증·서버만 신설",
        "② 기준데이터 온보딩 — 하드코딩(그룹 5종·근무일 22·8h·70,000원·목표 90%)을 테넌트 CRUD 마스터로 승격, 회사→조직/그룹→구성원(CSV/수기/샘플)→요율·근무캘린더 4단계 위저드",
        "③ AI 레이어 — 자연어 질의·자동 브리핑을 얹되 재무 수치는 앱이 결정론적으로 계산하고 Claude는 서사·추론·추천만 담당(환각 구조적 차단)",
    ])
    P("차별화 3축: 한국형 맨먼스 네이티브 · 가동률의 유휴비용(금액) 환산 · 5분 셋업(해외 PSA 대비 마찰 1/10).", bold=True)

    H1("4. MVP 범위")
    P("목표: '한 회사가 스스로 가입 → 조직 세팅 → 가동률·유휴비용 대시보드 도달'을 도움 없이 완주.")
    table(["#", "범위", "왜 MVP인가"], [
        ["M0", "정합성 버그 선수정 — 파생계산의 모듈상수(mockMembers/mockMemberManmonths) 참조를 인자 주입으로", "협상 불가 선행조건. 안 고치면 편집해도 가동률·비용이 목데이터로 고정 → 재무 신뢰 붕괴"],
        ["M1", "멀티테넌시 최소 — 전 엔티티 tenantId, 단일 DB + RLS 격리", "SaaS 전제"],
        ["M2", "인증 + 최소 RBAC(관리자/편집자/뷰어), 신원 주입", "격리·승인·과금 기반"],
        ["M3", "온보딩 위저드 — 조직/그룹→멤버(CSV+수기)→캘린더/목표", "TTV 핵심"],
        ["M4", "대시보드 + 가동률/유휴비용(파생계산 서버 이전)", "핵심 가치(Aha)"],
        ["M5", "인력·프로젝트·투입 CRUD + 승인 워크플로우", "대시보드 채우는 실데이터 경로"],
        ["M6", "AI 1종 — 유휴 인력 → 적합 프로젝트 배정 추천", "차별화 데모 + 온보딩 직후 다음 액션"],
    ])
    P("제외(v1+ 연기): 결제 자동화(파일럿 무료) · 화이트라벨 · 3단계+ 조직 계층 · SSO/SAML·감사로그 심화 · "
      "대량 마이그레이션 도구(CSV로 대체) · 서버 사전집계 · 네이티브 앱 · 다통화/다국어.", color=DRGB(0x64, 0x74, 0x8B))

    H1("5. 아키텍처 요지 — 격리·인증·데이터계층")
    P("최종 권고: Vercel(프론트) + Supabase Seoul(공유 Postgres + Auth + RLS)로 tenant_id row-level 격리와 "
      "Owner/Admin/Editor/Viewer RBAC를 깔고, useDataStore를 DataSource 추상화로 감싸 파생계산을 서버로 이전, "
      "시트 기반 미터링 과금, 엔터프라이즈는 전용 DB로 승격하는 하이브리드.", bold=True)
    H2("격리")
    B(["공유 DB + row-level tenant_id + Postgres RLS(DB 최종 방어선) + 앱계층 tenant-scoped repository(2중 방어)",
       "클라이언트는 tenant_id 미전송, 서버가 JWT에서 도출. 규제 고객만 전용 DB 승격(에스케이프 해치)"])
    H2("인증/인가")
    B(["Supabase Auth(이메일/매직링크 + Google·Kakao, 엔터프라이즈 SSO)",
       "시스템 역할(Owner/Admin/Editor/Viewer)을 직무(Member.role)와 분리, 승인 WF(draft→review→approved)를 실권한과 결합",
       "createdBy/reviewerId/approvedBy는 인증 신원에서 서버 주입(현 하드코딩 제거), 요율·유휴비용은 필드레벨 권한으로 뷰어 마스킹"])
    H2("데이터계층")
    B(["useDataStore 시그니처 유지 + 내부 DataSource 인터페이스로 교체(LocalStorage→ApiDataSource, 플래그 전환·즉시 롤백)",
       "파생계산(맨먼스·비용·집계)은 서버(SQL 뷰/RPC)로 이전 — 일관성·감사가능성·성능·단가 보호",
       "계산 파라미터(근무일·시간·단가)는 테넌트 설정에서 주입"])
    H2("보안 P0")
    B(["요율·개인정보 클라이언트 평문저장 제거 · importData(any) 스키마 검증화(zod) · TLS 전구간 · 감사로그(append-only) · PIPA 대응"])

    H1("6. AI 로드맵")
    P("정직성 원칙: Claude를 빼도 성립하면 'AI 장식'. 진짜 코어는 자연어·서사이고 재무 숫자는 앱이 계산.", bold=True)
    B([
        "MVP AI: F5 자동 주간/월간 인사이트 브리핑(1순위·리텐션 훅) · F4 자연어 질의→리포트/차트(차별화 핵심) · F3 이상탐지 경보(F5 리스크 섹션 공급)",
        "차기1: F8 비용 최적화 시뮬(what-if) · F2 인력 최적 배치 추천",
        "차기2~3: F6 리스크/지연 예측 · F1 가동률·수요 예측 · F7 채용/외주 보조 — 월별 스냅샷(YYYY-MM) 6~12개월 축적 후",
        "전제: Claude API 키는 클라이언트 불가 → 최소 서버 프록시(Edge Function)가 F4/F5의 조건 → AI MVP는 백엔드 착수와 합류",
    ])

    H1("7. GTM · 가격")
    B([
        "포지셔닝: 빌러블 팀을 위한 가볍고 한국형인 가동률·리소스 대시보드(Lite PSA)",
        "과금 축: Seat(관리 대상 구성원) × 티어, 뷰어 무료(바이럴 확장)",
        "PLG: 5분 TTV(첫 대시보드)·10분 유휴비용 각성, 페이월은 인원(11번째)·이력(3개월)·유휴비용·승인·권한 지점",
        "획득(0→1): 엑셀 템플릿 리드마그넷+SEO · 디스콰이엇/제품헌트 런칭 · '유휴비용 30분 진단' 아웃바운드",
    ])
    table(["티어", "가격(연납)", "비고"], [
        ["Free", "10명 · 3개월 이력", "PLG 진입"],
        ["Pro", "₩9,900 / 명·월", "핵심 유료"],
        ["Business", "₩19,000 / 명·월", "권한·승인 풀셋 · 14일 무카드 트라이얼"],
        ["Enterprise", "견적", "전용 DB·SSO"],
        ["Converge AI 애드온", "+₩4,000 / 명·월 (또는 정액)", "자연어 질의·자동 브리핑"],
    ])
    P("정직성 게이트: SSO·RBAC·API·AI는 로드맵 기능 → 랜딩/가격표에 출시/베타 배지, 미구현 가치 확정 약속 금지.",
      color=DRGB(0x64, 0x74, 0x8B))

    H1("8. 단계 로드맵 (분기별)")
    P("의존성 순서: M0 버그수정 → 테넌시/인증 → API/DB → 온보딩/대시보드 → AI. useDataStore 시그니처 유지로 화면 코드 변경 최소화.")
    table(["단계", "시점", "핵심 작업"], [
        ["MVP", "2026 Q3~Q4 (파일럿 5~10)", "Q3 M0→M1(테넌시·RLS)→Supabase 구축→M2(인증)+보안P0 / Q4 M3 온보딩→M4 대시보드→M5 CRUD→M6 AI+F5 브리핑"],
        ["v1", "2027 Q1~Q2 (유료 30)", "Q1 결제/구독·좌석과금·서버 사전집계 / Q2 F4 자연어 질의·월별 예측 착수·기간(period) 모델 정식화"],
        ["v2", "2027 Q3~Q4 (스케일·엔터프라이즈)", "Q3 다본부 계층·화이트라벨·SSO/SAML·전용 DB / Q4 원가/정산 연동·AI 3종·다통화·오픈 API"],
    ])
    P("게이트: type-check/lint(--max-warnings 0)/build 통과 + 테넌트 격리 자동 테스트(A토큰으로 B 데이터 0건).", bold=True)

    H1("9. 핵심 리스크 · 가정")
    table(["#", "가정(검증 대상)", "리스크 → 완화책"], [
        ["A1", "30~200명 조직이 가동률→유휴비용 자동화에 월 단위 지불", "PMF 실패 → 파일럿에서 지불의사·ARPA 검증, ROI 케이스화"],
        ["A2", "온보딩을 30분 내 스스로 완주", "TTV 실패 → CSV 임포트·샘플·프리셋, 완주율 60% 게이트"],
        ["A3", "데이터 정합성이 재무 신뢰의 전제", "M0 버그·clamp가 오차 은폐 → M0 선수정 필수, 계산 서버 단일진실"],
        ["A4", "단일 DB+RLS로 격리 충분", "타사 데이터 노출(치명·법적) → 전 쿼리 tenant 스코프 + 격리 자동 테스트"],
        ["A5", "단가·비용 다루므로 권한 분리가 판매 조건", "뷰어 민감정보 열람 → 최소 RBAC + 필드레벨 마스킹 MVP 포함"],
        ["A6", "AI 배정추천이 채택될 만큼 유용", "뻔하거나 틀림 → 규칙 기반 시작, 채택률 20% 관찰, '결정은 사람'"],
        ["A7", "목데이터 비결정성(Math.random) 제거 가능", "재현 불가·QA 저하 → 결정론적 시드로 대체"],
    ])
    P("경영 결정 필요(가정 금지): ① 격리 방식(단일 DB+RLS 권고) ② 요금 모델(좌석당/정액/구간제) ③ 조직 계층 깊이(2~3단계 권고) "
      "④ 기존 localStorage 이관 범위 ⑤ 컴플라이언스 목표(ISMS-P/SOC2 시점) ⑥ 교차테넌트 벤치마킹 상품화 여부.", bold=True)

    H1("10. 즉시 다음 액션 (착수 순서)")
    B([
        "[블로커] M0 정합성 버그 수정 — data/mockData.ts 파생계산(calculateUtilizationData/getGroupSummary 등) 모듈상수 참조를 인자 주입 순수함수로, Math.random 시드 제거",
        "타입 계약 확정 — types/index.ts에 Tenant/User/Membership/Role·전 엔티티 tenantId·updatedAt 추가(미사용 상태로 먼저)",
        "DataSource 추상화 도입 — useDataStore 리팩터(시그니처 유지, LocalStorage 구현 이관, 사용자 무영향)",
        "경영 결정 4건 회수 — 격리·요금·계층·기존 데이터 이관",
        "인프라 셋업 — Supabase(Seoul, ap-northeast-2) 생성 · tenant_id+RLS 스키마 초안 · 배포 일원화(Vercel 단일)",
        "파일럿 3~5개사 사전 접촉 — '유휴비용 진단' 훅으로 지불의사·ARPA 인터뷰, 엑셀 템플릿 리드마그넷",
        "화면 정의 인계 — 온보딩 위저드 4단계·테넌트/권한 설정·AI 배정추천 UX (VIEW_NAMES→ViewRenderer→네비)",
    ])
    P("영향 핵심 파일: types/index.ts(계약) · hooks/useDataStore.ts(단일 진입점) · data/mockData.ts(계산 인자화·랜덤 제거) · "
      "constants/views.ts+components/ViewRenderer.tsx(온보딩/설정 뷰) · components/ProjectReview.tsx(승인 신원 결합).",
      color=DRGB(0x64, 0x74, 0x8B))

    d.save(path)


if __name__ == "__main__":
    outdir = os.path.join(OUT, "00_보고")
    os.makedirs(outdir, exist_ok=True)
    p1 = os.path.join(outdir, "경영보고_종합안_v1.pptx")
    p2 = os.path.join(outdir, "실무보고_종합안_v1.docx")
    build_pptx(p1); build_docx(p2)
    for p in (p1, p2):
        print("OK", os.path.getsize(p), p)
