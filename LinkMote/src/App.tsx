import { useState } from 'react'
import { Header } from './components/Header'
import { DPad } from './components/DPad'
import { VolumeSlider } from './components/VolumeSlider'
import { GesturePad } from './components/GesturePad'
import { BottomNav } from './components/BottomNav'
import { EmptyState } from './components/EmptyState'
import { DeviceDiscovery } from './components/DeviceDiscovery'
import { useDeviceDiscovery } from './hooks/useDeviceDiscovery'
import { useRokuRemote, type ConnectedDevice } from './hooks/useRokuRemote'
import './App.css'

// ─── Domain types ────────────────────────────────────────────────────────────
type Tab = 'remote' | 'channels' | 'settings';
type ControlMode = 'buttons' | 'gestures';

// ─── Streaming services catalog & Roku Channel mapping ───────────────────────
const STREAMING_SERVICES = [
  { id: 'netflix',   label: 'Netflix',     color: '#E50914', abbr: 'N' },
  { id: 'prime',     label: 'Prime Video', color: '#00A8E0', abbr: 'P' },
  { id: 'youtube',   label: 'YouTube',     color: '#FF0000', abbr: 'YT' },
  { id: 'disney',    label: 'Disney+',     color: '#113CCF', abbr: 'D+' },
  { id: 'spotify',   label: 'Spotify',     color: '#1DB954', abbr: '♫' },
  { id: 'twitch',    label: 'Twitch',      color: '#9146FF', abbr: 'Tw' },
  { id: 'hbo',       label: 'Max',         color: '#0A1628', abbr: 'M' },
  { id: 'hulu',      label: 'Hulu',        color: '#1CE783', abbr: 'Hu' },
  { id: 'plex',      label: 'Plex',        color: '#E5A00D', abbr: 'Px' },
] as const;

const ROKU_APP_IDS: Record<string, string> = {
  netflix: '12',
  prime: '13',
  youtube: '837',
  disney: '291097',
  spotify: '22297',
  twitch: '50539',
  hbo: 'max',       // Fallback name search or default
  hulu: '2285',      // Fallback
  plex: '13535',     // Plex Roku App ID
};

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab]         = useState<Tab>('remote');
  const [controlMode, setControlMode]     = useState<ControlMode>('buttons');
  const [volume, setVolume]               = useState(50);
  const [activeDevice, setActiveDevice]   = useState<ConnectedDevice | null>(null);
  const [isDiscoveryOpen, setDiscoveryOpen] = useState(false);

  // Wire real device discovery and remote ECP hooks
  const { devices, scanStatus, rescan, connectManual } = useDeviceDiscovery();
  const remote = useRokuRemote(activeDevice);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch { /* not permitted */ }
    }
  };

  const handleKeyPress = (key: string) => {
    vibrate(15);
    remote.sendKey(key);
    console.log(`[remote] key=${key} device=${activeDevice?.id}`);
  };

  const handleSecondaryPress = (action: string) => {
    vibrate(15);
    remote.sendKey(action);
    console.log(`[remote] action=${action} device=${activeDevice?.id}`);
  };

  const handleVolumeChange = (vol: number) => {
    const prevVol = volume;
    setVolume(vol);
    remote.adjustVolumeDelta(prevVol, vol);
    console.log(`[remote] volume change: prev=${prevVol} next=${vol} device=${activeDevice?.id}`);
  };

  const handleLaunchService = (serviceId: string) => {
    vibrate(20);
    const appId = ROKU_APP_IDS[serviceId] || serviceId;
    remote.launchApp(appId);
    console.log(`[channels] launch=${serviceId} (appId=${appId}) device=${activeDevice?.id}`);
  };

  const handleDeviceSelect = (device: any) => {
    vibrate([15, 10, 15]);
    setActiveDevice({ ...device, isPoweredOn: true });
    setDiscoveryOpen(false);
    setActiveTab('remote');
    console.log(`[discovery] connected to`, device);
  };

  const handlePowerToggle = () => {
    if (!activeDevice) return;
    vibrate(20);
    const next = !activeDevice.isPoweredOn;
    setActiveDevice({ ...activeDevice, isPoweredOn: next });
    remote.togglePower();
    console.log(`[remote] power toggled device=${activeDevice.id}`);
  };

  const handleDisconnect = () => {
    vibrate([20, 10]);
    setActiveDevice(null);
    console.log('[settings] disconnected');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-frame">
      <Header
        activeDevice={activeDevice}
        onCastClick={() => setDiscoveryOpen(true)}
        onPowerToggle={handlePowerToggle}
      />

      <main className="main-content">
        {/* ── Remote tab ─────────────────────────────────────────── */}
        {activeTab === 'remote' && (
          <div className="tab-view animate-fade-in">
            {activeDevice ? (
              <>
                <div className="mode-selector">
                  <button
                    type="button"
                    id="btn-mode-buttons"
                    className={`mode-btn ${controlMode === 'buttons' ? 'active' : ''}`}
                    onClick={() => setControlMode('buttons')}
                  >
                    Buttons
                  </button>
                  <button
                    type="button"
                    id="btn-mode-gestures"
                    className={`mode-btn ${controlMode === 'gestures' ? 'active' : ''}`}
                    onClick={() => setControlMode('gestures')}
                  >
                    Gestures
                  </button>
                </div>

                <div className="control-row">
                  <div className="dpad-wrapper">
                    {controlMode === 'buttons' ? (
                      <DPad onKeyPress={handleKeyPress} />
                    ) : (
                      <GesturePad onAction={handleKeyPress} />
                    )}
                  </div>
                  <div className="volume-wrapper">
                    <VolumeSlider initialVolume={volume} onVolumeChange={handleVolumeChange} />
                  </div>
                </div>

                <div className="secondary-buttons">
                  <button type="button" id="btn-back" className="sec-btn" onClick={() => handleSecondaryPress('back')} aria-label="Back">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                  </button>
                  <button type="button" id="btn-home" className="sec-btn" onClick={() => handleSecondaryPress('home')} aria-label="Home">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </button>
                  <button type="button" id="btn-options" className="sec-btn" onClick={() => handleSecondaryPress('options')} aria-label="Options">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <EmptyState onScanClick={() => setDiscoveryOpen(true)} />
            )}
          </div>
        )}

        {/* ── Channels tab ───────────────────────────────────────── */}
        {activeTab === 'channels' && (
          <div className="tab-view animate-fade-in">
            <div className="tab-header">
              <h2 className="tab-title">Channels</h2>
              {!activeDevice && (
                <span className="tab-badge-warning">Connect a device first</span>
              )}
            </div>
            <div className="channels-grid">
              {STREAMING_SERVICES.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  id={`btn-channel-${svc.id}`}
                  className={`channel-card ${!activeDevice ? 'disabled' : ''}`}
                  onClick={() => activeDevice && handleLaunchService(svc.id)}
                  disabled={!activeDevice}
                  aria-label={`Launch ${svc.label}`}
                >
                  <div className="channel-logo" style={{ '--svc-color': svc.color } as React.CSSProperties}>
                    <span className="channel-abbr">{svc.abbr}</span>
                  </div>
                  <span className="channel-label">{svc.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Settings tab ───────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="tab-view animate-fade-in">
            <div className="tab-header">
              <h2 className="tab-title">Settings</h2>
            </div>

            {/* Connected device card */}
            <div className="settings-section">
              <h3 className="settings-section-title">Device</h3>
              {activeDevice ? (
                <div className="settings-card">
                  <div className="settings-device-row">
                    <div className="settings-device-icon">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="7" y="2" width="10" height="20" rx="3" />
                        <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" />
                      </svg>
                    </div>
                    <div className="settings-device-info">
                      <span className="settings-device-name">{activeDevice.name}</span>
                      <span className="settings-device-meta">
                        {activeDevice.type} · {activeDevice.ip} · {activeDevice.protocol.toUpperCase()}
                      </span>
                    </div>
                    <div className={`settings-device-dot ${activeDevice.isPoweredOn ? 'dot-green' : 'dot-gray'}`} />
                  </div>
                  <div className="settings-card-divider" />
                  <button
                    type="button"
                    id="btn-disconnect"
                    className="settings-danger-btn"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="settings-card settings-card-empty">
                  <p className="settings-empty-text">No device connected</p>
                  <button
                    type="button"
                    id="btn-settings-scan"
                    className="settings-action-btn"
                    onClick={() => setDiscoveryOpen(true)}
                  >
                    Scan for devices
                  </button>
                </div>
              )}
            </div>

            {/* Network / protocols section */}
            <div className="settings-section">
              <h3 className="settings-section-title">Discovery protocols</h3>
              <div className="settings-card">
                {[
                  { proto: 'mDNS', desc: 'Multicast DNS — Bonjour / Avahi', status: 'ready' },
                  { proto: 'SSDP', desc: 'UPnP Simple Service Discovery', status: 'ready' },
                  { proto: 'DIAL', desc: 'Discovery & Launch — Roku / Chromecast', status: 'ready' },
                ].map(({ proto, desc, status }, i, arr) => (
                  <div key={proto}>
                    <div className="proto-row">
                      <div className="proto-info">
                        <span className="proto-name">{proto}</span>
                        <span className="proto-desc">{desc}</span>
                      </div>
                      <span className={`proto-status status-${status}`}>{status}</span>
                    </div>
                    {i < arr.length - 1 && <div className="settings-card-divider" />}
                  </div>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="settings-section">
              <h3 className="settings-section-title">About</h3>
              <div className="settings-card">
                <div className="about-row">
                  <span className="about-key">App</span>
                  <span className="about-val">LinkMote</span>
                </div>
                <div className="settings-card-divider" />
                <div className="about-row">
                  <span className="about-key">Version</span>
                  <span className="about-val">0.1.0-alpha</span>
                </div>
                <div className="settings-card-divider" />
                <div className="about-row">
                  <span className="about-key">Protocol</span>
                  <span className="about-val">mDNS · SSDP · DIAL</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Device discovery bottom sheet */}
      <DeviceDiscovery
        isOpen={isDiscoveryOpen}
        onClose={() => setDiscoveryOpen(false)}
        onDeviceSelect={handleDeviceSelect}
        scanStatus={scanStatus}
        devices={devices}
        onRescan={rescan}
        onManualConnect={connectManual}
      />
    </div>
  );
}

export default App
