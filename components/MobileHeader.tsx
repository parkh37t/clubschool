import React from 'react';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';

interface MobileHeaderProps {
  title: string;
  onBack: () => void;
  subtitle?: string;
  showLogo?: boolean;
}

export function MobileHeader({ title, onBack, subtitle, showLogo = true }: MobileHeaderProps) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between p-4 min-h-[60px]">
        {/* 뒤로가기 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-2 py-1.5 h-auto min-w-0"
        >
          <ArrowLeft className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate max-w-[120px]">{title}</span>
        </Button>

        {/* 중앙 영역 - 서브타이틀 */}
        {subtitle && (
          <div className="flex-1 text-center px-2">
            <p className="text-sm text-gray-600 truncate">{subtitle}</p>
          </div>
        )}


      </div>
    </div>
  );
}