import { Capacitor } from '@capacitor/core';
import { CapacitorHttp, type HttpResponse } from '@capacitor/core';
import type { DiscoveredDevice } from '../components/DeviceDiscovery';

// ─── Environment detection ────────────────────────────────────────────────────
export const isNative = () => Capacitor.isNativePlatform();

// ─── API base used only in web/proxy mode ────────────────────────────────────
const API_BASE = '/api';

// ─── Roku ECP port (direct communication) ────────────────────────────────────
const ROKU_ECP_PORT = 8060;

// ─── Native HTTP helpers (Capacitor v6+ — CapacitorHttp.request() directly) ──
// We use CapacitorHttp.request() instead of window.fetch() because the fetch
// patch (CapacitorHttp.enabled: true) is unstable for empty-body POSTs on
// Android (Capacitor v7+). Using the native API directly gives us full control.

async function nativeGet(ip: string, path: string, timeoutMs = 5000): Promise<string> {
  const res: HttpResponse = await CapacitorHttp.request({
    method: 'GET',
    url: `http://${ip}:${ROKU_ECP_PORT}${path}`,
    headers: { Accept: 'application/xml' },
    readTimeout: timeoutMs,
    connectTimeout: timeoutMs,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`ECP GET ${path} failed: ${res.status}`);
  }
  // CapacitorHttp returns data as string when the content-type is text/xml
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
}

async function nativePost(ip: string, path: string): Promise<void> {
  // Roku ECP keypress/launch endpoints want a POST with an empty body.
  // CapacitorHttp.request() lets us send exactly that without extra headers
  // being injected by the Android native bridge.
  await CapacitorHttp.request({
    method: 'POST',
    url: `http://${ip}:${ROKU_ECP_PORT}${path}`,
    headers: { 'Content-Length': '0' },
    data: null,
    readTimeout: 4000,
    connectTimeout: 4000,
  });
}


// ─── XML parser (browser built-in DOMParser — no xml2js needed) ──────────────
function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'text/xml');
}

function xmlText(doc: Document, tag: string): string {
  return doc.querySelector(tag)?.textContent ?? '';
}

// ─── Device info ──────────────────────────────────────────────────────────────
export interface DeviceInfoResponse {
  udn: string;
  name: string;
  model: string;
  powerMode: string;
  isPoweredOn: boolean;
}

function parseDeviceInfoXml(xml: string): DeviceInfoResponse {
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

// ─── Subnet scanner (native discovery — no UDP SSDP from mobile) ─────────────
// Probes the subnet in batches using CapacitorHttp with tight timeouts.
// Short-circuits as soon as the first Roku responds.
async function probeRokuAt(ip: string, timeoutMs: number): Promise<DiscoveredDevice | null> {
  try {
    const xml = await nativeGet(ip, '/query/device-info', timeoutMs);
    const info = parseDeviceInfoXml(xml);
    return {
      id: info.udn || `roku-${ip.replace(/\./g, '-')}`,
      name: info.name,
      type: 'roku',
      ip,
      protocol: 'ssdp',
    };
  } catch {
    return null;
  }
}

async function scanSubnet(subnet: string): Promise<DiscoveredDevice[]> {
  const devices: DiscoveredDevice[] = [];
  const batchSize = 30;
  const timeoutMs = 2500;
  const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

  for (let i = 0; i < ips.length; i += batchSize) {
    const batch = ips.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((ip) => probeRokuAt(ip, timeoutMs)));
    const found = results.filter((d): d is DiscoveredDevice => d !== null);
    devices.push(...found);
    // Early return — most homes have one Roku, no need to scan the rest
    if (devices.length > 0) break;
  }

  return devices;
}

export interface DeviceApp {
  id: string;
  name: string;
  type: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function discoverDevices(): Promise<DiscoveredDevice[]> {
  if (isNative()) {
    // Scan the two most common home subnets concurrently
    const [a, b] = await Promise.all([
      scanSubnet('192.168.1'),
      scanSubnet('192.168.0'),
    ]);
    return [...a, ...b];
  }
  const res = await fetch(`${API_BASE}/discover`);
  if (!res.ok) throw new Error('Failed to run discovery scan');
  return res.json();
}

export async function getDeviceInfo(ip: string): Promise<DeviceInfoResponse> {
  if (isNative()) {
    const xml = await nativeGet(ip, '/query/device-info');
    return parseDeviceInfoXml(xml);
  }
  const res = await fetch(`${API_BASE}/device/${ip}/info`);
  if (!res.ok) throw new Error(`Failed to fetch device info for ${ip}`);
  return res.json();
}

export async function getDeviceApps(ip: string): Promise<DeviceApp[]> {
  if (isNative()) {
    const xml = await nativeGet(ip, '/query/apps');
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
    await nativePost(ip, `/keypress/${rokuKey}`);
    return;
  }
  const res = await fetch(`${API_BASE}/device/${ip}/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: rokuKey }),
  });
  if (!res.ok) throw new Error(`Failed to send key "${rokuKey}" to device at ${ip}`);
}

export async function launchDeviceApp(ip: string, appId: string): Promise<void> {
  if (isNative()) {
    await nativePost(ip, `/launch/${appId}`);
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
