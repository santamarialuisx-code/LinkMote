import React, { useRef, useState, useEffect } from 'react';

interface VolumeSliderProps {
  initialVolume?: number;
  onVolumeChange?: (volume: number) => void;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  initialVolume = 50,
  onVolumeChange,
}) => {
  const [volume, setVolume] = useState(initialVolume);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateVolume = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const height = rect.height;
    const relativeY = rect.bottom - clientY;
    let percentage = Math.round((relativeY / height) * 100);
    percentage = Math.max(0, Math.min(100, percentage));
    setVolume(percentage);
    if (onVolumeChange) {
      onVolumeChange(percentage);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    calculateVolume(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    calculateVolume(e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      calculateVolume(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      calculateVolume(e.touches[0].clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="volume-slider-container">
      {/* Icono de volumen alto */}
      <svg
        className="volume-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>

      {/* Track interactivo */}
      <div
        className="volume-slider-track"
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className="volume-slider-fill"
          style={{ height: `${volume}%` }}
        />
        {/* Manija con brillo */}
        <div
          className={`volume-slider-handle ${isDragging ? 'active' : ''}`}
          style={{ bottom: `calc(${volume}% - 6px)` }}
        />
      </div>

      {/* Icono de volumen bajo */}
      <svg
        className="volume-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    </div>
  );
};
