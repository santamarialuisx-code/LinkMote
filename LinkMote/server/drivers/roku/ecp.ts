import http from 'http';
import { parseStringPromise } from 'xml2js';

// Helper to make HTTP POST requests
function post(ip: string, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: ip,
        port: 8060,
        path: path,
        method: 'POST',
        timeout: 2000,
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve());
      }
    );
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Helper to make HTTP GET requests returning string data
function get(ip: string, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: ip,
        port: 8060,
        path: path,
        method: 'GET',
        timeout: 2000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

export interface RokuDeviceInfo {
  udn: string;
  name: string;
  model: string;
  powerMode: string;
  isPoweredOn: boolean;
}

export interface RokuApp {
  id: string;
  name: string;
  type: string;
}

export async function getDeviceInfo(ip: string): Promise<RokuDeviceInfo> {
  const xml = await get(ip, '/query/device-info');
  const result = await parseStringPromise(xml);
  const info = result['device-info'];
  
  if (!info) {
    throw new Error('Invalid device info response');
  }

  const udn = info.udn?.[0] || '';
  const name = info['user-device-name']?.[0] || info['friendly-device-name']?.[0] || 'Roku Device';
  const model = info['model-name']?.[0] || 'Unknown Model';
  const powerMode = info['power-mode']?.[0] || 'Unknown';
  
  return {
    udn,
    name,
    model,
    powerMode,
    isPoweredOn: powerMode === 'PowerOn' || powerMode === 'DisplayOn',
  };
}

export async function getApps(ip: string): Promise<RokuApp[]> {
  const xml = await get(ip, '/query/apps');
  const result = await parseStringPromise(xml);
  const appsNode = result.apps?.app || [];
  
  return appsNode.map((a: any) => ({
    id: a.$.id,
    name: a._,
    type: a.$.type,
  }));
}

export async function launchApp(ip: string, appId: string): Promise<void> {
  await post(ip, `/launch/${appId}`);
}

export async function sendKey(ip: string, key: string): Promise<void> {
  await post(ip, `/keypress/${key}`);
}
