import { useState, useEffect, useCallback, useRef } from 'react';
import type { DiscoveredDevice } from '../components/DeviceDiscovery';
import { discoverDevices, connectManualDevice, isNative } from '../services/api';

export function useDeviceDiscovery() {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'found' | 'empty' | 'error'>('idle');
  const wsRef = useRef<WebSocket | null>(null);

  const startScan = useCallback(async () => {
    setScanStatus('scanning');
    setDevices([]);
    try {
      const results = await discoverDevices();
      setDevices(results);
      setScanStatus(results.length > 0 ? 'found' : 'empty');
    } catch (err) {
      console.error('[discovery-hook] Scan failed:', err);
      setScanStatus('error');
    }
  }, []);

  const connectManual = useCallback(async (ip: string): Promise<DiscoveredDevice> => {
    try {
      const device = await connectManualDevice(ip);
      setDevices((prev) => {
        const filtered = prev.filter((d) => d.ip !== ip);
        return [...filtered, device];
      });
      setScanStatus('found');
      return device;
    } catch (err) {
      console.error('[discovery-hook] Manual connection failed:', err);
      throw err;
    }
  }, []);

  // WebSocket — only in web/proxy mode. Native mode has no server proxy running.
  useEffect(() => {
    if (isNative()) {
      console.log('[ws-client] Skipping WebSocket — running in native mobile mode.');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    let active = true;
    let timer: any = null;

    const connectWs = () => {
      if (!active) return;
      console.log('[ws-client] Connecting to', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'discovery') {
            const receivedDevices = data.devices as DiscoveredDevice[];
            setDevices(receivedDevices);
            setScanStatus(receivedDevices.length > 0 ? 'found' : 'empty');
          }
        } catch (e) {
          console.error('[ws-client] Error parsing message:', e);
        }
      };

      ws.onclose = () => {
        if (!active) return;
        console.log('[ws-client] Closed. Reconnecting in 3s...');
        timer = setTimeout(connectWs, 3000);
      };

      ws.onerror = (err) => {
        console.error('[ws-client] Error:', err);
      };
    };

    connectWs();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  // Auto-scan on mount
  useEffect(() => {
    startScan();
  }, [startScan]);

  return { devices, scanStatus, rescan: startScan, connectManual };
}
