import React from 'react';

interface DPadProps {
  onKeyPress?: (key: 'up' | 'down' | 'left' | 'right' | 'ok') => void;
}

export const DPad: React.FC<DPadProps> = ({ onKeyPress }) => {
  const handlePress = (key: 'up' | 'down' | 'left' | 'right' | 'ok') => {
    // Vibración corta táctil si está disponible en móviles
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignorar errores si no está permitido
      }
    }
    if (onKeyPress) {
      onKeyPress(key);
    }
  };

  return (
    <div className="dpad-outer">
      <div className="dpad-circle">
        <button
          type="button"
          className="dpad-btn dpad-up"
          onClick={() => handlePress('up')}
          aria-label="Arriba"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        <button
          type="button"
          className="dpad-btn dpad-left"
          onClick={() => handlePress('left')}
          aria-label="Izquierda"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          className="dpad-btn dpad-ok"
          onClick={() => handlePress('ok')}
          aria-label="OK"
        >
          <span>OK</span>
        </button>

        <button
          type="button"
          className="dpad-btn dpad-right"
          onClick={() => handlePress('right')}
          aria-label="Derecha"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button
          type="button"
          className="dpad-btn dpad-down"
          onClick={() => handlePress('down')}
          aria-label="Abajo"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </div>
  );
};
