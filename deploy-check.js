#!/usr/bin/env node

/**
 * 🚀 배포 준비 상태 확인 스크립트
 * GitHub Pages 배포 전 모든 설정이 올바른지 확인합니다.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔍 GitHub Pages 배포 준비 상태 확인 중...\n');

const checks = [
  {
    name: '📦 package.json 확인',
    check: () => {
      const packagePath = join(__dirname, 'package.json');
      if (!existsSync(packagePath)) return { success: false, message: 'package.json을 찾을 수 없습니다.' };
      
      const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
      const expectedRepo = 'https://github.com/parkh37t/clubschool.git';
      const expectedHomepage = 'https://parkh37t.github.io/clubschool';
      
      if (pkg.repository?.url !== expectedRepo) {
        return { success: false, message: `Repository URL이 잘못되었습니다: ${pkg.repository?.url}` };
      }
      
      if (pkg.homepage !== expectedHomepage) {
        return { success: false, message: `Homepage URL이 잘못되었습니다: ${pkg.homepage}` };
      }
      
      return { success: true, message: '저장소 정보가 올바르게 설정되었습니다.' };
    }
  },
  {
    name: '⚙️ vite.config.ts 확인',
    check: () => {
      const vitePath = join(__dirname, 'vite.config.ts');
      if (!existsSync(vitePath)) return { success: false, message: 'vite.config.ts를 찾을 수 없습니다.' };
      
      const viteContent = readFileSync(vitePath, 'utf8');
      if (!viteContent.includes("repoName = 'clubschool'")) {
        return { success: false, message: 'Vite 설정에서 저장소 이름이 올바르지 않습니다.' };
      }
      
      return { success: true, message: 'Vite 설정이 올바르게 구성되었습니다.' };
    }
  },
  {
    name: '🤖 GitHub Actions 워크플로우 확인',
    check: () => {
      const workflowPath = join(__dirname, '.github/workflows/deploy.yml');
      if (!existsSync(workflowPath)) {
        return { success: false, message: 'GitHub Actions 워크플로우 파일이 없습니다.' };
      }
      
      const workflowContent = readFileSync(workflowPath, 'utf8');
      if (!workflowContent.includes('Deploy to GitHub Pages')) {
        return { success: false, message: '워크플로우 설정이 올바르지 않습니다.' };
      }
      
      return { success: true, message: 'GitHub Actions 워크플로우가 준비되었습니다.' };
    }
  },
  {
    name: '📄 진입점 파일 확인',
    check: () => {
      const appPath = join(__dirname, 'App.tsx');
      const mainPath = join(__dirname, 'main.tsx');
      const indexPath = join(__dirname, 'index.html');
      
      if (!existsSync(appPath)) return { success: false, message: 'App.tsx를 찾을 수 없습니다.' };
      if (!existsSync(mainPath)) return { success: false, message: 'main.tsx를 찾을 수 없습니다.' };
      if (!existsSync(indexPath)) return { success: false, message: 'index.html을 찾을 수 없습니다.' };
      
      const indexContent = readFileSync(indexPath, 'utf8');
      if (!indexContent.includes('src="/main.tsx"')) {
        return { success: false, message: 'index.html의 진입점 경로가 올바르지 않습니다.' };
      }
      
      return { success: true, message: '모든 진입점 파일이 올바르게 설정되었습니다.' };
    }
  },
  {
    name: '🎨 스타일 파일 확인',
    check: () => {
      const stylePath = join(__dirname, 'styles/globals.css');
      if (!existsSync(stylePath)) return { success: false, message: 'globals.css를 찾을 수 없습니다.' };
      
      return { success: true, message: '스타일 파일이 준비되었습니다.' };
    }
  }
];

let allPassed = true;

for (const { name, check } of checks) {
  const result = check();
  const icon = result.success ? '✅' : '❌';
  console.log(`${icon} ${name}: ${result.message}`);
  
  if (!result.success) {
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 모든 확인 사항이 통과했습니다!');
  console.log('📤 이제 GitHub에 푸시하고 Pages를 활성화하세요.');
  console.log('\n📋 다음 단계:');
  console.log('1. git add .');
  console.log('2. git commit -m "🚀 Deploy to GitHub Pages"');
  console.log('3. git push origin main');
  console.log('4. GitHub Settings → Pages → Source: "GitHub Actions"');
  console.log('\n🌐 배포 완료 후 접속: https://parkh37t.github.io/clubschool/');
} else {
  console.log('❌ 일부 확인 사항에서 문제가 발견되었습니다.');
  console.log('위의 오류를 수정한 후 다시 시도하세요.');
  process.exit(1);
}