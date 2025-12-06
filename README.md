# 프로젝트 관리 대시보드 📊

> 프로젝트별 구성원 투입 현황을 관리하는 현대적인 대시보드 애플리케이션

![Project Management Dashboard](./public/og-image.png)

## ✨ 주요 기능

### 📈 **실시간 대시보드**
- 전체 팀원 현황 및 가동률 모니터링
- 월별 투입량 및 비용 분석
- 팀별 인력 현황 및 성과 추적

### 👥 **구성원 관리**
- 56명 조직 구성원 통합 관리
- 개인별 프로필 및 투입 히스토리
- 팀별 가동률 및 성과 분석

### 🎯 **프로젝트 관리**
- 3단계 프로젝트 생성 마법사
- 프로젝트 검토 워크플로우
- 구성원 투입/철수 관리 시스템

### 📱 **완벽한 반응형 디자인**
- **모바일**: 뷰어 모드 최적화
- **데스크톱**: 관리자 모드 전체 기능
- iPhone/Android 네이티브 UX

### 🎨 **현대적인 UI/UX**
- Tailwind CSS + shadcn/ui 컴포넌트
- 다크모드 지원 및 접근성 최적화
- 애니메이션 및 인터랙티브 차트

## 🚀 빠른 시작

### 필요한 환경
- **Node.js**: 18.0.0 이상
- **npm** 또는 **yarn**

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/project-management-dashboard.git
cd project-management-dashboard

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하세요.

### 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📦 기술 스택

### **프론트엔드**
- **React 18** - 최신 React 기능 활용
- **TypeScript** - 타입 안전성 보장
- **Vite** - 빠른 개발 및 빌드

### **스타일링**
- **Tailwind CSS v4** - 유틸리티 우선 CSS
- **shadcn/ui** - 고품질 컴포넌트 라이브러리
- **Lucide React** - 아름다운 아이콘

### **차트 및 시각화**
- **Recharts** - 반응형 차트 라이브러리
- **Custom Analytics** - 실시간 데이터 시각화

### **상태 관리**
- **React Hooks** - 현대적인 상태 관리
- **Custom Hooks** - 재사용 가능한 로직

## 🌐 배포 옵션

### **🚀 GitHub Pages 자동 배포 (완전 설정 완료!)**

#### **📋 배포 준비사항**
✅ **모든 설정이 완료되었습니다:**
- GitHub Actions 워크플로우 준비
- clubschool 저장소에 최적화된 설정
- 완벽한 모바일 반응형 지원

#### **🎯 배포 방법**
1. **코드를 GitHub에 푸시**
   ```bash
   # 현재 디렉토리에서
   git add .
   git commit -m "🎉 Deploy: Project Management Dashboard"
   git push origin main
   ```

2. **GitHub Pages 활성화**
   - https://github.com/parkh37t/clubschool 접속
   - **Settings** → **Pages** 클릭
   - **Source**: "GitHub Actions" 선택
   - 자동 배포 시작! 🚀

3. **배포 완료 확인**
   ```
   🌐 Live URL: https://parkh37t.github.io/clubschool/
   ```

#### **📊 배포 모니터링**
- **Actions** 탭에서 배포 진행상황 실시간 확인
- 빌드 성공 시 자동으로 사이트 업데이트
- 오류 발생 시 상세 로그 제공

#### **수동 배포**
```bash
# gh-pages 패키지로 수동 배포
npm run deploy
```

### **⚡ 2. Vercel 배포**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/project-management-dashboard)

```bash
# Vercel CLI로 배포
npm i -g vercel
vercel
```

### **🌍 3. Netlify 배포**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/project-management-dashboard)

```bash
# Netlify CLI로 배포
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### **📋 배포 체크리스트**

✅ **배포 전 확인사항:**
- [ ] `npm run build` 성공 확인
- [ ] `npm run type-check` 오류 없음
- [ ] GitHub 저장소 생성 완료
- [ ] 저장소가 Public으로 설정됨

✅ **GitHub Pages 설정:**
- [ ] Repository → Settings → Pages 접근
- [ ] Source: "GitHub Actions" 선택
- [ ] main 브랜치에 코드 푸시 완료

✅ **배포 후 확인:**
- [ ] 사이트가 정상적으로 로딩됨
- [ ] 모바일에서 레이아웃 확인
- [ ] 모든 기능이 정상 작동함

## 📁 프로젝트 구조

```
project-management-dashboard/
├── public/                 # 정적 파일
├── src/
│   ├── components/         # React 컴포넌트
│   │   ├── ui/            # shadcn/ui 컴포넌트
│   │   ├── Dashboard.tsx  # 메인 대시보드
│   │   ├── Analytics.tsx  # 분석 페이지
│   │   └── ...
│   ├── hooks/             # 커스텀 훅
│   ├── data/              # 모크 데이터 및 API
│   ├── types/             # TypeScript 타입 정의
│   ├── styles/            # 글로벌 CSS 스타일
│   └── App.tsx            # 메인 앱 컴포넌트
├── package.json
├── vite.config.ts         # Vite 설정
├── tailwind.config.js     # Tailwind 설정
└── README.md
```

## 🎨 디자인 시스템

### **컬러 팔레트**
- **Primary**: `#030213` - 메인 브랜드 컬러
- **Secondary**: `oklch(0.95 0.0058 264.53)` - 보조 컬러
- **Accent**: `#e9ebef` - 강조 컬러

### **타이포그래피**
- **제목**: 볼드 가중치, 적절한 행간
- **본문**: 가독성 최적화된 크기 및 간격
- **모바일**: 반응형 폰트 크기 자동 조정

### **컴포넌트**
- **카드**: 그림자 효과 및 호버 애니메이션
- **버튼**: 터치 친화적 최소 44px 크기
- **차트**: 반응형 및 접근성 최적화

## 🔧 개발 가이드

### **코드 스타일**
```bash
# ESLint 실행
npm run lint

# 자동 수정
npm run lint:fix
```

### **환경변수 설정**
```bash
# .env.local 파일 생성
VITE_API_BASE_URL=https://api.your-domain.com
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### **커스텀 훅 사용**
```typescript
import { useMobile } from '@/hooks/useMobile';

function Component() {
  const isMobile = useMobile();
  return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>;
}
```

## 📊 성능 최적화

### **빌드 최적화**
- **코드 분할**: 벤더, UI, 차트별 청크 분리
- **Tree Shaking**: 사용하지 않는 코드 제거
- **압축**: Gzip 및 Brotli 압축 지원

### **런타임 최적화**
- **메모이제이션**: React.memo 및 useMemo 활용
- **지연 로딩**: 동적 import로 컴포넌트 지연 로딩
- **이미지 최적화**: WebP 포맷 및 반응형 이미지

## 🌍 브라우저 지원

- **Chrome**: 90+ ✅
- **Firefox**: 88+ ✅  
- **Safari**: 14+ ✅
- **Edge**: 90+ ✅
- **모바일**: iOS Safari 14+, Android Chrome 90+ ✅

## 🤝 기여 가이드

1. **Fork** 저장소
2. **Feature 브랜치** 생성 (`git checkout -b feature/AmazingFeature`)
3. **변경사항 커밋** (`git commit -m 'Add some AmazingFeature'`)
4. **브랜치 푸시** (`git push origin feature/AmazingFeature`)
5. **Pull Request** 생성

## 📄 라이선스

이 프로젝트는 [MIT License](LICENSE)로 라이선스됩니다.

## 📞 지원 및 문의

- **이메일**: support@clubschool.com
- **GitHub Issues**: [문제 신고](https://github.com/your-username/project-management-dashboard/issues)
- **Discord**: [커뮤니티 참여](https://discord.gg/clubschool)

## 🙏 감사인사

- [shadcn/ui](https://ui.shadcn.com/) - 아름다운 컴포넌트 라이브러리
- [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 CSS 프레임워크
- [Recharts](https://recharts.org/) - React 차트 라이브러리
- [Lucide](https://lucide.dev/) - 깔끔한 아이콘 라이브러리

---

<div align="center">
  <strong>🚀 Clubschool Team에서 개발</strong>
  <br>
  <a href="https://clubschool.com">clubschool.com</a>
</div>