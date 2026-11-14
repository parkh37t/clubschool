// 게이트 작업에 붙일 스킬(업무 지침서)을 찾아 읽는다.
// 찾는 순서: ① 저장소 .claude/skills/<이름>  ② ~/.claude/skills/<이름>  ③ ~/.claude/skills/synced/*/<이름>
//           ④ 기획 에이전트 패키지(설정 plan_kit_dir)의 .claude/skills/<이름>
//           ⑤ 계정 동기화 플러그인 ~/.claude/plugins/synced/*/<플러그인>[~gN]/skills/<이름> — 플러그인마다 최신 세대만
// '플러그인:스킬' 이름(예: clubschool:rfp-evaluation)은 그 플러그인에서만 찾는다.
// 사내 스킬(wylie-*, ba-agent, proposal-maker)은 공개 저장소에 올리지 않는다(.gitignore).
// 각 PC의 .claude/skills 에 직접 두거나, Claude 계정 동기화 폴더(③)에 있으면 자동으로 쓴다.
// 스펙 'a|b' 는 "a가 있으면 a, 없으면 b" — 사내 스킬이 없는 PC에서는 공용 스킬로 대체된다.
// 문서·제안 스킬 등록부(skillRegistry.mjs)가 본문을 넣을지(inline), 경로만 알려 줄지(참고 스킬)를 정한다.

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SKILLS_DIR } from './paths.mjs';
import { getSettings } from './settings.mjs';
import { registryEntry } from './skillRegistry.mjs';

const REPO_SKILLS = SKILLS_DIR; // 저장소(설치형 앱은 resources)의 .claude/skills
const USER_SKILLS = path.join(os.homedir(), '.claude', 'skills');
const PLUGINS_SYNCED = path.join(os.homedir(), '.claude', 'plugins', 'synced');
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,80}$/i;

// 계정 동기화 플러그인 — 같은 플러그인이 세대별 폴더(<이름>, <이름>~g2 …)로 남으므로 가장 높은 세대만 본다. 1분 캐시.
let pluginCache = { at: 0, list: [] };
async function pluginRoots() {
  if (Date.now() - pluginCache.at < 60000) return pluginCache.list;
  const best = new Map();
  let accounts = [];
  try { accounts = await fs.readdir(PLUGINS_SYNCED); } catch { /* 플러그인 폴더 없음 */ }
  for (const acct of accounts) {
    const base = path.join(PLUGINS_SYNCED, acct);
    let names = [];
    try { names = await fs.readdir(base); } catch { continue; }
    for (const n of names) {
      const m = /^([a-z0-9][a-z0-9._-]*?)(?:~g(\d+))?$/i.exec(n);
      if (!m || n.endsWith('.json')) continue;
      const gen = Number(m[2] || 0);
      const cur = best.get(m[1]);
      if (!cur || gen > cur.gen) best.set(m[1], { plugin: m[1], gen, dir: path.join(base, n) });
    }
  }
  pluginCache = { at: Date.now(), list: [...best.values()] };
  return pluginCache.list;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** 이름 → { dir, source } 또는 null. source: repo | user | synced | kit | plugin */
async function locateSkill(name) {
  const scoped = /^([^:]+):([^:]+)$/.exec(String(name || ''));
  if (scoped) {
    if (!SAFE_NAME.test(scoped[1]) || !SAFE_NAME.test(scoped[2])) return null;
    for (const r of await pluginRoots()) {
      if (r.plugin !== scoped[1]) continue;
      const dir = path.join(r.dir, 'skills', scoped[2]);
      if (await exists(path.join(dir, 'SKILL.md'))) return { dir, source: 'plugin' };
    }
    return null;
  }
  if (!SAFE_NAME.test(String(name || ''))) return null;
  const candidates = [{ dir: path.join(REPO_SKILLS, name), source: 'repo' }, { dir: path.join(USER_SKILLS, name), source: 'user' }];
  try {
    const synced = path.join(USER_SKILLS, 'synced');
    for (const d of await fs.readdir(synced)) candidates.push({ dir: path.join(synced, d, name), source: 'synced' });
  } catch {
    // 동기화 폴더가 없으면 건너뜀
  }
  const kit = String((await getSettings()).plan_kit_dir || '').trim();
  if (kit && path.isAbsolute(kit)) candidates.push({ dir: path.join(kit, '.claude', 'skills', name), source: 'kit' });
  for (const r of await pluginRoots()) candidates.push({ dir: path.join(r.dir, 'skills', name), source: 'plugin' });
  for (const c of candidates) {
    if (await exists(path.join(c.dir, 'SKILL.md'))) return c;
  }
  return null;
}

async function findSkillDir(name) {
  return (await locateSkill(name))?.dir || null;
}

/** 스펙('a|b') 하나 → 쓸 수 있는 첫 이름과 위치. 화면(등록부·스킬 탭)이 쓴다. */
export async function locateSpec(spec) {
  for (const alt of String(spec).split('|')) {
    const hit = await locateSkill(alt);
    if (hit) return { name: alt, ...hit };
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
 * 문서·제안 스킬 등록부 + 이 PC 에서 찾은 위치. 화면(스킬 탭)과 팀장 분해(골라 붙일 수 있는 스킬)가 쓴다.
 * 고객사 전용 제안 스킬은 이름을 코드에 두지 않으므로 사용자 스킬 폴더에서 찾아 따로 돌려준다(client).
 * @returns {Promise<{ entries: Array<object>, client: Array<{name, source}> }>}
 */
let registryCache = { at: 0, data: null };
export async function registryStatus() {
  if (registryCache.data && Date.now() - registryCache.at < 60000) return registryCache.data;
  const { SKILL_REGISTRY } = await import('./skillRegistry.mjs');
  const entries = [];
  for (const e of SKILL_REGISTRY) {
    const hit = await locateSpec(e.name);
    entries.push({
      spec: e.name, name: hit?.name || null, available: Boolean(hit), source: hit?.source || null,
      cat: e.cat, inline: e.inline !== false, exec: Boolean(e.exec), usable: e.usable !== false, auto: Boolean(e.auto), agents: e.agents,
      ko: e.ko, en: e.en, use_ko: e.useKo, use_en: e.useEn, note_ko: e.noteKo || '', note_en: e.noteEn || '', why_ko: e.whyKo || '', why_en: e.whyEn || '',
    });
  }
  // 고객사 전용 제안 스킬 — 사용자 스킬 폴더의 '<고객>-…-proposal'(브리핑에 그 고객사가 나오면 제안 문서 단계에 붙는다)
  const client = [];
  const roots = [{ dir: USER_SKILLS, source: 'user' }];
  try { for (const d of await fs.readdir(path.join(USER_SKILLS, 'synced'))) roots.push({ dir: path.join(USER_SKILLS, 'synced', d), source: 'synced' }); } catch { /* 없음 */ }
  for (const r of roots) {
    let names = [];
    try { names = await fs.readdir(r.dir); } catch { continue; }
    for (const n of names) {
      if (!/-proposal$/i.test(n) || SHARED_PROPOSAL_SKILLS.has(n) || client.some((c) => c.name === n)) continue;
      if (await exists(path.join(r.dir, n, 'SKILL.md'))) client.push({ name: n, source: r.source });
    }
  }
  registryCache = { at: Date.now(), data: { entries, client } };
  return registryCache.data;
}

/** SKILL.md 프론트매터의 description 한 줄(없으면 빈 문자열). 여러 줄(>) 형식은 다음 줄들을 이어 붙인다. */
export function skillDescription(raw) {
  const fm = /^---\s*\n([\s\S]*?)\n---/.exec(raw)?.[1] || '';
  const m = /^description:\s*(.*)$/m.exec(fm);
  if (!m) return '';
  let d = m[1].trim();
  if (/^[>|][-+]?$/.test(d)) {
    const after = fm.slice(fm.indexOf(m[0]) + m[0].length).split('\n');
    d = after.filter((l) => /^\s+\S/.test(l)).map((l) => l.trim()).join(' ');
  }
  return d.replace(/^['"]|['"]$/g, '').trim();
}

/**
 * 스펙 목록을 실제 지침으로 바꾼다.
 * @param specs ['rfp-analysis', 'wylie-proposal|proposal-writing', 'clubschool:rfp-evaluation']
 * @returns { applied: [{ name, body, refs, dir, inline, desc, note }], missing: ['원래 스펙'] }
 *   refs = 참고자료 폴더 절대경로(없으면 null). inline=false 면 본문 대신 '참고 스킬'(경로·설명)로 알리고 dir 를 열어 준다.
 */
export async function resolveSkills(specs) {
  const applied = [];
  const missing = [];
  const seen = new Set();
  for (const spec of specs || []) {
    const hit = await locateSpec(spec);
    if (!hit) {
      missing.push(spec);
      continue;
    }
    if (seen.has(hit.name)) continue;
    seen.add(hit.name);
    const { name, dir } = hit;
    const raw = await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8');
    const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim(); // 프론트매터 제거
    // 참고자료(references/)는 절대경로로 알려 주고, 실행기가 그 폴더를 --add-dir 로 열어 준다.
    // 에이전트의 작업 폴더(산출물 폴더)와 스킬 폴더가 다른 위치에 있기 때문이다.
    const refDir = path.join(dir, 'references');
    const refs = (await exists(refDir)) ? refDir : null;
    const entry = registryEntry(name) || registryEntry(spec);
    applied.push({ name, body, refs, dir, inline: entry ? entry.inline !== false : true, desc: skillDescription(raw).slice(0, 300), note: entry?.noteKo || '' });
  }
  return { applied, missing };
}
