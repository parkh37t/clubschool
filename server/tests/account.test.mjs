// 앱 안 로그인 — CLI 출력 해석과 코드 형식 검사(모델·CLI 호출 없음). npm run test:server
import test from 'node:test';
import assert from 'node:assert/strict';
import { plainText, extractLoginUrl, validLoginCode } from '../account.mjs';

const URL = 'https://claude.com/cai/oauth/authorize?code=true&client_id=x&response_type=code&state=abc';

test('ConPTY 커서 이동(ESC[nC)은 공백으로, 색·제목 같은 제어 문자는 지운다', () => {
  const raw = '\x1b]0;claude\x07\x1b[?25lPaste\x1b[1Ccode\x1b[1Chere\x1b[2Cif prompted >\x1b[0m\r\n';
  assert.equal(plainText(raw), 'Paste code here  if prompted >\n');
});

test('밑줄 색이 섞인 주소를 그대로 꺼낸다', () => {
  const raw = `Opening browser…\r\nIf the browser didn't open, visit: \x1b[4m${URL}\x1b[24m\r\nPaste code here if prompted > `;
  assert.equal(extractLoginUrl(raw), URL);
});

test('OSC 8 하이퍼링크 안의 주소도 꺼낸다', () => {
  const raw = `visit: \x1b]8;;${URL}\x07click here\x1b]8;;\x07\r\n`;
  assert.equal(extractLoginUrl(raw), URL);
});

test('주소가 없으면 빈 문자열', () => {
  assert.equal(extractLoginUrl('Opening browser to sign in…'), '');
});

test('인증 코드는 토큰 형식만 받는다(공백·셸 문자·줄바꿈 거절)', () => {
  assert.equal(validLoginCode('AbC-123_xyz#state.part~9'), true);
  assert.equal(validLoginCode('short'), false);
  assert.equal(validLoginCode('abc def; rm -rf'), false);
  assert.equal(validLoginCode('abcdefgh\r\nexit'), false);
  assert.equal(validLoginCode('$(calc)abcdefgh'), false);
});
