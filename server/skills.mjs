// 게이트 작업에 붙일 스킬(업무 지침서)을 찾아 읽는다.
// 찾는 순서: ① 저장소 .claude/skills/<이름>  ② ~/.claude/skills/<이름>  ③ ~/.claude/skills/synced/*/<이름>
// 사내 스킬(wylie-*, ba-agent, proposal-maker)은 공개 저장소에 올리지 않는다(.gitignore).
// 각 PC의 .claude/skills 에 직접 두거나, Claude 계정 동기화 폴더(③)에 있으면 자동으로 쓴다.
// 스펙 'a|b' 는 "a가 있으면 a, 없으면 b" — 사내 스킬이 없는 PC에서는 공용 스킬로 대체된다.

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SKILLS_DIR } from './paths.mjs';

const REPO_SKILLS = SKILLS_DIR; // 저장소(설치형 앱은 resources)의 .claude/skills
const USER_SKILLS = path.join(os.homedir(), '.claude', 'skills');

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findSkillDir(name) {
  const candidates = [path.join(REPO_SKILLS, name), path.join(USER_SKILLS, name)];
  try {
    const synced = path.join(USER_SKILLS, 'synced');
    for (const d of await fs.readdir(synced)) candidates.push(path.join(synced, d, name));
  } catch {
    // 동기화 폴더가 없으면 건너뜀
  }
  for (const dir of candidates) {
    if (await exists(path.join(dir, 'SKILL.md'))) return dir;
  }
  return null;
}

// 여러 고객에 두루 쓰는 제안 스킬 — 단계별 스펙에 이미 들어 있으므로 '고객사 전용'으로 다시 붙이지 않는다.
const SHARED_PROPOSAL_SKILLS = new Set(['wylie-proposal', 'proposal-writing', 'proposal-review', 'proposal-maker', 'proposal-skills', 'strategy-proposal-analyzer']);

/**
 * 고객사 전용 제안 스킬 — 사용자 스킬 폴더(②·③)의 '<고객>-…-proposal' 가운데 브리핑에 그 고객사가 나오는 것.
 * 고객사 이름은 폴더 이름의 첫 토큰(영문)이나 설명의 첫 단어(한글이면 앞 3글자까지)로 맞춘다.
 * 저장소(①)는 보지 않는다 — 고객사 스킬은 공개 저장소에 두지 않는다.
 * @returns 스킬 이름 목록(없으면 빈 배열)
 */
export async function findClientProposalSkills(text) {
  const hay = String(text || '').toLowerCase();
  const roots = [USER_SKILLS];
  try {
    for (const d of await fs.readdir(path.join(USER_SKILLS, 'synced'))) roots.push(path.join(USER_SKILLS, 'synced', d));
  } catch {
    // 동기화 폴더가 없으면 건너뜀
  }
  const found = new Set();
  for (const root of roots) {
    let names = [];
    try {
      names = await fs.readdir(root);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/-proposal$/i.test(name) || SHARED_PROPOSAL_SKILLS.has(name) || found.has(name)) continue;
      let raw = '';
      try {
        raw = await fs.readFile(path.join(root, name, 'SKILL.md'), 'utf8');
      } catch {
        continue;
      }
      const desc = (/^description:\s*["']?(.+?)["']?\s*$/m.exec(raw)?.[1] || '').trim();
      const first = desc.split(/[\s,·()"'「」]/)[0] || '';
      const keys = [name.split('-')[0], first];
      if (/[가-힣]/.test(first) && first.length > 3) keys.push(first.slice(0, 3));
      if (keys.some((k) => k && k.length >= 2 && hay.includes(k.toLowerCase()))) found.add(name);
    }
  }
  return [...found];
}

/** 해당 이름의 스킬이 이 PC에서 쓸 수 있는지. */
export async function hasSkill(name) {
  return (await findSkillDir(name)) !== null;
}

/**
 * 스펙 목록을 실제 지침으로 바꾼다.
 * @param specs ['rfp-analysis', 'wylie-proposal|proposal-writing']
 * @returns { applied: [{ name, body, refs }], missing: ['원래 스펙'] }   refs = 참고자료 폴더 절대경로(없으면 null)
 */
export async function resolveSkills(specs) {
  const applied = [];
  const missing = [];
  for (const spec of specs || []) {
    let dir = null;
    let name = null;
    for (const alt of String(spec).split('|')) {
      dir = await findSkillDir(alt);
      if (dir) {
        name = alt;
        break;
      }
    }
    if (!dir) {
      missing.push(spec);
      continue;
    }
    const raw = await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8');
    const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim(); // 프론트매터 제거
    // 참고자료(references/)는 절대경로로 알려 주고, 실행기가 그 폴더를 --add-dir 로 열어 준다.
    // 에이전트의 작업 폴더(산출물 폴더)와 스킬 폴더가 다른 위치에 있기 때문이다.
    const refDir = path.join(dir, 'references');
    const refs = (await exists(refDir)) ? refDir : null;
    applied.push({ name, body, refs });
  }
  return { applied, missing };
}
