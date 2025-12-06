import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// GitHub Pages 배포를 위한 base path 설정
const repoName = 'clubschool' // 실제 저장소 이름으로 고정

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages 배포 시 base path 설정
  base: `/${repoName}/`,
  
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/data': path.resolve(__dirname, './src/data'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/styles': path.resolve(__dirname, './src/styles'),
    },
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  
  preview: {
    port: 4173,
    open: true,
    host: true,
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'recharts'],
  },
  
  // GitHub Pages 환경에서 에셋 경로 최적화
  define: {
    __IS_GITHUB_PAGES__: true,
    __BASE_URL__: JSON.stringify(`/${repoName}/`),
  },
})