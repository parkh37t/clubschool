#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude-native 오피스 생성기 — 엠배서더호텔(과제 #2) 와일리 UIUX 제안 골격.
엔진(python-pptx/docx)은 공유, 내용만 과제별. ⚠ 대외비 — 외부 배포 주의.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR
from pptx.oxml.ns import qn
from docx import Document
from docx.shared import Pt as DPt, RGBColor as DRGB, Inches as DIn

BASE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(BASE,"..","..","Ambassador_Hotel")
KO="Malgun Gothic"
NAVY=RGBColor(0x11,0x20,0x3A); GOLD=RGBColor(0xB8,0x91,0x50); SKY=RGBColor(0x1B,0x2E,0x4D)
FG=RGBColor(0x20,0x24,0x2C); MUT=RGBColor(0x6B,0x72,0x80); WHITE=RGBColor(0xFF,0xFF,0xFF)

def ea(r,name=KO):
    r.font.name=name; rPr=r._r.get_or_add_rPr()
    e=rPr.find(qn('a:ea'))
    if e is None: e=rPr.makeelement(qn('a:ea'),{}); rPr.append(e)
    e.set('typeface',name)

def build_pptx(path):
    prs=Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
    blank=prs.slide_layouts[6]; W,H=prs.slide_width,prs.slide_height
    def slide(bg=WHITE):
        s=prs.slides.add_slide(blank); r=s.shapes.add_shape(1,0,0,W,H)
        r.fill.solid(); r.fill.fore_color.rgb=bg; r.line.fill.background(); r.shadow.inherit=False
        s.shapes._spTree.remove(r._element); s.shapes._spTree.insert(2,r._element); return s
    def tb(s,x,y,w,h,anc=MSO_ANCHOR.TOP):
        b=s.shapes.add_textbox(x,y,w,h); b.text_frame.word_wrap=True; b.text_frame.vertical_anchor=anc; return b.text_frame
    def ln(tf,t,sz,c,b=False,first=False,sp=6):
        p=tf.paragraphs[0] if first else tf.add_paragraph(); p.space_after=Pt(sp)
        r=p.add_run(); r.text=t; r.font.size=Pt(sz); r.font.bold=b; r.font.color.rgb=c; ea(r); return p
    def bar(s):
        b=s.shapes.add_shape(1,0,0,Inches(0.14),H); b.fill.solid(); b.fill.fore_color.rgb=GOLD; b.line.fill.background(); b.shadow.inherit=False
    def hdr(s,t):
        bar(s); ln(tb(s,Inches(0.8),Inches(0.5),Inches(11.7),Inches(1)),t,32,NAVY,True,True)
    def bul(s,items,y=Inches(1.9),sz=18):
        tf=tb(s,Inches(0.9),y,Inches(11.5),Inches(5))
        for i,it in enumerate(items): ln(tf,"• "+it,sz,MUT,first=(i==0),sp=10)

    # 1 표지
    s=slide(NAVY); tf=tb(s,Inches(0.9),Inches(2.2),Inches(11.5),Inches(3.2))
    ln(tf,"엠배서더호텔 그룹 홈페이지 재구축 · 제안",16,GOLD,True,True,14)
    ln(tf,"UI/UX 제안 (와일리)",46,WHITE,True,sp=6)
    ln(tf,"컨소시엄: 아이온(주관·개발) × 와일리(UI/UX) · 2026.07",20,WHITE,sp=4)
    ln(tf,"※ 대외비 — 제안 목적 외 사용 금지",13,GOLD,True)

    # 2 사업 이해
    s=slide(); hdr(s,"01  사업 이해"); bul(s,[
        "D2C 채널 활성화 · OTA 수수료 절감 → 직접 예약률 향상",
        "웹/모바일앱(RN·Flutter)/관리자/CRM 통합 + 부킹엔진·메타서치·구글 GEO",
        "클라우드 네이티브 전환(아이온) + 웹/앱 UX 전면 개편(와일리)",
        "로열티 강화·개인화 마케팅 기반(멤버십/CRM)",
    ])
    # 3 와일리 역할/강점
    s=slide(); hdr(s,"02  와일리 역할 & 강점"); bul(s,[
        "UI/UX 전담 — 설계(P2)·디자인(P3) 핵심 구간 책임",
        "시안 품질 고객 인정 · 호텔/여행 도메인 이해",
        "웹접근성 KWCAG 2.2 · 모바일 UX 가이드 내재화(차별화)",
        "디자인시스템으로 앱/웹 공통 토큰화 → 일관성·생산성",
    ])
    # 4 UIUX 방법론
    s=slide(); hdr(s,"03  UI/UX 접근 — 산출물"); bul(s,[
        "P2 설계: IA · UX Flow · 와이어프레임 · 화면설계서",
        "P3 디자인: UI 시안 3종 · 디자인시스템 · 스타일가이드",
        "요구추적매트릭스(RTM)로 FNR/NFR 100% 충족 추적(QUA-02)",
        "반응형 mobile-first · 폰트 Pretendard/Noto Sans KR",
    ])
    # 5 핵심 화면
    s=slide(); hdr(s,"04  핵심 화면 콘셉트 (시안 3종)"); bul(s,[
        "B-1 홈/예약 — Sticky 예약 위젯, 회원가·직예약 전환 중심 (FNR-02·03·04·09)",
        "B-2 멤버십/CRM 대시보드 — 등급가·바우처·세그먼트·전환율 시각화 (FNR-08·05)",
        "B-3 검색/상세 — 다중 필터·지도뷰·정렬·Sticky CTA (FNR-03·04)",
        "* 콘셉트 보드·시안 HTML 별첨(Claude Design)",
    ])
    # 6 멤버십/CRM
    s=slide(); hdr(s,"05  멤버십 · CRM 시각화 (FNR-08)"); bul(s,[
        "등급별 할인가 선노출 · 절감액 강조 · 무료숙박권 가용 캘린더",
        "회원/비회원 도넛 · 등급 분포 바 · 바우처 사용률 추이",
        "회원 전환율·재방문 분석(UTM·캠페인 연계)",
        "포인트 소멸 예정 타임라인 · CSV 리포트",
    ])
    # 7 접근성/반응형
    s=slide(); hdr(s,"06  접근성 · 반응형 · 품질"); bul(s,[
        "KWCAG 2.2: 대비·키보드·스크린리더·모바일 UX 가이드",
        "반응형 mobile-first(PC/태블릿/모바일) · 터치 타깃·스와이프",
        "이미지 표준화(WebP/Lazy) → LCP 2초(PER-03 연계)",
        "RTM 기반 검수(QUA-02) · ISO 25010 품질 항목 대응",
    ])
    # 8 디자인시스템
    s=slide(); hdr(s,"07  디자인 시스템"); bul(s,[
        "컬러/타이포/간격/컴포넌트 토큰 — 앱(RN/Flutter)·웹 공통",
        "프로퍼티별 메인 레이아웃 표준화(FNR-09-3)",
        "상태/예외(빈·로딩·오류) 패턴 표준",
        "스타일가이드·핸드오프(개발 인계)",
    ])
    # 9 일정/투입
    s=slide(); hdr(s,"08  일정 · 투입 (와일리 구간)"); bul(s,[
        "P1 분석(요구 상세화) → P2 설계(IA·화면설계) → P3 디자인(시안 3종·DS)",
        "전체 10~11개월 중 와일리 핵심 = P2~P3, P4 퍼블 지원",
        "투입: PO/기획(정우선·나기획)·디자인(차도안·오색감)·퍼블(표준수·이풍뎅)·지표(고지표)",
        "제안 마감 2026-07-13 — 설계·시안 샘플 선제작 완료",
    ])
    # 10 차별화/리스크
    s=slide(NAVY); tf=tb(s,Inches(0.9),Inches(0.7),Inches(11.5),Inches(1))
    ln(tf,"09  차별화 · 다음 단계",32,WHITE,True,True)
    bul(s,[
        "차별화: 시안 3종 품질 + 예약 전환 UX + 멤버십/CRM 시각화 + 접근성 KWCAG 2.2",
        "리스크: 예산 12억(영업 인텔 19~20억) 재정렬 필요 → 아이온 분담·볼륨 협의",
        "질의: 예산·배점·시안 범위·앱 RN/Flutter·CRM 분담",
        "함께, 직접 예약의 격을 높입니다.",
    ],y=Inches(1.9),sz=18)
    for sp in prs.slides[-1].shapes:
        if sp.has_text_frame:
            for p in sp.text_frame.paragraphs:
                for r in p.runs: r.font.color.rgb=WHITE
    prs.save(path)

def build_docx(path):
    d=Document(); d.styles['Normal'].font.name=KO; d.styles['Normal'].font.size=DPt(10.5)
    def H(t,sz=15):
        p=d.add_paragraph(); r=p.add_run(t); r.bold=True; r.font.size=DPt(sz); r.font.color.rgb=DRGB(0x11,0x20,0x3A); r.font.name=KO; p.space_before=DPt(8); p.space_after=DPt(3)
    def P(t):
        p=d.add_paragraph(); r=p.add_run(t); r.font.size=DPt(10.5); r.font.name=KO
    def B(items):
        for it in items:
            p=d.add_paragraph(); p.paragraph_format.left_indent=DIn(0.25); r=p.add_run("• "+it); r.font.size=DPt(10.5); r.font.name=KO
    t=d.add_paragraph(); r=t.add_run("엠배서더호텔 그룹 홈페이지 재구축 — UI/UX 제안서 (와일리, v1 골격)")
    r.bold=True; r.font.size=DPt(18); r.font.color.rgb=DRGB(0x11,0x20,0x3A); r.font.name=KO
    P("컨소시엄: 아이온(주관·개발) × 와일리(UI/UX) · 2026.07 · ⚠ 대외비 — 제안 목적 외 사용 금지")
    H("0. 요약"); P("와일리는 P2 설계·P3 디자인을 책임지며, 시안 3종·디자인시스템·접근성(KWCAG 2.2)으로 직접 예약 전환과 멤버십/CRM 경험을 끌어올린다.")
    H("1. 사업 이해"); B(["D2C·OTA 수수료 절감·직접 예약률 향상","웹/앱/관리자/CRM 통합 + 부킹엔진·메타서치"])
    H("2. 와일리 역할 · 강점"); B(["UI/UX 전담(P2·P3)","시안 품질·도메인 이해","KWCAG 2.2 접근성 내재화","앱/웹 공통 디자인시스템"])
    H("3. UI/UX 방법론 · 산출물"); B(["P2: IA·UX Flow·와이어프레임·화면설계서","P3: UI 시안 3종·디자인시스템·스타일가이드","RTM(QUA-02) 100% 충족 추적"])
    H("4. 핵심 화면 콘셉트"); B(["B-1 홈/예약(전환)","B-2 멤버십/CRM 대시보드","B-3 검색/상세(필터·지도·CTA)"])
    H("5. 멤버십/CRM UX(FNR-08)"); B(["등급가 선노출·절감액 강조","회원/비회원·등급 분포·바우처 사용률","전환율·재방문 분석"])
    H("6. 접근성·반응형·품질"); B(["KWCAG 2.2·모바일 UX","반응형 mobile-first","RTM 검수·ISO 25010"])
    H("7. 디자인 시스템"); B(["앱/웹 공통 토큰","레이아웃 표준화","상태/예외 패턴"])
    H("8. 일정·투입(와일리 구간)"); B(["P1~P3 핵심, P4 퍼블 지원","컨버전스1팀 R&R"])
    H("9. 리스크·질의"); B(["예산 12억 재정렬(아이온 분담·볼륨)","질의: 예산·배점·시안 범위·앱 RN/Flutter·CRM 분담"])
    d.save(path)

if __name__=="__main__":
    os.makedirs(os.path.join(OUT,"01_제안"),exist_ok=True)
    p1=os.path.join(OUT,"01_제안","제안발표_v1.pptx"); p2=os.path.join(OUT,"01_제안","제안서_v1.docx")
    build_pptx(p1); build_docx(p2)
    for p in (p1,p2): print("OK",os.path.getsize(p),p)
