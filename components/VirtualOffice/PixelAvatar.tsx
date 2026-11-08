import { AVATARS } from './officeTheme';

interface PixelAvatarProps {
  id: string;
  size?: number;
}

/** 12×12 픽셀 초상 — 사무실 캐릭터와 같은 머리·피부·부서색(셔츠). 카드와 커맨드 센터 머리에 쓴다. */
export function PixelAvatar({ id, size = 40 }: PixelAvatarProps) {
  const a = AVATARS[id] ?? AVATARS.lead;
  const px = (x: number, y: number, w: number, h: number, fill: string) => <rect x={x} y={y} width={w} height={h} fill={fill} />;
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden style={{ display: 'block', flexShrink: 0, background: '#E9E1CF', borderRadius: 4 }}>
      {/* 긴 머리·포니테일은 얼굴 뒤에서 아래로 */}
      {a.style === 'long' && px(2, 3, 8, 6, a.hair)}
      {a.style === 'ponytail' && px(9, 4, 2, 4, a.hair)}
      {px(3, 3, 6, 5, a.skin)}
      {/* 머리 윗부분 */}
      {a.style === 'buzz' ? px(3, 2, 6, 2, a.hair) : px(3, 1, 6, 3, a.hair)}
      {a.style === 'bun' && px(5, 0, 2, 1, a.hair)}
      {a.style !== 'buzz' && px(2, 2, 1, 3, a.hair)}
      {a.style !== 'buzz' && a.style !== 'ponytail' && px(9, 2, 1, 3, a.hair)}
      {/* 눈 */}
      {px(4, 5, 1, 1, '#24291F')}
      {px(7, 5, 1, 1, '#24291F')}
      {a.glasses && px(3, 5, 6, 1, 'rgba(36,41,31,.35)')}
      {a.glasses && px(4, 5, 1, 1, '#24291F')}
      {a.glasses && px(7, 5, 1, 1, '#24291F')}
      {px(5, 7, 2, 1, 'rgba(0,0,0,.18)')}
      {/* 목·셔츠 */}
      {px(5, 8, 2, 1, a.skin)}
      {px(2, 9, 8, 3, a.shirt)}
      {px(5, 9, 2, 1, 'rgba(255,255,255,.35)')}
      {a.headset && px(1, 4, 1, 3, '#2E3442')}
      {a.headset && px(2, 7, 2, 1, '#2E3442')}
    </svg>
  );
}
