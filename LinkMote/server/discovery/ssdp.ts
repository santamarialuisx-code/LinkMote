import dgram from 'dgram';
import { getDeviceInfo } from '../drivers/roku/ecp';

export interface DiscoveredDevice {
  id: string;
  name: string;
  type: 'roku' | 'androidtv' | 'appletv' | 'chromecast' | 'unknown';
  ip: string;
  protocol: 'dial' | 'mdns' | 'ssdp';
}

export function discoverRokuDevices(timeoutMs = 3000): Promise<DiscoveredDevice[]> {
  return new Promise((resolve) => {
    const devicesMap = new Map<string, DiscoveredDevice>();
    const client = dgram.createSocket('udp4');

    const message = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\n' +
      'HOST: 239.255.255.250:1900\r\n' +
      'MAN: "ssdp:discover"\r\n' +
      'MX: 2\r\n' +
      'ST: roku:ecp\r\n' +
      '\r\n'
    );

    client.on('error', (err) => {
      console.error('[ssdp] UDP client error:', err);
      try {
        client.close();
      } catch (e) {}
      resolve([]);
    });

    client.on('message', (msg) => {
      const response = msg.toString();
      const locationMatch = response.match(/LOCATION:\s*(http:\/\/[0-9.]+:\d+\/)/i);
      
      if (locationMatch && locationMatch[1]) {
        const urlStr = locationMatch[1];
        const ipMatch = urlStr.match(/http:\/\/([0-9.]+):/);
        
        if (ipMatch && ipMatch[1]) {
          const ip = ipMatch[1];
          if (!devicesMap.has(ip)) {
            devicesMap.set(ip, {
              id: `roku-${ip.replace(/\./g, '-')}`,
              name: 'Roku Device',
              type: 'roku',
              ip: ip,
              protocol: 'ssdp'
            });
          }
        }
      }
    });

    // Send M-SEARCH query
    client.send(message, 0, message.length, 1900, '239.255.255.250', (err) => {
      if (err) {
        console.error('[ssdp] Error sending SSDP search:', err);
        try {
          client.close();
        } catch (e) {}
        resolve([]);
      }
    });

    // Set timeout to close socket and fetch full device-info
    setTimeout(async () => {
      try {
        client.close();
      } catch (e) {}
      
      const discovered: DiscoveredDevice[] = [];
      
      for (const [ip, device] of devicesMap.entries()) {
        try {
          const info = await getDeviceInfo(ip);
          discovered.push({
            id: info.udn || device.id,
            name: info.name,
            type: 'roku',
            ip: ip,
            protocol: 'ssdp'
          });
        } catch (err) {
          console.warn(`[ssdp] Failed to get info for Roku at ${ip}:`, err);
          // Fallback to basic info if ECP request failed
          discovered.push(device);
        }
      }
      
      resolve(discovered);
    }, timeoutMs);
  });
}
