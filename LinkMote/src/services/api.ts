import { Capacitor } from '@capacitor/core';
import type { DiscoveredDevice } from '../components/DeviceDiscovery';

// ─── Environment detection ────────────────────────────────────────────────────
export const isNative = () => Capacitor.isNativePlatform();

// ─── API base used only in web/proxy mode ────────────────────────────────────
const API_BASE = '/api';

// ─── Roku ECP port (direct communication) ────────────────────────────────────
const ROKU_ECP_PORT = 8060;

// ─── Direct HTTP helpers (native mode) ───────────────────────────────────────
async function ecpGet(ip: string, path: string): Promise<string> {
  const res = await fetch(`http://${ip}:${ROKU_ECP_PORT}${path}`);
  if (!res.ok) throw new Error(`ECP GET ${path} failed: ${res.status}`);
  return res.text();
}

async function ecpPost(ip: string, path: string): Promise<void> {
  await fetch(`http://${ip}:${ROKU_ECP_PORT}${path}`, { method: 'POST' });
}

// ─── XML parser (browser built-in DOMParser — no xml2js needed) ──────────────
function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'text/xml');
}

function xmlText(doc: Document, tag: string): string {
  return doc.querySelector(tag)?.textContent ?? '';
}

// ─── Subnet scanner (native discovery — no UDP SSDP from mobile) ─────────────
// Scans the two most common home subnets concurrently, probing port 8060.
// A successful response to /query/device-info confirms it's a Roku.
async function scanSubnet(subnet: string): Promise<DiscoveredDevice[]> {
  const probes: Promise<DiscoveredDevice | null>[] = [];

  for (let i = 1; i <= 254; i++) {
    const ip = `${subnet}.${i}`;
    probes.push(
      getDeviceInfoDirect(ip)
        .then((info) => ({
          id: info.udn || `roku-${ip.replace(/\./g, '-')}`,
          name: info.name,
          type: 'roku' as const,
          ip,
          protocol: 'ssdp' as const,
        }))
        .catch(() => null)
    );
  }

  const results = await Promise.allSettled(probes);
  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((d): d is DiscoveredDevice => d !== null);
}

// ─── Device info (native direct) ─────────────────────────────────────────────
export interface DeviceInfoResponse {
  udn: string;
  name: string;
  model: string;
  powerMode: string;
  isPoweredOn: boolean;
}

async function getDeviceInfoDirect(ip: string): Promise<DeviceInfoResponse> {
  const xml = await ecpGet(ip, '/query/device-info');
  const doc = parseXml(xml);
  const udn = xmlText(doc, 'udn');
  const name =
    xmlText(doc, 'user-device-name') ||
    xmlText(doc, 'friendly-device-name') ||
    'Roku Device';
  const model = xmlText(doc, 'model-name') || 'Unknown Model';
  const powerMode = xmlText(doc, 'power-mode') || 'Unknown';
  return {
    udn,
    name,
    model,
    powerMode,
    isPoweredOn: powerMode === 'PowerOn' || powerMode === 'DisplayOn',
  };
}

export interface DeviceApp {
  id: string;
  name: string;
  type: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function discoverDevices(): Promise<DiscoveredDevice[]> {
  if (isNative()) {
    // On mobile, scan the two most common home subnets concurrently
    const [a, b] = await Promise.all([
      scanSubnet('192.168.1'),
      scanSubnet('192.168.0'),
    ]);
    return [...a, ...b];
  }
  // Web/proxy mode
  const res = await fetch(`${API_BASE}/discover`);
  if (!res.ok) throw new Error('Failed to run discovery scan');
  return res.json();
}

export async function getDeviceInfo(ip: string): Promise<DeviceInfoResponse> {
  if (isNative()) return getDeviceInfoDirect(ip);
  const res = await fetch(`${API_BASE}/device/${ip}/info`);
  if (!res.ok) throw new Error(`Failed to fetch device info for ${ip}`);
  return res.json();
}

export async function getDeviceApps(ip: string): Promise<DeviceApp[]> {
  if (isNative()) {
    const xml = await ecpGet(ip, '/query/apps');
    const doc = parseXml(xml);
    return Array.from(doc.querySelectorAll('app')).map((a) => ({
      id: a.getAttribute('id') ?? '',
      name: a.textContent ?? '',
      type: a.getAttribute('type') ?? '',
    }));
  }
  const res = await fetch(`${API_BASE}/device/${ip}/apps`);
  if (!res.ok) throw new Error(`Failed to fetch apps for ${ip}`);
  return res.json();
}

export async function sendDeviceKey(ip: string, rokuKey: string): Promise<void> {
  if (isNative()) {
    await ecpPost(ip, `/keypress/${rokuKey}`);
    return;
  }
  // In web mode we pass the UI key to the proxy which does the translation
  const res = await fetch(`${API_BASE}/device/${ip}/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: rokuKey }),
  });
  if (!res.ok) throw new Error(`Failed to send key "${rokuKey}" to device at ${ip}`);
}

export async function launchDeviceApp(ip: string, appId: string): Promise<void> {
  if (isNative()) {
    await ecpPost(ip, `/launch/${appId}`);
    return;
  }
  const res = await fetch(`${API_BASE}/device/${ip}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId }),
  });
  if (!res.ok) throw new Error(`Failed to launch app "${appId}" on device at ${ip}`);
}

export async function connectManualDevice(ip: string): Promise<DiscoveredDevice> {
  const info = await getDeviceInfo(ip);
  return {
    id: info.udn || `manual-${ip.replace(/\./g, '-')}`,
    name: info.name,
    type: 'roku',
    ip,
    protocol: 'ssdp',
  };
}
