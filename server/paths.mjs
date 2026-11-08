// 경로 단일 원천 — 코드(읽기 전용일 수 있음)와 데이터(쓰기 필요)의 위치를 나눈다.
//
//   APP_ROOT          server/ 의 상위. 개발 시 저장소 루트, 설치형 앱에서는 resources 폴더.
//                     .claude/agents·.claude/skills·dist/ 를 여기서 읽는다(쓰지 않는다).
//   HIVE_DIR          작업 원장·메일함·기억·이벤트. OFFICE_HIVE_DIR (기본 server/hive)
//   DELIVERABLES_DIR  과제 산출물·첨부. OFFICE_DELIVERABLES_DIR (기본 <APP_ROOT>/DELIVERABLES)
//   DIST_DIR          빌드된 화면. OFFICE_DIST_DIR (기본 <APP_ROOT>/dist)
//
// 설치 폴더(Program Files·AppData\Local\Programs)는 쓰기 권한이 없거나 업데이트 때 지워지므로,
// 설치형 앱은 문서\Wylie AX Office\hive · 산출물 을 환경 변수로 넘긴다(desktop/main.cjs).
//
// tasks.json 등에 남기는 산출물 경로는 DELIVERABLES_DIR 기준 상대경로(구분자 '/')다.
// 역할 에이전트도 DELIVERABLES_DIR 를 작업 폴더(cwd)로 돌기 때문에 같은 경로로 읽고 쓴다.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_DIR = HERE;
export const APP_ROOT = path.resolve(HERE, '..');
export const AGENTS_DIR = path.join(APP_ROOT, '.claude', 'agents');
export const SKILLS_DIR = path.join(APP_ROOT, '.claude', 'skills');

const fromEnv = (name, fallback) => (process.env[name] ? path.resolve(process.env[name]) : fallback);

export const HIVE_DIR = fromEnv('OFFICE_HIVE_DIR', path.join(HERE, 'hive'));
export const DELIVERABLES_DIR = fromEnv('OFFICE_DELIVERABLES_DIR', path.join(APP_ROOT, 'DELIVERABLES'));
export const DIST_DIR = fromEnv('OFFICE_DIST_DIR', path.join(APP_ROOT, 'dist'));
// office-state.json 은 hive 요약본. 기본 위치(server/)를 유지하되, hive 를 옮기면 hive 옆으로 함께 옮긴다.
export const STATE_FILE = fromEnv('OFFICE_STATE_FILE', process.env.OFFICE_HIVE_DIR ? path.join(HIVE_DIR, 'office-state.json') : path.join(HERE, 'office-state.json'));
export const INBOX_DIR = path.join(DELIVERABLES_DIR, '_inbox'); // 첨부 임시함(과제 실행 시 과제 폴더로 복사)

/** 산출물 폴더 기준 상대경로('/' 구분). 화면·원장·에이전트 지시문이 모두 이 형식을 쓴다. */
export function relData(abs) {
  return path.relative(DELIVERABLES_DIR, abs).split(path.sep).join('/');
}

/** relData 의 역. 산출물 폴더 밖을 가리키면 null(경로 조작 차단). */
export function absData(rel) {
  const abs = path.resolve(DELIVERABLES_DIR, String(rel || ''));
  const back = path.relative(DELIVERABLES_DIR, abs);
  if (!back || back.startsWith('..') || path.isAbsolute(back)) return null;
  return abs;
}

/** child 가 parent 안에 있는지(같은 경로는 아님). */
export function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}
