import type { DiscoveredDevice } from '../components/DeviceDiscovery';

// We use relative URLs because Vite dev server proxies /api and /ws.
// This allows seamless LAN and local access.
const API_BASE = '/api';

export async function discoverDevices(): Promise<DiscoveredDevice[]> {
  const res = await fetch(`${API_BASE}/discover`);
  if (!res.ok) {
    throw new Error('Failed to run discovery scan');
  }
  return res.json();
}

export interface DeviceInfoResponse {
  udn: string;
  name: string;
  model: string;
  powerMode: string;
  isPoweredOn: boolean;
}

export async function getDeviceInfo(ip: string): Promise<DeviceInfoResponse> {
  const res = await fetch(`${API_BASE}/device/${ip}/info`);
  if (!res.ok) {
    throw new Error(`Failed to fetch device info for ${ip}`);
  }
  return res.json();
}

export interface DeviceApp {
  id: string;
  name: string;
  type: string;
}

export async function getDeviceApps(ip: string): Promise<DeviceApp[]> {
  const res = await fetch(`${API_BASE}/device/${ip}/apps`);
  if (!res.ok) {
    throw new Error(`Failed to fetch apps for ${ip}`);
  }
  return res.json();
}

export async function sendDeviceKey(ip: string, key: string): Promise<void> {
  const res = await fetch(`${API_BASE}/device/${ip}/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) {
    throw new Error(`Failed to send key "${key}" to device at ${ip}`);
  }
}

export async function launchDeviceApp(ip: string, appId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/device/${ip}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to launch app "${appId}" on device at ${ip}`);
  }
}

export async function connectManualDevice(ip: string): Promise<DiscoveredDevice> {
  const info = await getDeviceInfo(ip);
  return {
    id: info.udn || `manual-${ip.replace(/\./g, '-')}`,
    name: info.name,
    type: 'roku',
    ip: ip,
    protocol: 'ssdp',
  };
}
