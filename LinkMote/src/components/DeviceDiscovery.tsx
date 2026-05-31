import React, { useEffect } from 'react';

export type DeviceType = 'roku' | 'androidtv' | 'appletv' | 'chromecast' | 'unknown';
export type DiscoveryProtocol = 'dial' | 'mdns' | 'ssdp';

export interface DiscoveredDevice {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  protocol: DiscoveryProtocol;
}

type ScanStatus = 'scanning' | 'found' | 'empty' | 'error';

interface DeviceDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceSelect: (device: DiscoveredDevice) => void;
  /** Injected by App once real discovery is wired */
  scanStatus?: ScanStatus;
  devices?: DiscoveredDevice[];
}

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  roku: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="3" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  androidtv: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="12" rx="2" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      <circle cx="12" cy="13" r="2" />
    </svg>
  ),
  appletv: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  ),
  chromecast: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17a5 5 0 0 1 5 5" />
      <path d="M2 12a10 10 0 0 1 10 10" />
      <path d="M2 7a15 15 0 0 1 15 15" />
      <rect width="20" height="15" x="2" y="3" rx="2" />
    </svg>
  ),
  unknown: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 9a3 3 0 0 1 6 0c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  ),
};

const PROTOCOL_BADGE: Record<DiscoveryProtocol, string> = {
  dial: 'DIAL',
  mdns: 'mDNS',
  ssdp: 'SSDP',
};

const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  roku: 'Roku',
  androidtv: 'Android TV',
  appletv: 'Apple TV',
  chromecast: 'Chromecast',
  unknown: 'Unknown device',
};

// Stub devices for UI preview — will be replaced by real discovery results
const STUB_DEVICES: DiscoveredDevice[] = [
  { id: 'dev-1', name: 'Living Room TV', type: 'roku', ip: '192.168.1.101', protocol: 'dial' },
  { id: 'dev-2', name: 'Bedroom Shield', type: 'androidtv', ip: '192.168.1.105', protocol: 'mdns' },
];

export const DeviceDiscovery: React.FC<DeviceDiscoveryProps> = ({
  isOpen,
  onClose,
  onDeviceSelect,
  scanStatus = 'scanning',
  devices = STUB_DEVICES,
}) => {
  // Trap body scroll while sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="discovery-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Device discovery">
      <div className="discovery-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className="sheet-handle" aria-hidden="true" />

        {/* Header */}
        <div className="sheet-header">
          <div className="sheet-title-group">
            <h2 className="sheet-title">Discover devices</h2>
            <p className="sheet-subtitle">Scanning via mDNS · SSDP · DIAL</p>
          </div>
          <button
            type="button"
            id="btn-close-discovery"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scan status bar */}
        <div className={`scan-status-bar status-${scanStatus}`}>
          {scanStatus === 'scanning' && (
            <>
              <div className="scan-spinner" aria-hidden="true" />
              <span>Scanning local network…</span>
            </>
          )}
          {scanStatus === 'found' && (
            <>
              <div className="status-dot dot-green" aria-hidden="true" />
              <span>{devices.length} device{devices.length !== 1 ? 's' : ''} found</span>
            </>
          )}
          {scanStatus === 'empty' && (
            <>
              <div className="status-dot dot-amber" aria-hidden="true" />
              <span>No devices found on this network</span>
            </>
          )}
          {scanStatus === 'error' && (
            <>
              <div className="status-dot dot-red" aria-hidden="true" />
              <span>Scan failed — check network permissions</span>
            </>
          )}
        </div>

        {/* Device list */}
        <div className="device-list" role="list">
          {devices.length === 0 && scanStatus !== 'scanning' ? (
            <div className="device-list-empty">
              <p>No compatible devices found.</p>
              <p className="device-list-empty-hint">
                Ensure the device is powered on and on the same Wi-Fi network.
              </p>
            </div>
          ) : (
            devices.map((device) => (
              <button
                key={device.id}
                type="button"
                id={`btn-device-${device.id}`}
                className="device-list-item"
                role="listitem"
                onClick={() => onDeviceSelect(device)}
              >
                <div className="device-item-icon">
                  {DEVICE_ICONS[device.type]}
                </div>
                <div className="device-item-info">
                  <span className="device-item-name">{device.name}</span>
                  <span className="device-item-meta">
                    {DEVICE_TYPE_LABEL[device.type]} · {device.ip}
                  </span>
                </div>
                <span className="device-item-badge">
                  {PROTOCOL_BADGE[device.protocol]}
                </span>
                <svg className="device-item-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))
          )}
        </div>

        {/* Rescan button */}
        <div className="sheet-footer">
          <button
            type="button"
            id="btn-rescan"
            className="rescan-btn"
            disabled={scanStatus === 'scanning'}
          >
            {scanStatus === 'scanning' ? 'Scanning…' : 'Scan again'}
          </button>
        </div>
      </div>
    </div>
  );
};
