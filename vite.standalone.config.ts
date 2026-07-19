import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 오피스+지시 콘솔을 단일 자체완결 HTML로 인라인 빌드(모든 JS/CSS 임베드).
// 정적 호스트(GitHub Pages/Vercel/S3/사내 서버 등) 어디에 올려도 그대로 동작.
export default defineConfig({
  root: 'standalone',
  plugins: [react(), viteSingleFile()],
  build: { outDir: '../dist-standalone', emptyOutDir: true, assetsInlineLimit: 100000000 },
});
