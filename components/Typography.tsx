import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}

// Display 텍스트 (가장 큰 제목)
export function DisplayText({ children, className, gradient, ...props }: TypographyProps) {
  return (
    <h1
      className={cn(
        'text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none',
        gradient && 'text-gradient-primary',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

// 페이지 제목
export function PageTitle({ children, className, gradient, ...props }: TypographyProps) {
  return (
    <h1
      className={cn(
        'text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight',
        gradient && 'text-gradient',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

// 섹션 제목
export function SectionTitle({ children, className, gradient, ...props }: TypographyProps) {
  return (
    <h2
      className={cn(
        'text-2xl md:text-3xl font-semibold tracking-tight',
        gradient && 'text-gradient',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

// 카드 제목
export function CardTitle({ children, className, ...props }: TypographyProps) {
  return (
    <h3
      className={cn(
        'text-xl md:text-2xl font-semibold tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

// 서브 제목
export function Subtitle({ children, className, ...props }: TypographyProps) {
  return (
    <h4
      className={cn(
        'text-lg md:text-xl font-medium tracking-tight text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </h4>
  );
}

// 본문 텍스트 (큰 크기)
export function BodyLarge({ children, className, ...props }: TypographyProps) {
  return (
    <p
      className={cn(
        'text-lg md:text-xl leading-relaxed text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// 본문 텍스트 (기본)
export function Body({ children, className, ...props }: TypographyProps) {
  return (
    <p
      className={cn(
        'text-base leading-relaxed text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// 본문 텍스트 (작은 크기)
export function BodySmall({ children, className, ...props }: TypographyProps) {
  return (
    <p
      className={cn(
        'text-sm leading-relaxed text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// 캡션 텍스트
export function Caption({ children, className, ...props }: TypographyProps) {
  return (
    <span
      className={cn(
        'text-xs leading-tight text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// 라벨 텍스트
export function Label({ children, className, ...props }: TypographyProps) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

// 강조 텍스트
export function Emphasis({ children, className, ...props }: TypographyProps) {
  return (
    <strong
      className={cn(
        'font-semibold text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </strong>
  );
}

// 코드 텍스트
export function Code({ children, className, ...props }: TypographyProps) {
  return (
    <code
      className={cn(
        'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
}

// 링크 텍스트
interface LinkProps extends TypographyProps {
  href?: string;
}

export function Link({ children, className, href, ...props }: LinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'font-medium text-primary underline underline-offset-4 hover:text-primary-hover transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

// 목록 텍스트
export function List({ children, className, ...props }: TypographyProps) {
  return (
    <ul
      className={cn(
        'my-4 ml-6 list-disc space-y-2 [&>li]:mt-2',
        className
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

// 번호 목록 텍스트
export function OrderedList({ children, className, ...props }: TypographyProps) {
  return (
    <ol
      className={cn(
        'my-4 ml-6 list-decimal space-y-2 [&>li]:mt-2',
        className
      )}
      {...props}
    >
      {children}
    </ol>
  );
}

// 인용구
export function Blockquote({ children, className, ...props }: TypographyProps) {
  return (
    <blockquote
      className={cn(
        'mt-4 border-l-4 border-primary pl-4 italic text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
}

// 구분선
export function Divider({ className, ...props }: Omit<TypographyProps, 'children'>) {
  return (
    <hr
      className={cn(
        'my-8 border-border',
        className
      )}
      {...props}
    />
  );
}

// 텍스트 정렬 헬퍼
export const TextAlign = {
  Left: ({ children, className }: TypographyProps) => (
    <div className={cn('text-left', className)}>{children}</div>
  ),
  Center: ({ children, className }: TypographyProps) => (
    <div className={cn('text-center', className)}>{children}</div>
  ),
  Right: ({ children, className }: TypographyProps) => (
    <div className={cn('text-right', className)}>{children}</div>
  ),
  Justify: ({ children, className }: TypographyProps) => (
    <div className={cn('text-justify', className)}>{children}</div>
  ),
};

// 수직 간격 헬퍼
export const Spacing = {
  Tight: ({ children, className }: TypographyProps) => (
    <div className={cn('space-y-1', className)}>{children}</div>
  ),
  Normal: ({ children, className }: TypographyProps) => (
    <div className={cn('space-y-4', className)}>{children}</div>
  ),
  Relaxed: ({ children, className }: TypographyProps) => (
    <div className={cn('space-y-6', className)}>{children}</div>
  ),
  Loose: ({ children, className }: TypographyProps) => (
    <div className={cn('space-y-8', className)}>{children}</div>
  ),
};
