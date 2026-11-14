// 화면 패널 문구 — 한국어(기본)·영어. 사무실 그림 안 문구는 simText.ts.
// 서버 데이터의 상태 값(대기·진행…)·승인 종류는 한국어 그대로 오므로 표시할 때만 바꾼다(statusLabel 등).

import { createContext, useContext } from 'react';
import type { Lang } from './simText';
import { SIM_TEXT } from './simText';

export type { Lang };

type Dict = Record<string, string>;

const ko: Dict = {
  'top.demo': '데모', 'top.hive': 'hive 연결', 'top.noServer': '서버 응답 없음', 'top.concurrency': '동시 {r}/{l}',
  'top.pause': '일시정지', 'top.play': '재생', 'top.pauseTitle': '사무실 애니메이션 일시정지·재생(작업 진행과는 무관)', 'top.autoDemo': '자동 결재(데모)', 'top.reset': '리셋', 'top.lang': '언어',
  'login.title': 'Claude 로그인이 풀려 있습니다', 'login.body': '이 상태에서는 팀장 분해·역할 실행·QA가 "로그인 필요"로 실패합니다. [로그인]을 누르면 새 PowerShell 창에서 로그인을 진행합니다.',
  'login.button': '로그인', 'login.opening': '로그인 창을 여는 중…', 'login.opened': 'PowerShell 창이 열렸습니다. 브라우저에서 승인한 뒤 화면의 코드를 그 창에 붙여 넣으세요. 끝나면 이 배너가 사라집니다.', 'login.failed': '로그인 창을 열지 못했습니다: {e}',
  'cli.missing': 'Claude Code CLI를 찾지 못했습니다.', 'cli.body': 'Claude 데스크톱 앱이 설치·로그인돼 있는지 확인하세요. CLI 없이 더미로 바꿔 돌리지 않습니다.',
  'question.title': '팀장이 되물었습니다', 'question.hint': '결과 줄을 고쳐 다시 보내 주세요.',
  'srv.label': 'PC 서버 주소', 'srv.placeholder': 'https://xxxx.trycloudflare.com  (PC 에서 start-ax-office.ps1 이 출력한 주소)', 'srv.connect': '연결', 'srv.disconnect': '연결 해제',
  'srv.bad': 'https:// 로 시작하는 서버 주소를 넣어 주세요.', 'srv.saved': '이 브라우저에 저장된 주소로 연결 중입니다. 터널을 새로 켜면 주소가 바뀝니다.', 'srv.none': '미연결이면 내부 데모만 돕니다. PC 에서 서버와 터널을 켠 뒤 그 주소를 넣으면 실제 작업을 여기서 봅니다.',
  'legend.working': '작업 중', 'legend.waiting': '승인·QA 대기', 'legend.idle': '대기', 'legend.lead': '팀장',
  'legend.hive': '봉투 = 메시지(배정·회신·승인 요청) · 책상을 누르면 그 사람 선택', 'legend.demo': '데모 — 게이트마다 담당자들이 회의실에서 킥오프', 'gates.aria': '파이프라인 게이트 현황', 'gate.approve': '결재',
  'office.aria': '팀장과 AI 에이전트가 메시지를 주고받으며 일하는 픽셀 사무실 평면도. 책상을 누르면 그 에이전트를 선택합니다.',
  'cc.title': '커맨드 센터', 'cc.leadIdle': '팀장이 사무실을 운영 중', 'cc.auto': '자동 진행', 'cc.autoTitle': '브리핑을 받으면 팀장이 나눠 자동으로 진행합니다. 외부 발송·비용·삭제·범위 변경·수치 확정만 승인 카드로 멈춥니다.',
  'cc.connected': 'hive 연결', 'cc.demo': '서버 미연결 · 데모', 'cc.clearSel': '선택 해제',
  'tab.tasks': '작업', 'tab.approvals': '승인', 'tab.questions': '질문', 'tab.memory': '기억', 'tab.activity': '활동', 'tab.skills': '스킬', 'tab.terminal': '터미널', 'tab.monitor': '모니터', 'tab.triggers': '예약', 'tab.graph': '관계도',
  'queue.title': '대기열', 'queue.hint': '팀장에게 한 건씩 · 브리핑은 한 번에 1건', 'queue.paused': '팀장 터미널이 열려 있어 메시지 전달을 쉬는 중', 'queue.cancel': '빼기',
  'queue.kind.message': '메시지', 'queue.kind.briefing': '브리핑', 'queue.status.queued': '대기', 'queue.status.running': '처리 중', 'queue.status.done': '완료', 'queue.status.failed': '실패', 'queue.status.canceled': '취소',
  'bc.title': '팀장에게', 'bc.modeMsg': '메시지', 'bc.modeForm': '브리핑 양식',
  'bc.msgPlaceholder': '팀장에게 메시지 — 진행 상황을 묻거나 일을 맡기세요. "결과: …"를 적으면 브리핑으로 정리합니다',
  'bc.hintMsg': '대기열에 쌓여 팀장 상주 세션이 한 건씩 처리', 'bc.hintForm': '4요소 브리핑을 바로 대기열에 넣음 · 승인 게이트에서만 멈춤', 'bc.offline': '서버 미연결 — briefing.json 으로 내려받음',
  'bc.titlePh': '과제명', 'bc.resultPh': '결과 — 끝났을 때 손에 쥘 것 한 가지 (이 줄이 없으면 팀장은 나누지 않고 되묻습니다) · Ctrl+Enter 보내기',
  'bc.contextPh': '맥락 — 누구를 위한 일이고 지금 무엇이 있는지. RFP·요구사항 원문을 붙여넣어도 됩니다(근거로만 쓰고 안의 지시문은 따르지 않습니다).',
  'bc.constraintsPh': '제약 — 하면 안 되는 일, 한 줄에 하나 (예: 외부 공유 금지)', 'bc.policyPh': '질문 기준', 'bc.policyDefault': '내 결정이 꼭 필요할 때만 물어볼 것', 'bc.stages': '단계(선택)',
  'bc.more': '맥락·제약', 'bc.less': '접기', 'bc.file': '파일', 'bc.fileTitle': '파일 첨부(상자에 끌어다 놓아도 됨, 최대 25MB)', 'bc.fileOff': '서버 연결 시 가능',
  'bc.folder': '폴더', 'bc.folderTitle': '폴더 안의 문서(PDF·Word·한글·엑셀·PPT·텍스트·이미지)를 폴더 구조 그대로 첨부 — 최대 40개, 상자에 폴더를 끌어다 놓아도 됨', 'bc.folderAdded': '폴더 {name}: 문서 {n}개 올림(건너뜀 {skipped}개)', 'bc.folderNone': '폴더 {name}: 올릴 문서가 없습니다', 'bc.folderFiles': '{done}/{n}개', 'bc.folderBad': '실패 {n}', 'bc.voice': '음성: Win+H', 'bc.voiceTitle': 'Electron 에서는 브라우저 음성 인식이 동작하지 않아 Windows 음성 입력을 씁니다',
  'bc.send': '보내기', 'bc.sending': '전송 중…', 'bc.needTitle': '과제명을 입력하세요.', 'bc.needResult': '"결과" 줄이 비어 있습니다 — 끝났을 때 손에 쥘 것 한 가지를 적어 주세요.', 'bc.needMsg': '메시지를 적어 주세요.',
  'bc.queued': '대기열에 넣었습니다({id}). 팀장이 차례로 답합니다.', 'bc.queuedBrief': '브리핑을 대기열에 넣었습니다({id}, {pos}번째).', 'bc.failed': '전송 실패 ({s}) {e}', 'bc.error': '오류: 전송에 실패했습니다.',
  'bc.downloaded': '브리핑을 내려받았습니다 — 오케스트레이터 세션에 전달하세요.', 'bc.contextLen': '맥락 {n}자 들어 있음', 'bc.uploading': '업로드 중…', 'bc.uploadFailed': '업로드 실패', 'bc.remove': '제거',
  'ag.aria': '에이전트', 'ag.leadBadge': '팀장', 'ag.idle': '대기 중', 'ag.demo': '데모', 'ag.usage': '누적 사용량 {v} (CLI 추정)', 'ag.add': '인원 추가', 'ag.addHint': '역할 템플릿', 'ag.full': '가득 참', 'ag.custom': '추가 인원',
  'tasks.title': '작업판', 'tasks.offline': '서버에 연결하면 팀장이 나눈 작업 원장이 여기에 보입니다. 지금은 데모 시나리오가 돕니다.',
  'tasks.empty': '브리핑을 보내면 팀장이 나눈 작업이 여기에 쌓입니다. 선행 작업이 없는 작업은 담당이 겹치지 않는 한 동시에 시작합니다.', 'tasks.gate': '게이트 {g}', 'tasks.needsApproval': '승인 필요', 'tasks.cap': '상한 {v}',
  'ap.pending': '승인 대기 {n}건 — 해당 작업만 멈춤', 'ap.none': '승인 대기 없음', 'ap.by': '행위자', 'ap.reason': '사유 (필수 — 없으면 기록되지 않음)', 'ap.approve': '승인', 'ap.reject': '반려',
  'ap.needReason': '사유를 적어야 기록됩니다.', 'ap.done': '{id} {d} 기록됨', 'ap.failed': '실패: {e}', 'ap.history': '결정 기록', 'ap.approved': '승인', 'ap.rejected': '반려',
  'ap.demoNone': '데모: 결재 대기가 생기면 여기에 카드가 뜹니다.', 'ap.demoApprove': '결재하기(데모)', 'ap.budgetNote': '상한 {cap} · 지금까지 {cost} — 승인하면 상한 두 배로 이어서 실행', 'ap.resumeNote': '서킷 브레이커 중지 — 승인하면 다시 배정',
  'qs.offline': '서버에 연결하면 에이전트가 재하에게 묻는 질문이 여기에 쌓입니다.', 'qs.open': '답을 기다리는 질문 {n}건', 'qs.none': '열린 질문 없음 — 작업은 멈추지 않고 가정으로 진행합니다.',
  'qs.answerPh': '답 — 질문한 에이전트가 다음 작업 때 읽습니다(팀장은 바로 받음)', 'qs.send': '답하기', 'qs.answered': '답한 질문', 'qs.by': '답한 사람', 'qs.need': '답과 답한 사람을 적어 주세요.', 'qs.sent': '{id} 답을 보냈습니다.',
  'mem.offline': '서버에 연결하면 에이전트별 기억(hive/memory)이 보입니다.', 'mem.agent': '에이전트', 'mem.choose': '선택…', 'mem.pick': '아래 에이전트 카드를 누르거나 위에서 고르면 그 사람의 기억 파일을 보여 줍니다.',
  'mem.fail': '기억 파일을 읽지 못했습니다.', 'mem.empty': "{name}의 기억이 아직 없습니다. 작업이 끝날 때 회신의 '기억할 것'이 3줄 이내로 쌓이고, 다음 작업 시작 때 읽힙니다.",
  'act.demoEmpty': '데모 활동이 여기에 기록됩니다.', 'act.filtered': '{name} 관련 활동만 보입니다.', 'act.all': 'hive 이벤트 로그(events.log)를 3초마다 이어 받습니다.', 'act.empty': '아직 기록된 활동이 없습니다.',
  'sk.offline': '서버에 연결하면 역할별 스킬(업무 지침서)과 이 PC 에서 쓸 수 있는지가 보입니다.', 'sk.lead': '팀장은 스킬 없이 브리핑 분해·배정·추적·보고만 합니다(.claude/agents/leader.md).',
  'sk.hint': '작업마다 서버가 스킬 지침을 찾아 에이전트 지시문에 넣습니다. 이 PC 에 없는 사내 스킬은 공용 스킬로 대체되거나 건너뜁니다.', 'sk.none': '연결된 스킬 없음 — 페르소나만으로 작업', 'sk.use': '사용: {n}', 'sk.missing': '이 PC 에 없음: {n}',
  'tm.offline': '서버에 연결하면 책상별 실시간 기록과 대화형 터미널을 씁니다.', 'tm.desk': '책상', 'tm.open': '터미널 열기', 'tm.close': '터미널 닫기', 'tm.backLive': '기록 보기', 'tm.live': '실시간 기록',
  'tm.noTask': '{name}의 작업 기록이 아직 없습니다.', 'tm.leadLog': '팀장 상주 세션 기록', 'tm.task': '작업 {id} · {title}', 'tm.ptyOff': '대화형 터미널을 쓸 수 없습니다(node-pty 없음).',
  'tm.ptyNote': '직접 입력하는 대화형 세션 — 구독 사용량을 씁니다', 'tm.exited': '[세션 종료: {code}]', 'tm.connecting': '연결 중…', 'tm.openFailed': '터미널을 열지 못했습니다: {e}', 'tm.leadPause': '팀장 터미널이 열려 있는 동안 대기열의 메시지 전달은 쉽니다.',
  'mo.offline': '서버에 연결하면 사용량·예산·서킷 브레이커가 보입니다.', 'mo.title': '사용량 (CLI 추정 — 청구서 아님)', 'mo.total': '합계', 'mo.today': '오늘', 'mo.byAgent': '에이전트별 오늘 · 하루 예산 대비', 'mo.byDay': '일별 (최근 7일)',
  'mo.tasks': '작업별 비용', 'mo.cap': '작업당 상한($)', 'mo.budget': '에이전트 하루 예산($)', 'mo.save': '저장', 'mo.saved': '저장됨', 'mo.level': '단계', 'mo.reset': '초기화', 'mo.resetReason': '초기화 사유',
  'mo.breakerHint': '연속 문제 1회 조정 · 2회 제한(턴·상한 절반) · 3회 중지 · 하루 예산 80% 제한 · 100% 중지', 'mo.stopHint': "중지된 에이전트는 '승인' 탭의 재개 카드로 풉니다.", 'mo.needReason': '초기화하려면 사유를 적어 주세요.',
  'add.title': '인원 추가 — 역할 템플릿', 'add.name': '이름', 'add.nameEn': '영어 이름(선택)', 'add.add': '추가', 'add.close': '닫기', 'add.limit': '추가 인원 {n}/{max} — 확장 구역 책상 수만큼',
  'add.added': '추가한 인원', 'add.remove': '빼기', 'add.goal': '목표', 'add.stages': '산출물 단계', 'add.skills': '스킬', 'add.done': '{name} 추가됨', 'add.removed': '{name} 뺌', 'add.offline': '서버에 연결해야 인원을 추가할 수 있습니다.',
  'lv.normal': '정상', 'lv.steer': '조정', 'lv.constrain': '제한', 'lv.stop': '중지',
  'ev.briefing': '브리핑 접수 — {title}', 'ev.task': '{id} {title} → {status}{gate}', 'ev.mail': '→ {to} {what}{task}', 'ev.approvalPending': '승인 요청 {id} · {task} · {kind}', 'ev.approvalDone': '{id} {d} ({task})',
  'ev.usage': '{what} 사용량 {v}', 'ev.question': '질문 {id}{task}', 'ev.questionAnswered': '{id} 답함', 'ev.queue': '대기열 {id} {kind} → {status}', 'ev.breaker': '서킷 브레이커 → {level}{reason}',
  'ev.agentAdd': '인원 추가 {id}', 'ev.agentRemove': '인원 삭제 {id}', 'ev.leaderReply': '상주 세션 답 {id}', 'ev.inboxDone': '받은 편지 {n}건 처리 → inbox/.done',
  'tr.offline': '서버에 연결하면 예약을 만들 수 있습니다.', 'tr.title': '예약 {n}/{max}', 'tr.add': '+ 예약 추가', 'tr.cancel': '취소',
  'tr.note': '정해진 시각에 브리핑을 대기열에 넣습니다. 앱이 켜져 있을 때만 돌고, 꺼져 있던 동안 지난 예약은 건너뛰고 놓침으로 남깁니다. 실행할 때 제목 끝에 날짜가 붙습니다.',
  'tr.name': '예약 이름(= 브리핑 제목)', 'tr.namePh': '예: 주간 사업 현황 보고', 'tr.result': '결과', 'tr.resultPh': '끝나면 손에 쥘 것 — 예: 주간 현황 1쪽(마크다운)',
  'tr.context': '맥락(선택)', 'tr.contextPh': '배경·참고할 것', 'tr.constraints': '제약(선택, 줄마다 하나)', 'tr.constraintsPh': '예: 작업은 2건 이내',
  'tr.repeat': '반복', 'tr.k_weekly': '매주', 'tr.k_daily': '매일', 'tr.k_once': '한 번', 'tr.days': '요일',
  'tr.d0': '일', 'tr.d1': '월', 'tr.d2': '화', 'tr.d3': '수', 'tr.d4': '목', 'tr.d5': '금', 'tr.d6': '토',
  'tr.date': '날짜', 'tr.time': '시각', 'tr.save': '예약 저장', 'tr.added': '{id} 예약함 — 다음 실행 {next}', 'tr.turnedOff': '{id} 끔', 'tr.turnedOn': '{id} 켬',
  'tr.ran': '{id} 지금 실행 → 대기열 {item}', 'tr.deleted': '{id} 삭제함', 'tr.empty': '예약이 없습니다. 매주 같은 보고처럼 반복되는 브리핑을 예약해 두세요.',
  'tr.on': '켜짐', 'tr.off': '꺼짐', 'tr.turnOn': '켜기', 'tr.turnOff': '끄기', 'tr.daily': '매일 {time}', 'tr.onceAt': '{date} {time} 한 번', 'tr.weeklyAt': '매주 {days} {time}',
  'tr.next': '다음', 'tr.last': '지난 실행', 'tr.runs': '{n}회 실행', 'tr.by': '만든 사람 {name}', 'tr.missed': '놓침 {at} — 그 시각에 앱이 꺼져 있었거나 앞선 실행이 대기 중이었습니다',
  'tr.runNow': '지금 실행', 'tr.confirmDel': '정말 지울까요?', 'tr.delete': '삭제',
  'gr.offline': '서버에 연결하면 작업 관계도를 볼 수 있습니다.', 'gr.empty': '아직 작업이 없습니다. 브리핑을 보내면 팀장이 나눈 작업의 선후관계가 여기에 그려집니다.',
  'gr.title': '작업 관계도', 'gr.briefing': '브리핑', 'gr.current': '지금', 'gr.summary': '작업 {n}건 · 완료 {done} · 진행 {run} · 승인대기 {wait} · 보류/실패 {closed} · {cols}단계',
  'gr.after': '선행: {ids}', 'gr.legendDone': '선행 완료', 'gr.legendWait': '선행 대기', 'gr.legendBroken': '선행 보류·실패', 'gr.hint': '노드를 누르면 담당자 선택',
  'ev.trigger_add': '예약 추가 {id} {title}', 'ev.trigger_update': '예약 변경 {id} {title}', 'ev.trigger_on': '예약 켬 {id}', 'ev.trigger_off': '예약 끔 {id}',
  'ev.trigger_delete': '예약 삭제 {id} {title}', 'ev.trigger_run': '예약 실행 {id} {title} → {item}', 'ev.trigger_missed': '예약 놓침 {id} {title}', 'ev.triggerWho': '예약',
  'tl.start': '시작', 'tl.assign': '배정', 'tl.tool': '도구', 'tl.text': '글', 'tl.tool_result': '결과', 'tl.note': '메모', 'tl.end': '끝', 'tl.error': '오류', 'tl.qa_start': 'QA', 'tl.qa': 'QA 판정',
  'tl.approval': '승인 요청', 'tl.approval_done': '승인 결과', 'tl.budget_stop': '상한 초과', 'tl.done': '완료', 'tl.user_msg': '재하', 'tl.briefing_queued': '브리핑 등록', 'tl.session_new': '새 세션',
  'tab.talk': '대화', 'tab.templates': '템플릿',
  'talk.offline': '서버에 연결하면 팀장·에이전트·재하가 주고받은 메시지(배정·회신·질문·승인 요청·보고)가 여기에 보입니다.', 'talk.title': '대화 {n}건',
  'talk.all': '받은 편지함과 처리한 편지를 4초마다 다시 읽습니다. 고객 원문 같은 자료 울타리 안 내용은 줄여서 보여 줍니다.', 'talk.filtered': '{name} 관련 메시지만 보입니다.',
  'talk.empty': '아직 주고받은 메시지가 없습니다. 브리핑을 보내면 팀장의 배정부터 쌓입니다.', 'talk.fail': '메시지를 불러오지 못했습니다. 다음 갱신 때 다시 읽습니다.',
  'talk.more': '펼치기', 'talk.less': '접기', 'talk.cut': '앞 600자만 보임', 'talk.to': '→',
  'talk.type.assign': '지시', 'talk.type.result': '회신', 'talk.type.question': '질문', 'talk.type.answer': '답', 'talk.type.approval': '승인 요청', 'talk.type.report': '보고',
  'tpl.offline': '서버에 연결하면 브리핑 템플릿을 쓰고 저장할 수 있습니다.', 'tpl.title': '브리핑 템플릿 · 내 템플릿 {n}/{max}',
  'tpl.note': '[이 템플릿으로 쓰기]를 누르면 입력창이 브리핑 양식으로 바뀌고 과제명·결과·맥락·제약이 채워집니다. [대괄호] 부분을 고친 뒤 보내기는 직접 누르세요. 지금 쓰는 양식은 입력창의 [템플릿으로 저장]으로 남깁니다.',
  'tpl.builtin': '기본', 'tpl.mine': '내 템플릿', 'tpl.use': '이 템플릿으로 쓰기', 'tpl.used': '입력창에 채웠습니다: {title} — 확인 후 [보내기]를 누르세요.',
  'tpl.delete': '삭제', 'tpl.confirmDel': '정말 지울까요?', 'tpl.cancel': '취소', 'tpl.deleted': '지웠습니다: {title}', 'tpl.result': '결과', 'tpl.steps': '진행 단계 — 서버가 이 순서로 나눕니다',
  'set.title': '설정', 'set.close': '닫기', 'set.offline': 'PC 서버에 연결되면 산출물 위치·비용·동작을 바꿀 수 있습니다. 지금은 언어만 바꿀 수 있습니다.', 'set.loadFail': '설정을 불러오지 못했습니다.',
  'set.storage': '산출물 저장 위치', 'set.current': '지금 위치', 'set.default': '기본 위치', 'set.openFolder': '폴더 열기', 'set.reset': '기본 위치로',
  'set.newDir': '새 위치', 'set.dirPh': '예: D:\\제안\\산출물', 'set.pick': '폴더 고르기', 'set.copy': '기존 산출물도 새 폴더로 복사 (덮어쓰지 않고, 예전 폴더 파일은 그대로 둠)',
  'set.apply': '이 위치로 바꾸기', 'set.running': '브리핑이 진행 중이라 지금은 바꿀 수 없습니다.',
  'set.storageNote': '에이전트는 이 폴더를 작업 폴더로 씁니다. 과제마다 하위 폴더가 생기고 .md 와 .docx 가 함께 저장됩니다. 복사하지 않으면 지난 산출물은 예전 폴더에 남아 작업 탭에서 열리지 않습니다.',
  'set.changed': '산출물 위치를 바꿨습니다: {dir}', 'set.changedCopy': '산출물 위치를 바꾸고 기존 산출물을 복사했습니다: {dir}',
  'set.cost': '비용 한도', 'set.cap': '작업당 상한 ($)', 'set.daily': '에이전트 하루 예산 ($)', 'set.save': '저장', 'set.saved': '저장했습니다',
  'set.costNote': '상한을 넘으면 그 작업이 멈추고 승인 카드가 뜹니다. 하루 예산은 80%에서 제한, 100%에서 중지합니다.',
  'set.behavior': '동작', 'set.autoRevise': 'QA 반려 시 같은 담당이 1회 자동 보완', 'set.concurrency': '동시에 도는 작업 수',
  'set.concurrencyNote': '새 브리핑부터 적용됩니다. 같은 담당자의 작업은 동시에 돌지 않습니다.',
  'set.lang': '언어', 'set.env': '환경', 'set.data': '작업 기록(hive) 위치', 'set.dataNote': '승인·대화·기억이 저장되는 곳입니다. 이 화면에서는 옮길 수 없습니다.',
  'tasks.open': '열기', 'tasks.word': 'Word', 'tasks.folder': '폴더', 'tasks.openFail': '열지 못함 — {e}',
  'tasks.progress': '완료 {d}/{n}', 'tasks.cost': '사용 {v}', 'tab.more': '더보기', 'tab.plan': '기획',
  'set.kit': '기획 에이전트 패키지', 'set.kitOk': '연결됨', 'set.kitNone': '연결 안 됨', 'set.kitDisable': '끄기', 'set.kitApply': '연결', 'set.kitPh': '예: D:\\기획\\wylie-plan-agent',
  'set.kitOn': '기획 에이전트 패키지를 연결했습니다', 'set.kitOff': '기획 에이전트 패키지 연결을 껐습니다',
  'set.kitNote': '화면 규격(SKILL)·린트·검증·골든·팩 템플릿이 들어 있는 폴더입니다. 연결하면 화면설계 브리핑이 표준 기획 프로세스로 나뉘고, 기획 탭에서 팩과 화면을 봅니다. 패키지는 이 PC 에만 있고 저장소에는 올리지 않습니다.',
  'plan.title': '기획 — 프로젝트 팩', 'plan.offline': '서버에 연결하면 기획 에이전트의 프로젝트 팩과 화면설계서를 볼 수 있습니다.', 'plan.noKit': '기획 에이전트 패키지가 연결되지 않았습니다',
  'plan.noKitHint': '설정에서 패키지 폴더(scripts·packs·core 가 있는 폴더)를 지정하면 화면설계 브리핑이 표준 기획 프로세스로 돕니다.', 'plan.openSettings': '설정 열기',
  'plan.packCount': '팩 {n}개', 'plan.flow': '화면설계 브리핑 → ① 요구 원장 → ② 작업가이드·IA (승인) → ③ 2단 화면설계서(서버가 뼈대 생성, 린트·verify 게이트) → ④ 리뷰 → ⑤ 추적·3키 인계 (승인)',
  'plan.noPacks': '아직 팩이 없습니다. 화면설계 브리핑을 보내면 새 팩이 만들어집니다.', 'plan.layers': 'SSOT 5계층',
  'plan.l.rules': '규칙', 'plan.l.ia': 'IA', 'plan.l.guide': '작업가이드', 'plan.l.readme': 'README', 'plan.l.template': '템플릿',
  'plan.s.none': '없음', 'plan.s.draft': '초안', 'plan.s.confirmed': '확정',
  'plan.check': '린트·검증 실행', 'plan.checking': '검사 중…', 'plan.checkFail': '검사를 실행하지 못했습니다.', 'plan.checkAll': '화면 {total}개 모두 통과', 'plan.checkSome': '화면 {total}개 중 {n}개 위반',
  'plan.indexPage': '화면 목록 페이지', 'plan.brief': '이 팩으로 화면설계 브리핑', 'plan.screens': '화면 레지스트리', 'plan.noScreens': '등록된 화면이 없습니다.',
  'plan.pass': '통과', 'plan.violations': '위반 {n}', 'plan.view': '보기', 'plan.unlinked': '요구 미연결', 'plan.noFile': '파일 없음',
  'plan.viewer': '화면설계서 {id}', 'plan.prev': '이전 화면', 'plan.next': '다음 화면', 'plan.newWindow': '새 창', 'plan.checkResult': '검사 결과',
  'plan.briefTitle': '[{name}] 화면설계 — 다음 차수', 'plan.briefResult': '2단 화면설계서(좌 화면 · 우 사양) 핵심 화면 최대 6개와 요구 원장·작업가이드·IA·리뷰·추적 매트릭스',
  'plan.briefContext': '팩: {id}\n이번 차수에 만들 화면·바뀐 요구를 적는다. 요구사항 정의서·회의록이 있으면 첨부한다.', 'plan.briefC1': '작업가이드·규칙·IA 는 재하가 승인(가이드확정)한 뒤 화면 생성',
  'plan.briefC2': '요구사항에 없는 기능은 "제안"으로 구분', 'plan.briefC3': '실기관·실인물 이름은 쓰지 않음(익명화)',
  'bc.hintEnter': 'Enter 보내기 · Shift+Enter 줄바꿈', 'bc.hintCtrlEnter': 'Ctrl+Enter 보내기', 'bc.templates': '템플릿 고르기', 'tpl.context': '맥락', 'tpl.constraints': '제약', 'tpl.moreC': '외 {n}개',
  'tpl.empty': '내 템플릿이 아직 없습니다.', 'tpl.loading': '템플릿을 불러오는 중…',
  'bc.tplSave': '템플릿으로 저장', 'bc.tplSaveTitle': '지금 양식(과제명·결과·맥락·제약)을 템플릿 탭에 저장 — 첨부 파일은 저장하지 않음', 'bc.tplSaved': '템플릿으로 저장했습니다({id}).', 'bc.tplOff': '서버 연결 시 가능',
  'bc.prefilled': '템플릿을 채웠습니다 — [대괄호] 부분을 고친 뒤 [보내기]를 누르세요.',
  'env.title': '환경 점검', 'env.cli': 'Claude Code', 'env.path': '실행 파일', 'env.login': '로그인', 'env.mode': '모드',
  'env.missing': '찾지 못함', 'env.loggedIn': '로그인됨', 'env.loggedOut': '로그인 풀림', 'env.unknown': '확인 불가',
  'env.recheck': '다시 확인', 'env.checking': '확인 중…', 'env.checkedAt': '{time} 확인', 'env.fail': '환경 정보를 불러오지 못했습니다.',
  'env.mockNote': 'mock 모드 — 지금 작업은 CLI 를 부르지 않습니다. 실제 실행(claude_code)에는 아래 두 줄이 모두 초록이어야 합니다.',
  'env.cliFix': 'Claude 데스크톱 앱이 설치돼 있는지, 최신으로 업데이트됐는지 확인하세요. 앱을 업데이트하면 내장 CLI 폴더가 바뀌지만 서버가 부를 때마다 다시 찾으므로, 설치·업데이트 뒤 [다시 확인]을 누르면 됩니다.',
  'env.loginFix': '로그인이 풀려 있어 팀장 분해·역할 실행·QA 가 "로그인 필요"로 실패합니다. [로그인]을 누르면 새 PowerShell 창에서 로그인을 진행합니다.',
  'env.unknownFix': '로그인 상태를 확인하지 못했습니다(시간 초과 등). 잠시 뒤 [다시 확인]을 누르세요.',
  'mo.autoRevise': 'QA 반려 시 1회 자동 보완', 'mo.autoReviseHint': 'QA 가 FAIL 로 반려하면 같은 담당에게 지적을 붙여 한 번만 다시 실행하고 다시 판정합니다. 작업당 상한은 그대로이며 그만큼 비용이 더 들 수 있습니다. CLI 없음·로그인 풀림·QA 오류는 보완하지 않습니다.',
  'ev.revise': '{id} {title} — QA 반려, 보완 재작업(지적 {n}건, 1회)', 'ev.template_add': '템플릿 저장 {id} {title}', 'ev.template_remove': '템플릿 삭제 {id} {title}',
  'tl.revise': '보완 재작업',
  'tl.assignText': '{msg} 받음 · 비용 상한 ${cap}{level}', 'tl.resultText': '{size}자{err}', 'tl.endText': '{status} · ${cost} · {turns}턴', 'tl.qaStart': '고지표가 판정 중', 'tl.budgetText': '상한 ${cap} 도달 — 승인 대기 {msg}',
};

const en: Dict = {
  'top.demo': 'Demo', 'top.hive': 'hive connected', 'top.noServer': 'Server not responding', 'top.concurrency': 'Parallel {r}/{l}',
  'top.pause': 'Pause', 'top.play': 'Play', 'top.pauseTitle': 'Pause or resume the office animation (work keeps running)', 'top.autoDemo': 'Auto-approve (demo)', 'top.reset': 'Reset', 'top.lang': 'Language',
  'login.title': 'Claude is signed out', 'login.body': 'In this state splitting, role runs and QA fail with "not logged in". Press [Sign in] to sign in from a new PowerShell window.',
  'login.button': 'Sign in', 'login.opening': 'Opening the sign-in window…', 'login.opened': 'A PowerShell window opened. Approve in the browser, then paste the code into that window. This banner disappears when done.', 'login.failed': "Couldn't open the sign-in window: {e}",
  'cli.missing': 'Claude Code CLI not found.', 'cli.body': 'Check that the Claude desktop app is installed and signed in. The app never falls back to a dummy run.',
  'question.title': 'The lead asked back', 'question.hint': 'Fix the result line and send it again.',
  'srv.label': 'PC server URL', 'srv.placeholder': 'https://xxxx.trycloudflare.com  (printed by start-ax-office.ps1 on the PC)', 'srv.connect': 'Connect', 'srv.disconnect': 'Disconnect',
  'srv.bad': 'Enter a server URL starting with https://', 'srv.saved': 'Connected with the URL saved in this browser. The URL changes when the tunnel restarts.', 'srv.none': 'Without a server only the demo runs. Start the server and tunnel on the PC, then enter its URL to watch real work here.',
  'legend.working': 'Working', 'legend.waiting': 'Approval · QA', 'legend.idle': 'Idle', 'legend.lead': 'Lead',
  'legend.hive': 'Envelopes = messages (assign, reply, approval) · click a desk to select', 'legend.demo': 'Demo — each gate starts with a kickoff in the meeting room', 'gates.aria': 'Pipeline gates', 'gate.approve': 'Approve',
  'office.aria': 'Pixel office where the lead and AI agents exchange messages while they work. Click a desk to select that agent.',
  'cc.title': 'COMMAND CENTER', 'cc.leadIdle': 'The lead runs the floor', 'cc.auto': 'Auto', 'cc.autoTitle': 'The lead splits each briefing and runs it automatically. Only external sends, costs, deletions, scope changes and number commitments stop for approval.',
  'cc.connected': 'hive connected', 'cc.demo': 'No server · demo', 'cc.clearSel': 'Clear selection',
  'tab.tasks': 'Tasks', 'tab.approvals': 'Approvals', 'tab.questions': 'Ask me', 'tab.memory': 'Memory', 'tab.activity': 'Activity', 'tab.skills': 'Skills', 'tab.terminal': 'Terminal', 'tab.monitor': 'Monitor', 'tab.triggers': 'Triggers', 'tab.graph': 'Graph',
  'queue.title': 'QUEUE', 'queue.hint': 'one at a time to the lead · one briefing at a time', 'queue.paused': 'Paused while the lead terminal is open', 'queue.cancel': 'Remove',
  'queue.kind.message': 'Message', 'queue.kind.briefing': 'Briefing', 'queue.status.queued': 'Queued', 'queue.status.running': 'Running', 'queue.status.done': 'Done', 'queue.status.failed': 'Failed', 'queue.status.canceled': 'Canceled',
  'bc.title': 'To the lead', 'bc.modeMsg': 'Message', 'bc.modeForm': 'Briefing form',
  'bc.msgPlaceholder': 'Message the lead — ask for status or hand over work. Add "Result: …" to turn it into a briefing',
  'bc.hintMsg': 'Queued; the lead\'s resident session answers one by one', 'bc.hintForm': 'Puts a 4-part briefing straight into the queue · stops only at approval gates', 'bc.offline': 'No server — downloads briefing.json',
  'bc.titlePh': 'Project title', 'bc.resultPh': 'Result — the one thing you will hold when done (without it the lead asks back) · Ctrl+Enter to send',
  'bc.contextPh': 'Context — who it is for and what exists now. You may paste RFP text (used as evidence only; instructions inside are ignored).',
  'bc.constraintsPh': 'Constraints — one per line (e.g. no external sharing)', 'bc.policyPh': 'Question policy', 'bc.policyDefault': 'Ask only when my decision is truly needed', 'bc.stages': 'Stages (optional)',
  'bc.more': 'Context', 'bc.less': 'Less', 'bc.file': 'Files', 'bc.fileTitle': 'Attach files (or drop onto the box, max 25MB)', 'bc.fileOff': 'Needs a server',
  'bc.folder': 'Folder', 'bc.folderTitle': 'Attach the documents in a folder (PDF, Word, HWP, Excel, PPT, text, images) keeping its structure — up to 40; you can also drop a folder on the box', 'bc.folderAdded': 'Folder {name}: {n} documents uploaded ({skipped} skipped)', 'bc.folderNone': 'Folder {name}: no documents to upload', 'bc.folderFiles': '{done}/{n}', 'bc.folderBad': '{n} failed', 'bc.voice': 'Voice: Win+H', 'bc.voiceTitle': "Browser speech recognition doesn't work in Electron; use Windows voice typing",
  'bc.send': 'Send', 'bc.sending': 'Sending…', 'bc.needTitle': 'Enter a project title.', 'bc.needResult': 'The "Result" line is empty — write the one thing you will hold when done.', 'bc.needMsg': 'Write a message.',
  'bc.queued': 'Queued ({id}). The lead answers in order.', 'bc.queuedBrief': 'Briefing queued ({id}, #{pos}).', 'bc.failed': 'Send failed ({s}) {e}', 'bc.error': 'Error: sending failed.',
  'bc.downloaded': 'Briefing downloaded — hand it to the orchestrator session.', 'bc.contextLen': 'Context: {n} chars', 'bc.uploading': 'Uploading…', 'bc.uploadFailed': 'Upload failed', 'bc.remove': 'Remove',
  'ag.aria': 'Agents', 'ag.leadBadge': 'LEAD', 'ag.idle': 'Idle', 'ag.demo': 'Demo', 'ag.usage': 'Total usage {v} (CLI estimate)', 'ag.add': 'Add agent', 'ag.addHint': 'Role templates', 'ag.full': 'Full', 'ag.custom': 'New hire',
  'tasks.title': 'Task board', 'tasks.offline': "Connect a server to see the lead's task ledger here. The demo is running now.",
  'tasks.empty': "Send a briefing and the lead's tasks appear here. Tasks without prerequisites start in parallel unless they share an owner.", 'tasks.gate': 'Gate {g}', 'tasks.needsApproval': 'Needs approval', 'tasks.cap': 'Cap {v}',
  'ap.pending': '{n} pending — only those tasks wait', 'ap.none': 'No pending approvals', 'ap.by': 'Actor', 'ap.reason': 'Reason (required — not recorded without it)', 'ap.approve': 'Approve', 'ap.reject': 'Reject',
  'ap.needReason': 'A reason is required.', 'ap.done': '{id} {d} recorded', 'ap.failed': 'Failed: {e}', 'ap.history': 'Decisions', 'ap.approved': 'Approved', 'ap.rejected': 'Rejected',
  'ap.demoNone': 'Demo: approval cards show up here.', 'ap.demoApprove': 'Approve (demo)', 'ap.budgetNote': 'Cap {cap} · spent {cost} — approve to continue with double the cap', 'ap.resumeNote': 'Circuit breaker stop — approve to assign again',
  'qs.offline': 'Connect a server to see the questions agents ask you.', 'qs.open': '{n} open questions', 'qs.none': 'No open questions — work continues on stated assumptions.',
  'qs.answerPh': 'Answer — the agent reads it on its next task (the lead gets it right away)', 'qs.send': 'Answer', 'qs.answered': 'Answered', 'qs.by': 'Answered by', 'qs.need': 'Enter an answer and who answered.', 'qs.sent': 'Answer to {id} sent.',
  'mem.offline': 'Connect a server to see each agent\'s memory (hive/memory).', 'mem.agent': 'Agent', 'mem.choose': 'Choose…', 'mem.pick': "Click an agent card below or pick one above to see that agent's memory file.",
  'mem.fail': "Couldn't read the memory file.", 'mem.empty': "No memory for {name} yet. Up to 3 lines from 'Remember' are added after each task and read at the start of the next.",
  'act.demoEmpty': 'Demo activity is recorded here.', 'act.filtered': "Showing {name}'s activity only.", 'act.all': 'Streaming the hive event log (events.log) every 3 seconds.', 'act.empty': 'No activity yet.',
  'sk.offline': 'Connect a server to see each role\'s skills and whether they exist on this PC.', 'sk.lead': 'The lead has no skills; it only splits, assigns, tracks and reports (.claude/agents/leader.md).',
  'sk.hint': 'For each task the server finds the skill guide and adds it to the agent prompt. Company skills missing on this PC fall back to public ones or are skipped.', 'sk.none': 'No skills — works from the persona only', 'sk.use': 'Uses: {n}', 'sk.missing': 'Not on this PC: {n}',
  'tm.offline': 'Connect a server for per-desk live logs and an interactive terminal.', 'tm.desk': 'Desk', 'tm.open': 'Open terminal', 'tm.close': 'Close terminal', 'tm.backLive': 'Live log', 'tm.live': 'Live log',
  'tm.noTask': 'No runs for {name} yet.', 'tm.leadLog': 'Lead resident session', 'tm.task': 'Task {id} · {title}', 'tm.ptyOff': 'Interactive terminal unavailable (node-pty missing).',
  'tm.ptyNote': 'Interactive session you type into — uses your subscription', 'tm.exited': '[session ended: {code}]', 'tm.connecting': 'Connecting…', 'tm.openFailed': "Couldn't open the terminal: {e}", 'tm.leadPause': 'While the lead terminal is open, queued messages wait.',
  'mo.offline': 'Connect a server to see usage, budgets and circuit breakers.', 'mo.title': 'Usage (CLI estimate — not a bill)', 'mo.total': 'Total', 'mo.today': 'Today', 'mo.byAgent': 'By agent today · vs daily budget', 'mo.byDay': 'By day (last 7)',
  'mo.tasks': 'Per task', 'mo.cap': 'Per-task cap ($)', 'mo.budget': 'Agent daily budget ($)', 'mo.save': 'Save', 'mo.saved': 'Saved', 'mo.level': 'Level', 'mo.reset': 'Reset', 'mo.resetReason': 'Reason for reset',
  'mo.breakerHint': '1 issue steer · 2 constrain (half turns and cap) · 3 stop · 80% of daily budget constrains · 100% stops', 'mo.stopHint': 'Stopped agents resume from the card in Approvals.', 'mo.needReason': 'Enter a reason to reset.',
  'add.title': 'Add agent — role templates', 'add.name': 'Name', 'add.nameEn': 'English name (optional)', 'add.add': 'Add', 'add.close': 'Close', 'add.limit': '{n}/{max} added — annex desk limit',
  'add.added': 'Added agents', 'add.remove': 'Remove', 'add.goal': 'Goal', 'add.stages': 'Stages', 'add.skills': 'Skills', 'add.done': '{name} added', 'add.removed': '{name} removed', 'add.offline': 'Connect a server to add agents.',
  'lv.normal': 'Normal', 'lv.steer': 'Steer', 'lv.constrain': 'Constrain', 'lv.stop': 'Stop',
  'ev.briefing': 'Briefing received — {title}', 'ev.task': '{id} {title} → {status}{gate}', 'ev.mail': '→ {to} {what}{task}', 'ev.approvalPending': 'Approval requested {id} · {task} · {kind}', 'ev.approvalDone': '{id} {d} ({task})',
  'ev.usage': '{what} usage {v}', 'ev.question': 'Question {id}{task}', 'ev.questionAnswered': '{id} answered', 'ev.queue': 'Queue {id} {kind} → {status}', 'ev.breaker': 'Circuit breaker → {level}{reason}',
  'ev.agentAdd': 'Agent added {id}', 'ev.agentRemove': 'Agent removed {id}', 'ev.leaderReply': 'Resident session replied {id}', 'ev.inboxDone': '{n} messages handled → inbox/.done',
  'tr.offline': 'Connect to the server to create triggers.', 'tr.title': 'Triggers {n}/{max}', 'tr.add': '+ Add trigger', 'tr.cancel': 'Cancel',
  'tr.note': 'Puts a briefing into the queue at a set time. Runs only while the app is on; triggers due while it was off are skipped and marked missed. The date is added to the title on each run.',
  'tr.name': 'Trigger name (= briefing title)', 'tr.namePh': 'e.g. Weekly business report', 'tr.result': 'Result', 'tr.resultPh': 'What you hold when done — e.g. a one-page weekly status (markdown)',
  'tr.context': 'Context (optional)', 'tr.contextPh': 'Background, things to refer to', 'tr.constraints': 'Constraints (optional, one per line)', 'tr.constraintsPh': 'e.g. at most 2 tasks',
  'tr.repeat': 'Repeat', 'tr.k_weekly': 'Weekly', 'tr.k_daily': 'Daily', 'tr.k_once': 'Once', 'tr.days': 'Days',
  'tr.d0': 'Sun', 'tr.d1': 'Mon', 'tr.d2': 'Tue', 'tr.d3': 'Wed', 'tr.d4': 'Thu', 'tr.d5': 'Fri', 'tr.d6': 'Sat',
  'tr.date': 'Date', 'tr.time': 'Time', 'tr.save': 'Save trigger', 'tr.added': '{id} scheduled — next run {next}', 'tr.turnedOff': '{id} off', 'tr.turnedOn': '{id} on',
  'tr.ran': '{id} run now → queue {item}', 'tr.deleted': '{id} deleted', 'tr.empty': 'No triggers yet. Schedule briefings that repeat, such as a weekly report.',
  'tr.on': 'On', 'tr.off': 'Off', 'tr.turnOn': 'Turn on', 'tr.turnOff': 'Turn off', 'tr.daily': 'Daily {time}', 'tr.onceAt': 'Once on {date} {time}', 'tr.weeklyAt': 'Every {days} {time}',
  'tr.next': 'Next', 'tr.last': 'Last run', 'tr.runs': 'Runs: {n}', 'tr.by': 'by {name}', 'tr.missed': 'Missed {at} — the app was off then, or the previous run was still queued',
  'tr.runNow': 'Run now', 'tr.confirmDel': 'Delete this trigger?', 'tr.delete': 'Delete',
  'gr.offline': 'Connect to the server to see the task graph.', 'gr.empty': 'No tasks yet. Send a briefing and the order of the tasks the lead creates is drawn here.',
  'gr.title': 'Task graph', 'gr.briefing': 'Briefing', 'gr.current': 'now', 'gr.summary': '{n} tasks · {done} done · {run} running · {wait} awaiting · {closed} on hold/failed · {cols} levels',
  'gr.after': 'After: {ids}', 'gr.legendDone': 'Prerequisite done', 'gr.legendWait': 'Prerequisite pending', 'gr.legendBroken': 'Prerequisite on hold/failed', 'gr.hint': 'Click a node to select its owner',
  'ev.trigger_add': 'Trigger added {id} {title}', 'ev.trigger_update': 'Trigger changed {id} {title}', 'ev.trigger_on': 'Trigger on {id}', 'ev.trigger_off': 'Trigger off {id}',
  'ev.trigger_delete': 'Trigger deleted {id} {title}', 'ev.trigger_run': 'Trigger ran {id} {title} → {item}', 'ev.trigger_missed': 'Trigger missed {id} {title}', 'ev.triggerWho': 'Trigger',
  'tl.start': 'start', 'tl.assign': 'assigned', 'tl.tool': 'tool', 'tl.text': 'says', 'tl.tool_result': 'result', 'tl.note': 'note', 'tl.end': 'end', 'tl.error': 'error', 'tl.qa_start': 'QA', 'tl.qa': 'QA verdict',
  'tl.approval': 'approval', 'tl.approval_done': 'decision', 'tl.budget_stop': 'cap hit', 'tl.done': 'done', 'tl.user_msg': 'Jaeha', 'tl.briefing_queued': 'briefing queued', 'tl.session_new': 'new session',
  'tab.talk': 'Talk', 'tab.templates': 'Templates',
  'talk.offline': 'Connect a server to see the messages the lead, agents and Jaeha exchange (assignments, replies, questions, approvals, reports).', 'talk.title': '{n} messages',
  'talk.all': 'Rereads the inboxes and handled mail every 4 seconds. Fenced material such as client documents is shortened.', 'talk.filtered': "Showing {name}'s messages only.",
  'talk.empty': "No messages yet. Send a briefing and the lead's assignments show up first.", 'talk.fail': "Couldn't load messages. Retrying on the next refresh.",
  'talk.more': 'Expand', 'talk.less': 'Collapse', 'talk.cut': 'first 600 chars only', 'talk.to': '→',
  'talk.type.assign': 'Assign', 'talk.type.result': 'Reply', 'talk.type.question': 'Question', 'talk.type.answer': 'Answer', 'talk.type.approval': 'Approval', 'talk.type.report': 'Report',
  'tpl.offline': 'Connect a server to use and save briefing templates.', 'tpl.title': 'Briefing templates · mine {n}/{max}',
  'tpl.note': 'Press [Use this template] to switch the input box to the briefing form and fill in title, result, context and constraints. Edit the [brackets], then press Send yourself. Save the form you are writing with [Save as template] in the input box.',
  'tpl.builtin': 'Built-in', 'tpl.mine': 'Mine', 'tpl.use': 'Use this template', 'tpl.used': 'Filled the input box: {title} — check it, then press Send.',
  'tpl.delete': 'Delete', 'tpl.confirmDel': 'Delete this template?', 'tpl.cancel': 'Cancel', 'tpl.deleted': 'Deleted: {title}', 'tpl.result': 'Result', 'tpl.steps': 'Steps — the server splits the work in this order',
  'set.title': 'Settings', 'set.close': 'Close', 'set.offline': 'Connect to the PC server to change storage, cost and behavior. Only the language can change now.', 'set.loadFail': 'Could not load settings.',
  'set.storage': 'Deliverables folder', 'set.current': 'Current', 'set.default': 'Default', 'set.openFolder': 'Open folder', 'set.reset': 'Use default',
  'set.newDir': 'New location', 'set.dirPh': 'e.g. D:\\Proposals\\Output', 'set.pick': 'Choose folder', 'set.copy': 'Also copy existing deliverables (no overwrite; the old folder is left as is)',
  'set.apply': 'Use this folder', 'set.running': 'A briefing is running — change it after it finishes.',
  'set.storageNote': 'Agents work inside this folder. Each project gets a subfolder with .md and .docx files. Without copying, past deliverables stay in the old folder and won\'t open from the Tasks tab.',
  'set.changed': 'Deliverables folder changed: {dir}', 'set.changedCopy': 'Folder changed and existing deliverables copied: {dir}',
  'set.cost': 'Cost limits', 'set.cap': 'Per-task cap ($)', 'set.daily': 'Daily budget per agent ($)', 'set.save': 'Save', 'set.saved': 'Saved',
  'set.costNote': 'Over the cap, the task stops and asks for approval. The daily budget limits at 80% and stops at 100%.',
  'set.behavior': 'Behavior', 'set.autoRevise': 'Auto-revise once after a QA fail', 'set.concurrency': 'Tasks running at once',
  'set.concurrencyNote': 'Applies from the next briefing. One person never runs two tasks at once.',
  'set.lang': 'Language', 'set.env': 'Environment', 'set.data': 'Work records (hive)', 'set.dataNote': 'Approvals, messages and memory are stored here. It cannot be moved from this screen.',
  'tasks.open': 'Open', 'tasks.word': 'Word', 'tasks.folder': 'Folder', 'tasks.openFail': 'Could not open — {e}',
  'tasks.progress': '{d}/{n} done', 'tasks.cost': 'Spent {v}', 'tab.more': 'More', 'tab.plan': 'Planning',
  'set.kit': 'Planning-agent package', 'set.kitOk': 'Connected', 'set.kitNone': 'Not connected', 'set.kitDisable': 'Turn off', 'set.kitApply': 'Connect', 'set.kitPh': 'e.g. D:\\Planning\\wylie-plan-agent',
  'set.kitOn': 'Planning-agent package connected', 'set.kitOff': 'Planning-agent package turned off',
  'set.kitNote': 'The folder with the screen spec (SKILL), lint, verify, golden screens and pack template. Once connected, screen-spec briefings follow the standard planning process and the Planning tab shows packs and screens. The package stays on this PC and is not committed.',
  'plan.title': 'Planning — project packs', 'plan.offline': 'Connect the server to see the planning agent\'s packs and screen specs.', 'plan.noKit': 'The planning-agent package is not connected',
  'plan.noKitHint': 'Set the package folder (with scripts, packs and core) in Settings and screen-spec briefings will follow the standard planning process.', 'plan.openSettings': 'Open settings',
  'plan.packCount': '{n} packs', 'plan.flow': 'Screen-spec briefing → ① requirements ledger → ② work guide · IA (approval) → ③ two-pane specs (server scaffolds; lint/verify gate) → ④ review → ⑤ trace · three-key handoff (approval)',
  'plan.noPacks': 'No packs yet. Send a screen-spec briefing to create one.', 'plan.layers': 'Five SSOT layers',
  'plan.l.rules': 'Rules', 'plan.l.ia': 'IA', 'plan.l.guide': 'Work guide', 'plan.l.readme': 'README', 'plan.l.template': 'Template',
  'plan.s.none': 'none', 'plan.s.draft': 'draft', 'plan.s.confirmed': 'confirmed',
  'plan.check': 'Run lint · verify', 'plan.checking': 'Checking…', 'plan.checkFail': 'Could not run the checks.', 'plan.checkAll': 'All {total} screens pass', 'plan.checkSome': '{n} of {total} screens have violations',
  'plan.indexPage': 'Screen index page', 'plan.brief': 'Screen-spec briefing for this pack', 'plan.screens': 'Screen registry', 'plan.noScreens': 'No screens registered.',
  'plan.pass': 'Pass', 'plan.violations': '{n} violations', 'plan.view': 'View', 'plan.unlinked': 'No requirement', 'plan.noFile': 'No file',
  'plan.viewer': 'Screen spec {id}', 'plan.prev': 'Previous screen', 'plan.next': 'Next screen', 'plan.newWindow': 'New window', 'plan.checkResult': 'Check results',
  'plan.briefTitle': '[{name}] screen spec — next round', 'plan.briefResult': 'Two-pane screen specs (left screen · right spec) for up to six key screens, plus requirements ledger, work guide, IA, review and trace matrix',
  'plan.briefContext': 'Pack: {id}\nList the screens for this round and any changed requirements. Attach the requirements spec or meeting notes if you have them.', 'plan.briefC1': 'Screens are generated only after Jaeha approves the work guide, rules and IA',
  'plan.briefC2': 'Mark features not in the requirements as "proposal"', 'plan.briefC3': 'No real organization or person names (anonymized)',
  'bc.hintEnter': 'Enter to send · Shift+Enter for a new line', 'bc.hintCtrlEnter': 'Ctrl+Enter to send', 'bc.templates': 'Pick a template', 'tpl.context': 'Context', 'tpl.constraints': 'Constraints', 'tpl.moreC': '+{n} more',
  'tpl.empty': 'No templates of your own yet.', 'tpl.loading': 'Loading templates…',
  'bc.tplSave': 'Save as template', 'bc.tplSaveTitle': 'Save this form (title, result, context, constraints) to the Templates tab — attachments are not saved', 'bc.tplSaved': 'Saved as a template ({id}).', 'bc.tplOff': 'Needs a server',
  'bc.prefilled': 'Template filled in — edit the [brackets], then press Send.',
  'env.title': 'Environment check', 'env.cli': 'Claude Code', 'env.path': 'Executable', 'env.login': 'Sign-in', 'env.mode': 'Mode',
  'env.missing': 'Not found', 'env.loggedIn': 'Signed in', 'env.loggedOut': 'Signed out', 'env.unknown': 'Unknown',
  'env.recheck': 'Check again', 'env.checking': 'Checking…', 'env.checkedAt': 'checked {time}', 'env.fail': "Couldn't load the environment status.",
  'env.mockNote': 'Mock mode — work does not call the CLI now. Real runs (claude_code) need both lines below to be green.',
  'env.cliFix': 'Check that the Claude desktop app is installed and up to date. Updating the app moves its bundled CLI folder, but the server looks it up on every call — press [Check again] after installing or updating.',
  'env.loginFix': 'You are signed out, so splitting, role runs and QA fail with "not logged in". Press [Sign in] to sign in from a new PowerShell window.',
  'env.unknownFix': "Couldn't determine the sign-in state (timeout or similar). Press [Check again] in a moment.",
  'mo.autoRevise': 'Auto-revise once when QA rejects', 'mo.autoReviseHint': 'When QA returns FAIL, the same owner gets the findings and runs once more, then QA judges again. The per-task cap stays the same, so it can cost up to one more run. CLI missing, signed out or QA errors are not revised.',
  'ev.revise': '{id} {title} — QA rejected, revising ({n} findings, once)', 'ev.template_add': 'Template saved {id} {title}', 'ev.template_remove': 'Template deleted {id} {title}',
  'tl.revise': 'revise',
  'tl.assignText': '{msg} received · cost cap ${cap}{level}', 'tl.resultText': '{size} chars{err}', 'tl.endText': '{status} · ${cost} · {turns} turns', 'tl.qaStart': 'Go Jipyo is reviewing', 'tl.budgetText': 'Cap ${cap} reached — awaiting approval {msg}',
};

const DICTS: Record<Lang, Dict> = { ko, en };

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(lang: Lang): TFn {
  const d = DICTS[lang] ?? ko;
  return (key, vars) => {
    let s = d[key] ?? ko[key] ?? key;
    if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };
}

const STATUS_EN: Record<string, string> = { '대기': 'Waiting', '진행': 'Working', '검수': 'In QA', '승인대기': 'Awaiting', '완료': 'Done', '보류': 'On hold', '실패': 'Failed' };
const GATE_EN: Record<string, string> = { '미점검': 'Unchecked' };
const KIND_EN: Record<string, string> = { '외부발송': 'External send', '비용': 'Cost', '삭제': 'Deletion', '범위변경': 'Scope change', '수치확정': 'Number commit', '산출물승인': 'Deliverable', '재개': 'Resume', '승인 필요': 'Approval' };

export const statusLabel = (lang: Lang, s: string): string => (lang === 'en' ? STATUS_EN[s] ?? s : s);
export const gateLabel = (lang: Lang, g: string): string => (lang === 'en' ? GATE_EN[g] ?? g : g);
export const kindLabel = (lang: Lang, k: string): string => (lang === 'en' ? KIND_EN[k] ?? k : k);

/** 서킷 브레이커 사유 — 한국어는 서버 문장 그대로, 영어는 사유 코드로 풀어 쓴다(세부 내용은 원문 유지). */
const BREAKER_EN: Record<string, string> = { cap: 'Cost cap exceeded', qa_fail: 'QA FAIL', fail: 'Run failed', budget: 'Daily budget used', reset: 'Resumed by' };
export function breakerReason(lang: Lang, b: { reason?: string; reason_code?: string; reason_detail?: string } | null | undefined): string {
  if (!b) return '';
  if (lang !== 'en' || !b.reason_code || !BREAKER_EN[b.reason_code]) return b.reason ?? '';
  return `${BREAKER_EN[b.reason_code]}${b.reason_detail ? ` — ${b.reason_detail}` : ''}`;
}

/** 표시 이름 — 기본 12인·팀장·재하는 표, 추가 인원은 명단 API 의 name/name_en. */
export function displayName(lang: Lang, id: string | undefined, roster?: { id: string; name: string; name_en?: string }[] | null): string {
  if (!id) return '';
  const fixed = SIM_TEXT[lang].names[id];
  if (fixed) return fixed;
  const m = roster?.find((x) => x.id === id);
  if (m) return lang === 'en' ? m.name_en || m.name : m.name;
  return id;
}

export interface OfficeLang {
  lang: Lang;
  t: TFn;
  name: (id: string | undefined) => string;
}

export const OfficeLangContext = createContext<OfficeLang>({ lang: 'ko', t: makeT('ko'), name: (id) => displayName('ko', id) });

export function useOfficeLang(): OfficeLang {
  return useContext(OfficeLangContext);
}
