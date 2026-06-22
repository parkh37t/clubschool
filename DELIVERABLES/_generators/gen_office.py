#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude-native 오피스 산출물 생성기 — **IBK 과제(#1) 예시**.
엔진(python-pptx/docx/openpyxl)은 과제 무관 재사용. 슬라이드/문서의 '내용'만 과제별로 다르므로
신규 과제는 이 파일을 복제해 내용을 교체하거나, 표 데이터를 외부 설정으로 분리한다.
정책: Claude Design First — 편집형 오피스 파일은 네이티브 생성이 1순위.
공통 md→DOCX 변환은 과제 무관 엔진 `gen_docs_from_md.py`를 사용(프로젝트 러너가 호출).
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from docx import Document
from docx.shared import Pt as DPt, RGBColor as DRGB, Inches as DIn
from docx.enum.text import WD_ALIGN_PARAGRAPH
import openpyxl
from openpyxl.styles import Font as XFont, PatternFill, Alignment, Border, Side

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE, "..", "IBK_i-ONE_Global")
KO = "Malgun Gothic"  # 한국어 대응 폰트(뷰어에 없으면 대체)

# IBK 브랜드 토큰
BLUE = RGBColor(0x0A, 0x4D, 0xA2)
DARK = RGBColor(0x07, 0x3A, 0x7A)
SKY  = RGBColor(0x1E, 0x9B, 0xE6)
FG   = RGBColor(0x1A, 0x1F, 0x2B)
MUT  = RGBColor(0x5A, 0x64, 0x73)
WHITE= RGBColor(0xFF, 0xFF, 0xFF)

def _ea(run, name=KO):
    """python-pptx run에 동아시아 폰트 지정(한글 깨짐 방지)."""
    run.font.name = name
    rPr = run._r.get_or_add_rPr()
    from pptx.oxml.ns import qn
    ea = rPr.find(qn('a:ea'))
    if ea is None:
        ea = rPr.makeelement(qn('a:ea'), {}); rPr.append(ea)
    ea.set('typeface', name)

# ---------------- PPTX ----------------
def build_pptx(path):
    prs = Presentation()
    prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    W, H = prs.slide_width, prs.slide_height

    def slide(bg=WHITE):
        s = prs.slides.add_slide(blank)
        r = s.shapes.add_shape(1, 0, 0, W, H)  # rectangle bg
        r.fill.solid(); r.fill.fore_color.rgb = bg; r.line.fill.background()
        r.shadow.inherit = False
        s.shapes._spTree.remove(r._element); s.shapes._spTree.insert(2, r._element)
        return s

    def tb(s, x, y, w, h, anchor=MSO_ANCHOR.TOP):
        box = s.shapes.add_textbox(x, y, w, h); tf = box.text_frame
        tf.word_wrap = True; tf.vertical_anchor = anchor; return tf

    def line(tf, text, size, color, bold=False, first=False, space=6):
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        p.space_after = Pt(space)
        r = p.add_run(); r.text = text
        r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color
        _ea(r); return p

    def bar(s):
        b = s.shapes.add_shape(1, 0, 0, Inches(0.12), H)
        b.fill.solid(); b.fill.fore_color.rgb = BLUE; b.line.fill.background(); b.shadow.inherit=False

    def header(s, no, title):
        bar(s)
        tf = tb(s, Inches(0.8), Inches(0.55), Inches(11.7), Inches(1.0))
        line(tf, f"{no}", 16, WHITE, bold=True, first=True)  # placeholder (recolored below via circle skip)
        tf2 = tb(s, Inches(0.8), Inches(0.5), Inches(11.7), Inches(1.0))
        line(tf2, title, 32, FG, bold=True, first=True)

    def bullets(s, items, x=Inches(0.9), y=Inches(1.9), w=Inches(11.5), h=Inches(5.0), size=18):
        tf = tb(s, x, y, w, h)
        for i, it in enumerate(items):
            p = line(tf, "• " + it, size, MUT, first=(i==0), space=10)

    # 1 표지
    s = slide(DARK)
    tf = tb(s, Inches(0.9), Inches(2.2), Inches(11.5), Inches(3.2))
    line(tf, "IBK 디지털뱅킹 리빌딩 1단계 추진 · 제안", 16, SKY, bold=True, first=True, space=14)
    line(tf, "i-ONE Bank Global", 54, WHITE, bold=True, space=4)
    line(tf, "외국인 디지털 채널 구축", 40, WHITE, bold=True, space=14)
    line(tf, "전자지갑(전자증명서)·외국인 고객센터를 이미 만들어 본 팀의 제안", 20, WHITE)
    line(tf, "컨버전스1팀 · 2026.06", 14, SKY, bold=True)

    # 2 Executive Summary
    s = slide(); header(s, "01", "Executive Summary")
    tf = tb(s, Inches(0.9), Inches(1.7), Inches(11.5), Inches(1.0))
    line(tf, '"외국인 고객 경험을 이미 만들어 본 팀."', 24, BLUE, bold=True, first=True)
    bullets(s, [
        "SFR-062(외국인 고객센터)·SFR-063(외국인 전자지갑)을 동작 프로토타입으로 선구현",
        "실증된 UX: 발급→신청→완료→보관/제출, 언어별 고객센터까지 동작",
        "리스크 선제 관리: 정부24/유통 연동을 어댑터로 추상화(mock→실연동)",
        "확장 구조: 증명서·언어를 데이터/리소스 구동으로 설계",
    ], y=Inches(2.7), size=18)

    # 3 프로젝트 이해
    s = slide(); header(s, "02", "프로젝트 이해")
    bullets(s, [
        "[외부] 고객 중심 디지털 전환 가속, 빅테크·핀테크 진입",
        "[외부] MZ·외국인 등 신규 고객층의 간편·맞춤 금융경험 요구",
        "[내부] '09년 구축 인터넷뱅킹 구조 노후화, 채널별 중복개발",
        "[목표] Seamless 유니버설 뱅킹 + 디지털 플랫폼, i-ONE Bank Global 재구축으로 외국인 경쟁력 강화",
    ])

    # 4 접근 전략
    s = slide(); header(s, "03", "접근 전략 — 승부수")
    bullets(s, [
        "① 외국인 UX 실증 — 동작 프로토타입(발급→신청→완료→보관/제출 + 고객센터)",
        "② 예외 우선 설계 — 인증 미보유·실패, 기관 점검, 운영시간 외까지 상태화",
        "③ 연동 리스크 관리 — mock→실연동 어댑터 전환",
        "④ 접근성 내재화 — WCAG AA 핵심 항목 프로토타입 단계부터 충족",
    ])

    # 5 제안 범위
    s = slide(); header(s, "04", "제안 범위")
    bullets(s, [
        "[포함] 전자지갑(발급/신청/보관/제출), 언어별 고객센터",
        "[포함] 다국어 프레임(리소스 토큰화), 공동/IBK 인증·정부24/유통 IF 설계",
        "[제외] 플랫폼 전체(MSA·K8s·CI/CD) 구축 견적 — 예산·배점 확정 후",
        "[제외] 정보변경/폐기·공유·내역, 풀 다국어 번역(차기)",
    ])

    # 6 솔루션 ① 전자지갑
    s = slide(); header(s, "05", "솔루션 ① 외국인 전자지갑")
    bullets(s, [
        "RFP 거래 예시 3스텝 그대로: ① 신청가능목록 → ② 신청·인증 → ③ 신청 완료",
        "발급 증명서 4종: 거소신고·외국인등록·출입국·여권정보",
        "보관함: 발급 증명서 열람·다운로드·제출",
        "인증: 공동/IBK인증서만(금융인증서 불가)",
    ])

    # 7 솔루션 ② 고객센터 + 예외
    s = slide(); header(s, "06", "솔루션 ② 고객센터 · 예외 우선 설계")
    bullets(s, [
        "외국인 고객센터(SFR-062): 메인 아이콘 → 언어별 연락처 + 직통연결(tel:)",
        "운영시간 외 → 이메일 대안",
        "예외: 인증서 미보유→발급 안내 / 인증 실패·타임아웃→재시도",
        "예외: 발급기관 점검→오류·재시도 / 증명서 만료→제출 차단·재발급",
    ])

    # 8 연동 아키텍처
    s = slide(); header(s, "07", "연동 아키텍처 — 리스크 핵심")
    bullets(s, [
        "i-ONE Bank Global 외국인 모듈 → Integration Adapter Layer(인터페이스 추상화)",
        "Auth Adapter(공동/IBK) · Cert Adapter(정부24/유통, 규격 전 mock) · Notify·Log",
        "규격 미확정 구간은 mock 스텁 선개발 → 확정 시 어댑터만 교체(앱/화면 영향 0)",
        "개인정보(거소·등록·출입국·여권)는 인터페이스 계약 레벨에서 보안 처리 강제",
    ])

    # 9 일정 + 조직
    s = slide(); header(s, "08", "추진 일정 · 조직")
    bullets(s, [
        "분석/설계 M1~M2 · 디자인/퍼블 M2~M4 · 개발/연동 M4~M9 · 통합/QA/오픈 M9~M12",
        "전체 사업기간 12개월 기준(일정은 예시·추측)",
        "조직(R&R): PM/기획 정우선·나기획 / 디자인 차도안·오색감 / 퍼블 표준수·이풍뎅",
        "개발 백연동·구동민 / 분석 고지표 (의사결정 허브: PO)",
    ])

    # 10 클로징
    s = slide(DARK)
    tf = tb(s, Inches(0.9), Inches(0.7), Inches(11.5), Inches(0.9))
    line(tf, "리스크 관리 · 다음 단계", 32, WHITE, bold=True, first=True)
    bullets(s, [
        "API 규격 미확정 → 어댑터 추상화·mock 선개발",
        "다국어 범위 미정 → 리소스 키, 1차 영어+확장",
        "인증 보유율 → 미보유 예외 플로우 기본 제공",
        "[확인 필요] 지원 언어·증명서 확장·API/인증 규격·정책 수치·배점·예산",
    ], y=Inches(1.8), size=18)
    tf2 = tb(s, Inches(0.9), Inches(5.6), Inches(11.5), Inches(1.2))
    line(tf2, "함께, 외국인 금융경험의 단절을 없앱니다.", 30, WHITE, bold=True, first=True)

    prs.save(path); return len(prs.slides.__iter__.__self__._sldIdLst)

# ---------------- DOCX ----------------
def build_docx(path):
    doc = Document()
    st = doc.styles['Normal']; st.font.name = KO; st.font.size = DPt(10.5)
    def H(text, size=16, color=BLUE, after=6):
        p = doc.add_paragraph(); r = p.add_run(text); r.bold=True
        r.font.size=DPt(size); r.font.color.rgb=DRGB(0x0A,0x4D,0xA2) if color==BLUE else DRGB(0x1A,0x1F,0x2B)
        r.font.name=KO; p.space_after=DPt(after); return p
    def P(text, size=10.5):
        p = doc.add_paragraph(); r=p.add_run(text); r.font.size=DPt(size); r.font.name=KO; return p
    def B(items):
        for it in items:
            p = doc.add_paragraph(style=None); p.paragraph_format.left_indent=DIn(0.25)
            r=p.add_run("• "+it); r.font.size=DPt(10.5); r.font.name=KO

    t = doc.add_paragraph(); r=t.add_run("IBK 디지털뱅킹 리빌딩 1단계 — i-ONE Bank Global 제안서 (v1)")
    r.bold=True; r.font.size=DPt(20); r.font.color.rgb=DRGB(0x0A,0x4D,0xA2); r.font.name=KO
    P("작성: 컨버전스1팀 · 2026.06 · ⚠ 정량 수치는 예산/배점 미확정 상태의 [추측·예시]")

    H("0. Executive Summary")
    P('"외국인 고객 경험을 이미 만들어 본 팀." SFR-062·063을 동작 프로토타입으로 선구현해 1단계 외국인 채널 경쟁력을 입증한다.')
    H("1. 프로젝트 이해")
    B(["노후 인터넷뱅킹 → 디지털 플랫폼 리빌딩(채널 중복 제거·출시 속도·확장성)",
       "i-ONE Bank Global 재구축으로 외국인 고객 경쟁력 강화"])
    H("2. 접근 전략(승부수)")
    B(["외국인 UX 실증(프로토타입)","예외 우선 설계","연동 리스크 관리(어댑터)","접근성 내재화(WCAG AA)"])
    H("3. 제안 범위")
    B(["[포함] 전자지갑(발급/신청/보관/제출), 언어별 고객센터, 다국어 프레임, 인증·정부24/유통 IF 설계",
       "[제외] 플랫폼 전체 구축 견적, 정보변경/폐기·공유·내역, 풀 다국어 번역"])

    H("4. 추진 일정")
    tbl = doc.add_table(rows=1, cols=4); tbl.style='Light Grid Accent 1'
    hdr = tbl.rows[0].cells
    for i,h in enumerate(["단계","기간","핵심 산출물","의존성"]):
        rr=hdr[i].paragraphs[0].add_run(h); rr.bold=True; rr.font.name=KO; rr.font.size=DPt(10)
    for row in [["분석/설계","M1~M2","요건정의·IA·화면설계·연동 IF","정부24/유통 규격"],
                ["디자인/퍼블","M2~M4","디자인시스템·UI·마크업","설계 확정"],
                ["개발/연동","M4~M9","FE/BE·실연동","인증·기관 API"],
                ["통합/QA/오픈","M9~M12","통합·접근성·오픈","전 단계"]]:
        c=tbl.add_row().cells
        for i,v in enumerate(row):
            rr=c[i].paragraphs[0].add_run(v); rr.font.name=KO; rr.font.size=DPt(9.5)

    H("5. 리스크 관리")
    B(["정부24/유통 API 규격 미확정 → 인터페이스 추상화 + mock 선개발",
       "다국어 범위 미정 → 리소스 키, 1차 영어+확장",
       "외국인 인증 보유율 → 미보유 예외 플로우 기본 제공"])
    H("6. 미확정(고객 확인 필요)")
    P("지원 언어 · 증명서 확장 범위 · API/인증 규격 · 평가 배점 · 예산 · 정책 수치")
    doc.save(path)

# ---------------- XLSX ----------------
def build_xlsx(path):
    wb = openpyxl.Workbook()
    hd = PatternFill("solid", fgColor="0A4DA2"); hf = XFont(color="FFFFFF", bold=True, name=KO)
    thin = Side(style="thin", color="E2E7EF"); bd = Border(thin,thin,thin,thin)
    cell_font = XFont(name=KO)
    def sheet(ws, headers, rows, widths):
        for i,h in enumerate(headers,1):
            c=ws.cell(1,i,h); c.fill=hd; c.font=hf; c.alignment=Alignment(vertical="center"); c.border=bd
        for r,row in enumerate(rows,2):
            for i,v in enumerate(row,1):
                c=ws.cell(r,i,v); c.font=cell_font; c.alignment=Alignment(wrap_text=True, vertical="top"); c.border=bd
        for i,w in enumerate(widths,1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width=w
        ws.row_dimensions[1].height=22

    ws1 = wb.active; ws1.title="이벤트 스키마"
    sheet(ws1, ["이벤트명","트리거(화면)","주요 속성","구분"], [
        ["wallet_issue_start","S1 발급","auth_method","발급"],
        ["wallet_issue_complete","S1→S2","wallet_id","발급"],
        ["wallet_cert_step1_view","S3 목록","-","신청 퍼널"],
        ["wallet_cert_select","S3","cert_type","신청 퍼널"],
        ["wallet_cert_auth_fail","S4","fail_reason","이탈 원인"],
        ["wallet_cert_timeout","S4","timeout_stage","이탈 원인"],
        ["wallet_cert_maintenance_view","S3/S4","agency","이탈 원인"],
        ["wallet_cert_complete","S5","receipt_no,cert_type","신청 퍼널"],
        ["wallet_cert_submit","S7","target","활용"],
        ["cs_call_tap","S8 고객센터","lang","고객센터"],
    ], [26, 14, 22, 12])

    ws2 = wb.create_sheet("KPI 정의")
    sheet(ws2, ["KPI","정의/공식","단위/기간","임계값(추측)"], [
        ["증명서 신청 완료율","완료/시작 ×100","%/월","≥ 80%"],
        ["단계별 이탈률","단계 이탈/진입 ×100","%/월","≤ 15%"],
        ["인증 성공률","성공/시도 ×100","%/월","≥ 90%"],
        ["고객센터 직통연결 이용률","cs_call_tap/방문 ×100","%/월","모니터"],
        ["보관함 활용률(다운+제출)","활용/발급 ×100","%/월","≥ 50%"],
    ], [26, 26, 14, 16])
    wb.save(path)

if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT,"01_영업제안"), exist_ok=True)
    os.makedirs(os.path.join(ROOT,"05_개발준비"), exist_ok=True)
    p_pptx = os.path.join(ROOT,"01_영업제안","제안발표_v1.pptx")
    p_docx = os.path.join(ROOT,"01_영업제안","제안서본문_v1.docx")
    p_xlsx = os.path.join(ROOT,"05_개발준비","KPI-이벤트-스키마_v1.xlsx")
    build_pptx(p_pptx); build_docx(p_docx); build_xlsx(p_xlsx)
    for p in (p_pptx,p_docx,p_xlsx):
        print("OK", os.path.getsize(p), p)
