// 문서·제안 스킬 등록부 — 이 PC 에 있는 문서 작성·제안서 스킬을 AX Office 에이전트가 쓰도록 한곳에 등록한다.
// 스킬 파일은 저장소에 두지 않는다(사내·계정 동기화·플러그인 스킬). 여기에는 이름·쓰임새·붙는 곳만 적고,
// 실제 지침은 이 PC 에서 이름으로 찾는다(skills.mjs — 저장소 → 사용자 → 계정 동기화 → 기획 패키지 → 플러그인).
//
//   cat      proposal(제안·견적) | document(문서 작성·보고·검수)
//   inline   true  — 작업 지시문에 본문을 넣는다(짧고 절차 중심인 지침)
//            false — '참고 스킬'로 경로만 알려 주고 필요할 때 읽게 한다(길거나, 스크립트 실행을 전제로 한 지침)
//   exec     스크립트 실행을 전제로 한 스킬(docx·pptx·xlsx·pdf). 에이전트는 명령을 실행하지 못하므로 형식·구성 지침으로만 쓰고,
//            파일은 서버가 만든다 — Word 는 모든 산출물(docxExport.mjs), 엑셀은 견적처럼 표가 본체인 단계(xlsxExport.mjs). PPT·PDF 파일은 만들지 않는다
//   auto     작업 제목·완료 기준에 이 말이 있으면 자동으로 붙인다(참고 스킬만 — 지시문이 길어지지 않게)
//   agents   이 스킬을 쓰는 담당(화면 표시·팀장 안내용). 표준 절차 단계의 스킬은 proposal.mjs·planning.mjs 가 정한다
//   usable   false — 이 PC 에 있어도 에이전트 실행에서는 못 쓴다(외부 도구 연결·웹 검색·데이터 연결이 필요). 등록부에는 보이되 붙이지 않는다
// 고객사 전용 제안 스킬('<고객>-…-proposal')은 이름을 적지 않는다 — 사용자 스킬 폴더에서 찾아 브리핑에 그 고객사가 나오면 붙는다(findClientProposalSkills).

const EXEC_NOTE_KO = '스크립트 실행 전제 — 에이전트는 형식·구성 지침으로만 씀';
const EXEC_NOTE_EN = 'Assumes running scripts — agents use it for format and structure only';

export const SKILL_REGISTRY = [
  // ── 제안·견적 ──
  { name: 'wylie-proposal|proposal-writing', cat: 'proposal', inline: true, agents: ['han'], ko: '와일리 제안서 작성', en: 'Wylie proposal writing', useKo: 'RFP 분석·요구·평가 대응, 전략·목차·본문(사내 스킬이 없으면 공용 proposal-writing)', useEn: 'RFP analysis, requirement-scoring, strategy, outline and body (falls back to the public proposal-writing)' },
  { name: 'wylie-proposal-visual|ui-review', cat: 'proposal', inline: true, agents: ['cha', 'han'], ko: '제안 장표 시각 규격', en: 'Proposal visual spec', useKo: '색·서체·16:9 그리드·장표 유형별 규격', useEn: 'Colors, type, 16:9 grid and slide-type specs' },
  { name: 'wylie-proposal-review|proposal-review', cat: 'proposal', inline: true, agents: ['go'], ko: '제안서 검수', en: 'Proposal review', useKo: '필수 게이트·품질 루브릭·장표 단위 질문으로 제출 준비 판정', useEn: 'Required gates, quality rubric and per-slide questions for a submit verdict' },
  { name: 'proposal-maker', cat: 'proposal', inline: true, agents: ['han'], ko: '제안서 메이커', en: 'Proposal maker', useKo: '금융·UX·RFP 대응 제안서 구성(PPT 파일은 만들지 않고 구성안으로)', useEn: 'Proposal structure for finance, UX and RFP responses (an outline, not a PPT file)' },
  { name: 'proposal-skills', cat: 'proposal', inline: true, agents: ['cha'], ko: 'UX 제안 리서치', en: 'UX proposal research', useKo: 'RFP·요구 정의·시장조사·벤치마킹·페르소나·저니맵', useEn: 'RFP, requirements, market research, benchmarking, personas, journey maps' },
  { name: 'strategy-proposal-analyzer', cat: 'proposal', inline: true, agents: ['kim'], ko: '전략 제안 분석', en: 'Strategy proposal analysis', useKo: '경쟁사 비교·페인포인트·인사이트 도출', useEn: 'Competitor comparison, pain points and insights' },
  { name: 'rfp-analysis', cat: 'proposal', inline: true, agents: ['han'], ko: 'RFP 분석', en: 'RFP analysis', useKo: '요구·평가 대응표와 Go/No-Go 근거', useEn: 'Requirement-scoring matrix and Go/No-Go basis' },
  { name: 'proposal-estimate', cat: 'proposal', inline: true, agents: ['jeong'], ko: '견적 산정', en: 'Estimate', useKo: '견적기준표·인력투입계획·견적서(안), M/M·금액 정합(표는 엑셀로 함께 저장)', useEn: 'Cost basis, staffing plan, draft quote and consistency checks (tables also saved as Excel)', auto: /견적|인력\s?투입|M\/M\s?산정|estimate|quotation/i },
  { name: 'clubschool:rfp-evaluation', cat: 'proposal', inline: true, agents: ['han'], ko: 'RFP 5축 평가', en: 'RFP 5-axis evaluation', useKo: '적합성·승산·수익성·리스크·전략가치로 Go/No-Go 권고(클럽스쿨 플러그인)', useEn: 'Go/No-Go on fit, win odds, margin, risk and strategic value (clubschool plugin)' },
  { name: 'si-lifecycle-agent:si-lifecycle-orchestrator', cat: 'proposal', inline: false, agents: ['han', 'jeong'], ko: 'SI 수명주기', en: 'SI lifecycle', useKo: 'RFP → 요구 정의 → 제안 → 수주 후 재정리의 단계·산출물 규격(금융 SI 기준)', useEn: 'Stages and deliverable specs from RFP to requirements, proposal and rebaseline (finance SI)' },
  { name: 'customer-journey-mapper', cat: 'proposal', inline: false, agents: ['kim', 'cha'], ko: '고객 여정 지도', en: 'Customer journey map', useKo: '현재 고객 여정·접점·페인포인트(제안 조사·UX 섹션)', useEn: 'Current journey, touchpoints and pain points (research and UX section)', auto: /여정|저니맵|journey/i },
  { name: 'small-business:proposal-builder', cat: 'proposal', inline: false, agents: ['han'], ko: '상담 기록 → 제안서', en: 'Discovery to proposal', useKo: '상담 기록·RFP 에서 범위·가격 선택지가 있는 제안서 초안', useEn: 'A proposal with scope and pricing options from discovery notes or an RFP' },
  { name: 'small-business:grant-rfp-writer', cat: 'proposal', inline: false, agents: ['han'], ko: '공모·RFP 응답서', en: 'Grant and RFP response', useKo: '자격 확인·Go/No-Go·응답서 초안', useEn: 'Eligibility, Go/No-Go and a response draft' },

  // ── 문서 작성·보고·검수 ──
  { name: 'docx', cat: 'document', inline: false, exec: true, agents: ['han', 'na', 'go', 'hong'], ko: 'Word 문서', en: 'Word documents', useKo: '문서 구조·서식 지침. Word 파일은 서버가 모든 산출물에서 자동으로 만든다', useEn: 'Document structure and styling. The server makes a Word copy of every deliverable', auto: /워드|docx|\bword\b/i },
  { name: 'pptx', cat: 'document', inline: false, exec: true, agents: ['cha', 'han'], ko: 'PowerPoint 장표', en: 'PowerPoint slides', useKo: '장표 구성·레이아웃 지침. PPT 파일은 만들지 않고 장표 구성안(마크다운)으로 낸다', useEn: 'Slide structure and layout. No PPT file — the output is a slide plan in markdown', auto: /PPT|pptx|파워포인트|슬라이드|발표\s?자료|deck|slides?\b/i },
  { name: 'xlsx', cat: 'document', inline: false, exec: true, agents: ['jeong', 'go'], ko: 'Excel 표', en: 'Excel sheets', useKo: '표·수식·서식 지침. 견적 단계의 표는 서버가 엑셀로 저장한다', useEn: 'Tables, formulas and formatting. The server saves estimate tables as Excel', auto: /엑셀|xlsx|excel|스프레드시트|spreadsheet/i },
  { name: 'pdf', cat: 'document', inline: false, exec: true, agents: [], ko: 'PDF', en: 'PDF', useKo: 'PDF 다루기 지침(첨부 PDF 읽기는 Read 로 바로 가능, PDF 파일 만들기는 지원 안 함)', useEn: 'PDF handling (attached PDFs can be read directly; making PDF files is not supported)' },
  { name: 'doc-coauthoring', cat: 'document', inline: false, agents: ['na', 'jeong'], ko: '문서 공동 작성 절차', en: 'Doc co-authoring', useKo: '기획서·명세·제안 문서를 맥락 수집 → 구조 → 초안 → 다듬기 순서로', useEn: 'Specs, plans and proposals via context, structure, draft and refine', auto: /기획서|명세서|정책서|spec\b|design doc/i },
  { name: 'internal-comms', cat: 'document', inline: true, agents: ['hong', 'go'], ko: '사내 커뮤니케이션', en: 'Internal comms', useKo: '공지·현황 보고·뉴스레터·FAQ 형식', useEn: 'Announcements, status updates, newsletters and FAQs', auto: /공지|사내|뉴스레터|newsletter|announcement/i },
  { name: 'operations:status-report', cat: 'document', inline: true, agents: ['go'], ko: '현황 보고', en: 'Status report', useKo: 'KPI·리스크·조치 항목이 있는 주간·월간 보고(운영 플러그인)', useEn: 'Weekly or monthly report with KPIs, risks and actions (operations plugin)', auto: /현황\s?보고|주간\s?보고|월간\s?보고|status\s?report/i },
  { name: 'clubschool:weekly-report', cat: 'document', inline: true, agents: ['go'], ko: '주간 성과 보고', en: 'Weekly performance report', useKo: '주간 KPI 변화·원인·조치(클럽스쿨 플러그인)', useEn: 'Weekly KPI changes, causes and actions (clubschool plugin)' },
  { name: 'operations:process-doc', cat: 'document', inline: false, agents: ['na', 'jeong'], ko: '업무 프로세스 문서', en: 'Process doc', useKo: '플로차트·RACI·SOP(운영 플러그인)', useEn: 'Flowcharts, RACI and SOPs (operations plugin)', auto: /RACI|SOP|업무\s?절차|프로세스\s?문서/i },
  { name: 'small-business:report-builder', cat: 'document', inline: false, agents: ['go'], ko: '반복 보고서 설계', en: 'Recurring report builder', useKo: '지표 정의·데이터 출처·형식을 정한 반복 보고서', useEn: 'A repeatable report with metrics, sources and format' },
  { name: 'clubschool:gate-review', cat: 'document', inline: true, agents: ['go'], ko: '산출물 게이트 검수', en: 'Gate review', useKo: '공통 완료 기준·100점 루브릭으로 합격/재작업 판정(클럽스쿨 플러그인)', useEn: 'Pass or rework on shared done criteria and a 100-point rubric (clubschool plugin)' },
  { name: 'ba-agent', cat: 'document', inline: true, agents: ['jeong'], ko: '요구사항 정의(BA)', en: 'Requirements (BA)', useKo: '요구사항 정의서·추적표(사내 스킬)', useEn: 'Requirements spec and traceability (company skill)' },
  { name: 'theme-factory', cat: 'document', inline: false, agents: ['cha'], ko: '문서·장표 테마', en: 'Doc and slide themes', useKo: '색·서체 테마 10종 — 사내 시각 규격이 없을 때', useEn: 'Ten color and type themes — when no company visual spec applies' },

  // ── 이 PC 에 있지만 에이전트 실행에서는 못 쓰는 스킬(외부 도구·웹·데이터 연결 필요) ──
  { name: 'convergence-monthly-report', cat: 'document', usable: false, whyKo: '손익 대시보드 데이터 연결 필요', whyEn: 'Needs the P&L dashboard data', ko: '컨버전스 월간 보고', en: 'Convergence monthly report', useKo: '월간회의 보고서', useEn: 'Monthly meeting report' },
  { name: 'docs', cat: 'document', usable: false, whyKo: '문서 연결 도구 필요', whyEn: 'Needs the docs connector', ko: '공유 문서(Docs)', en: 'Shared docs', useKo: '공유·댓글 문서', useEn: 'Shared, commentable documents' },
  { name: 'deep-research', cat: 'document', usable: false, whyKo: '웹 검색 필요(에이전트는 웹 검색 금지)', whyEn: 'Needs web search (agents cannot search)', ko: '심층 조사', en: 'Deep research', useKo: '여러 출처 조사·비교', useEn: 'Multi-source research' },
  { name: 'adobe-for-creativity:adobe-anydocx', cat: 'document', usable: false, whyKo: 'Adobe 도구 연결 필요', whyEn: 'Needs Adobe tools', ko: 'Adobe Word 변환', en: 'Adobe Word conversion', useKo: 'PDF → Word', useEn: 'PDF to Word' },
  { name: 'adobe-for-creativity:adobe-anypptx', cat: 'document', usable: false, whyKo: 'Adobe 도구 연결 필요', whyEn: 'Needs Adobe tools', ko: 'Adobe PPT 변환', en: 'Adobe PPT conversion', useKo: '문서 → PPT', useEn: 'Docs to PPT' },
  { name: 'adobe-for-creativity:adobe-anyexcel', cat: 'document', usable: false, whyKo: 'Adobe 도구 연결 필요', whyEn: 'Needs Adobe tools', ko: 'Adobe Excel 변환', en: 'Adobe Excel conversion', useKo: '문서 → Excel', useEn: 'Docs to Excel' },
  { name: 'adobe-for-creativity:adobe-anypdf', cat: 'document', usable: false, whyKo: 'Adobe 도구 연결 필요', whyEn: 'Needs Adobe tools', ko: 'Adobe PDF 변환', en: 'Adobe PDF conversion', useKo: '문서 → PDF', useEn: 'Docs to PDF' },
  { name: 'adobe-for-creativity:adobe-document-review', cat: 'document', usable: false, whyKo: 'Adobe 도구 연결 필요', whyEn: 'Needs Adobe tools', ko: 'Adobe 문서 검토', en: 'Adobe document review', useKo: 'PDF 강조·검토', useEn: 'PDF highlighting and review' },
].map((e) => ({ usable: true, inline: true, exec: false, agents: [], ...e, ...(e.exec ? { noteKo: EXEC_NOTE_KO, noteEn: EXEC_NOTE_EN } : {}) }));

const BY_ALT = new Map();
for (const e of SKILL_REGISTRY) for (const alt of e.name.split('|')) if (!BY_ALT.has(alt)) BY_ALT.set(alt, e);

/** 스킬 이름(또는 'a|b' 의 한쪽) → 등록부 항목. 등록부에 없으면 null(기존 동작 — 본문을 넣는다). */
export function registryEntry(name) {
  return BY_ALT.get(String(name || '')) || null;
}

/** 작업 글(제목·완료 기준)에 맞는 자동 스킬 — 참고 스킬(inline:false) 이거나 짧은 지침만. */
export function autoSkills(text) {
  const t = String(text || '');
  return SKILL_REGISTRY.filter((e) => e.usable && e.auto && e.auto.test(t)).map((e) => e.name);
}

/** 팀장이 작업에 골라 붙일 수 있는 스킬(쓸 수 있는 것만). */
export function pickableSkills() {
  return SKILL_REGISTRY.filter((e) => e.usable);
}
