import React from 'react';

interface EmptyStateProps {
  onScanClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onScanClick }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg
          viewBox="0 0 64 64"
          width="72"
          height="72"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Screen */}
          <rect x="8" y="10" width="48" height="32" rx="4" />
          {/* Stand */}
          <line x1="24" y1="42" x2="20" y2="54" />
          <line x1="40" y1="42" x2="44" y2="54" />
          <line x1="18" y1="54" x2="46" y2="54" />
          {/* Cast waves */}
          <path d="M20 22a8 8 0 0 1 0 12" strokeDasharray="3 2" />
          <path d="M26 19a14 14 0 0 1 0 18" strokeDasharray="3 2" />
          <path d="M32 16a20 20 0 0 1 0 24" strokeDasharray="3 2" />
        </svg>
      </div>

      <div className="empty-state-content">
        <h2 className="empty-state-title">No device connected</h2>
        <p className="empty-state-desc">
          LinkMote will scan your local network using mDNS, SSDP, and DIAL
          to discover compatible devices automatically.
        </p>
      </div>

      <button
        type="button"
        id="btn-scan-devices"
        className="scan-btn"
        onClick={onScanClick}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="2" />
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49" />
          <path d="M20.07 3.93a12 12 0 0 1 0 16.97M3.93 20.07a12 12 0 0 1 0-16.97" />
        </svg>
        Scan for devices
      </button>

      <p className="empty-state-hint">
        Make sure your device is on the same Wi-Fi network.
      </p>
    </div>
  );
};
