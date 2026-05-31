import React, { useRef } from 'react';

interface GesturePadProps {
  onAction?: (action: 'up' | 'down' | 'left' | 'right' | 'ok') => void;
}

export const GesturePad: React.FC<GesturePadProps> = ({ onAction }) => {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 35; // Pixeles mínimos para considerar swipe

  const handleStart = (clientX: number, clientY: number) => {
    touchStart.current = { x: clientX, y: clientY };
  };

  const handleEnd = (clientX: number, clientY: number) => {
    if (!touchStart.current) return;

    const diffX = clientX - touchStart.current.x;
    const diffY = clientY - touchStart.current.y;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    const vibrate = (pattern: number | number[]) => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch {
          // Ignorar si no está permitido
        }
      }
    };

    if (Math.max(absX, absY) > minSwipeDistance) {
      // Es un deslizamiento (Swipe)
      if (absX > absY) {
        // Horizontal
        if (diffX > 0) {
          vibrate(15);
          if (onAction) onAction('right');
        } else {
          vibrate(15);
          if (onAction) onAction('left');
        }
      } else {
        // Vertical
        if (diffY > 0) {
          vibrate(15);
          if (onAction) onAction('down');
        } else {
          vibrate(15);
          if (onAction) onAction('up');
        }
      }
    } else {
      // Es un toque simple (Tap)
      vibrate([10, 10]);
      if (onAction) onAction('ok');
    }

    touchStart.current = null;
  };

  return (
    <div
      className="gesture-pad"
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={(e) => handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseUp={(e) => handleEnd(e.clientX, e.clientY)}
    >
      <div className="gesture-pad-content">
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="gesture-icon"
        >
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <path d="M12 18V6" />
          <path d="M15 18H9" />
          <path d="M15 15H9" />
          <path d="M15 12H9" />
        </svg>
        <span className="gesture-title">Control Táctil Ciego</span>
        <span className="gesture-subtitle">Deslizá para moverte • Tap para OK</span>
      </div>
    </div>
  );
};
