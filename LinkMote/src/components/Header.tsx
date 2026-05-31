import React from 'react';
import type { DiscoveredDevice } from './DeviceDiscovery';

interface HeaderProps {
  activeDevice: (DiscoveredDevice & { isPoweredOn: boolean }) | null;
  onCastClick?: () => void;
  onPowerToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeDevice,
  onCastClick,
  onPowerToggle,
}) => {
  const isConnected = activeDevice !== null;
  const isPoweredOn = activeDevice?.isPoweredOn ?? false;

  return (
    <header className="remote-header">
      {/* Cast / device indicator */}
      <button
        type="button"
        id="btn-cast"
        className={`cast-status-btn ${isConnected ? 'connected' : ''}`}
        onClick={onCastClick}
        aria-label={isConnected ? `Connected to ${activeDevice!.name}` : 'Scan for devices'}
      >
        <span className={`cast-dot ${isConnected ? 'dot-green' : 'dot-gray'}`} aria-hidden="true" />
        <svg
          className="cast-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 17a5 5 0 0 1 5 5" />
          <path d="M2 12a10 10 0 0 1 10 10" />
          <path d="M2 7a15 15 0 0 1 15 15" />
          <rect width="20" height="15" x="2" y="3" rx="2" />
        </svg>
        <span className="cast-label">
          {isConnected ? activeDevice!.name : 'LinkMote'}
        </span>
      </button>

      {/* Power button — only when a device is connected */}
      {isConnected && (
        <button
          type="button"
          id="btn-power"
          className={`power-button ${isPoweredOn ? 'on' : 'off'}`}
          onClick={onPowerToggle}
          aria-label={isPoweredOn ? 'Power off' : 'Power on'}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </button>
      )}
    </header>
  );
};
