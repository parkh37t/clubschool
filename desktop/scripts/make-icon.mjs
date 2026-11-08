// 앱·트레이 아이콘(PNG) 생성 — 외부 이미지 도구 없이 zlib 로 직접 인코딩한다.
// 가상 사무실 헤더의 보라 사각 마크(#6A4C9C)를 픽셀 'W' 로 키운 모양. 결과물은 저장소에 커밋해 두고,
// 모양을 바꿀 때만 다시 돌린다:  node desktop/scripts/make-icon.mjs
//
//   desktop/build/icon.png   256×256  설치 파일·exe 아이콘(electron-builder 가 ico 로 변환)
//   desktop/assets/icon.png  256×256  창 아이콘
//   desktop/assets/tray.png   32×32   트레이 아이콘

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP = path.resolve(HERE, '..');

// 16×16 픽셀 도안. # = 진한 보라 테두리, W = 흰 글자, . = 보라 바탕, s = 그림자
const ART = [
  '################',
  '#..............#',
  '#..............#',
  '#.W..........W.#',
  '#.W..........W.#',
  '#.W....WW....W.#',
  '#.W....WW....W.#',
  '#.W...W..W...W.#',
  '#.W...W..W...W.#',
  '#.W..W....W..W.#',
  '#..WW......WW..#',
  '#..WW......WW..#',
  '#..............#',
  '#ssssssssssssss#',
  '#ssssssssssssss#',
  '################',
];
const COLOR = { '#': [0x43, 0x30, 0x6b, 255], '.': [0x6a, 0x4c, 0x9c, 255], W: [0xff, 0xff, 0xff, 255], s: [0x55, 0x3d, 0x7f, 255] };

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const scale = size / 16;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // 필터 없음
    for (let x = 0; x < size; x++) {
      const ch = ART[Math.floor(y / scale)][Math.floor(x / scale)];
      const [r, g, b, a] = COLOR[ch];
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = [
  [path.join(DESKTOP, 'build', 'icon.png'), 256],
  [path.join(DESKTOP, 'assets', 'icon.png'), 256],
  [path.join(DESKTOP, 'assets', 'tray.png'), 32],
];
for (const [file, size] of out) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, png(size));
  console.log(`${path.relative(DESKTOP, file)} (${size}×${size})`);
}
