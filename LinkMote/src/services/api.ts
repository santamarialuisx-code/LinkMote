import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { HttpResponse } from '@capacitor/core';
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
  const res: HttpResponse = await CapacitorHttp.get({
    url: `http://${ip}:${ROKU_ECP_PORT}${path}`,
    headers: { Accept: 'application/xml, text/xml, */*' },
    responseType: 'text',
    readTimeout: timeoutMs,
    connectTimeout: timeoutMs,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`ECP GET ${path} failed: ${res.status}`);
  }
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
}

// Sequential queue to serialize remote control commands to the device
class CommandQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = false;

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.runNext();
    });
  }

  private async runNext() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const nextTask = this.queue.shift();
    if (nextTask) {
      try {
        await nextTask();
      } catch (e) {
        // Error is already handled by the promise catch
      }
    }
    this.running = false;
    this.runNext();
  }
}

const remoteQueue = new CommandQueue();

// Returns { status, error } for debug visibility
export async function nativePost(ip: string, path: string): Promise<{ status: number; error?: string }> {
  try {
    // We use CapacitorHttp.request with method: 'POST' and NO data/body field.
    // This forces OkHttp on Android/iOS to send a clean HTTP POST with Content-Length: 0
    // and no body stream/chunked encoding, which is exactly what Roku ECP expects.
    const res: HttpResponse = await CapacitorHttp.request({
      url: `http://${ip}:${ROKU_ECP_PORT}${path}`,
      method: 'POST',
      readTimeout: 4000,
      connectTimeout: 4000,
    });
    return { status: res.status };
  } catch (err: any) {
    return { status: 0, error: err?.message ?? String(err) };
  }
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

function getPrioritizedIps(subnet: string): string[] {
  const ips: string[] = [];
  
  // 1. Most common DHCP ranges: .100 - .150
  for (let i = 100; i <= 150; i++) {
    ips.push(`${subnet}.${i}`);
  }
  
  // 2. Common low DHCP ranges: .2 - .50
  for (let i = 2; i <= 50; i++) {
    ips.push(`${subnet}.${i}`);
  }
  
  // 3. Middle range: .51 - .99
  for (let i = 51; i <= 99; i++) {
    ips.push(`${subnet}.${i}`);
  }
  
  // 4. High range: .151 - .254
  for (let i = 151; i <= 254; i++) {
    ips.push(`${subnet}.${i}`);
  }
  
  return ips;
}

async function scanSubnet(subnet: string): Promise<DiscoveredDevice[]> {
  const devices: DiscoveredDevice[] = [];
  const batchSize = 15;
  const timeoutMs = 1200;
  const ips = getPrioritizedIps(subnet);

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
    // Scan sequentially to prevent thread starvation and choking the network
    const a = await scanSubnet('192.168.1');
    if (a.length > 0) return a;
    
    const b = await scanSubnet('192.168.0');
    return b;
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

// Returns debug info so UI can display errors inline
export async function sendDeviceKey(
  ip: string,
  rokuKey: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  return remoteQueue.add(async () => {
    if (isNative()) {
      const result = await nativePost(ip, `/keypress/${rokuKey}`);
      const ok = result.status >= 200 && result.status < 300;
      return { ok, status: result.status, error: result.error };
    }
    try {
      const res = await fetch(`${API_BASE}/device/${ip}/key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: rokuKey }),
      });
      return { ok: res.ok, status: res.status };
    } catch (err: any) {
      return { ok: false, status: 0, error: err?.message ?? String(err) };
    }
  });
}

export async function launchDeviceApp(
  ip: string,
  appId: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  return remoteQueue.add(async () => {
    if (isNative()) {
      const result = await nativePost(ip, `/launch/${appId}`);
      const ok = result.status >= 200 && result.status < 300;
      return { ok, status: result.status, error: result.error };
    }
    try {
      const res = await fetch(`${API_BASE}/device/${ip}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId }),
      });
      return { ok: res.ok, status: res.status };
    } catch (err: any) {
      return { ok: false, status: 0, error: err?.message ?? String(err) };
    }
  });
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
