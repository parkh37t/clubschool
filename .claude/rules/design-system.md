# 규칙: 디자인 시스템

이 프로젝트는 **Tailwind CSS v4 + CSS 변수 토큰 + shadcn/ui(Radix)** 기반입니다.

## 토큰 사용
- 색상/반경/폰트는 하드코딩하지 말고 토큰을 사용합니다. 토큰은 CSS 변수로 정의되어
  `tailwind.config.js`에서 Tailwind 클래스로 매핑됩니다.
- 색상 클래스: `bg-background`, `text-foreground`, `bg-primary text-primary-foreground`,
  `bg-muted`, `border-border`, `bg-card`, `text-destructive` 등.
- 차트 색상은 `chart-1` ~ `chart-5` 토큰을 사용합니다(Recharts 시리즈 색상 일관성).
- 반경은 `rounded-sm/md/lg/xl`(CSS 변수 매핑), 폰트 두께는 `font-normal/medium/semibold/bold`.
- 임의 색상(`#hex`, `text-[...]`)은 토큰으로 표현 불가할 때만, 사유 주석과 함께 예외적으로.

## 다크 모드
- `next-themes` 기반. 색상은 항상 의미 토큰(`foreground`/`background` 등)으로 지정하여
  다크 모드에서 자동 대응되게 합니다. 라이트 전용 색을 박지 않습니다.

## 컴포넌트
- 폼 요소·버튼·다이얼로그 등은 `components/ui/`의 shadcn/ui 컴포넌트를 우선 재사용합니다.
  새로 만들기 전에 동일 컴포넌트가 있는지 먼저 확인합니다.
- 클래스 병합은 `cn()`(`components/ui/utils.ts`, clsx + tailwind-merge)을 사용합니다.
- 버튼 변형(variant)은 `class-variance-authority` 패턴을 따릅니다.

## 아이콘 / 모션 / 알림
- 아이콘: `lucide-react`.
- 애니메이션: Tailwind keyframe 토큰(`animate-fade-in`, `animate-slide-in-from-*`) 또는
  `framer-motion`. 0.2s 전후의 짧고 절제된 모션을 유지합니다.
- 토스트/알림: `sonner`.

## 레이아웃
- 반응형 우선(flex/grid). 모바일은 뷰어 중심, 데스크톱은 관리 기능 전체.
- 간격은 Tailwind 스페이싱 스케일을 사용하고 일관성을 유지합니다.

## 일관성 점검
- 새 UI는 기존 화면(`Dashboard`, `Analytics` 등)의 카드/간격/타이포 패턴과 맞춥니다.
- 같은 의미의 상태(승인/반려/대기 등)는 같은 색 토큰으로 표현합니다.
