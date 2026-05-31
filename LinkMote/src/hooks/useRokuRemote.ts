import { useCallback } from 'react';
import { sendDeviceKey, launchDeviceApp } from '../services/api';

// ─── Keymap (client-side copy for native mode — server does this in web mode) ─
const ROKU_KEYMAP: Record<string, string> = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  ok: 'Select',
  back: 'Back',
  home: 'Home',
  options: 'Info',
  'vol-up': 'VolumeUp',
  'vol-down': 'VolumeDown',
  mute: 'VolumeMute',
  power: 'Power',
};

export interface ConnectedDevice {
  id: string;
  name: string;
  type: 'roku' | 'androidtv' | 'appletv' | 'chromecast' | 'unknown';
  ip: string;
  protocol: 'dial' | 'mdns' | 'ssdp';
  isPoweredOn: boolean;
}

export function useRokuRemote(activeDevice: ConnectedDevice | null) {
  const sendKey = useCallback(
    async (key: string) => {
      if (!activeDevice) return;
      // Translate the UI key to the Roku ECP key (works for both native direct and web/proxy mode)
      const rokuKey = ROKU_KEYMAP[key.toLowerCase()] ?? key;
      try {
        await sendDeviceKey(activeDevice.ip, rokuKey);
      } catch (err) {
        console.error('[remote-hook] Failed to send key:', err);
      }
    },
    [activeDevice]
  );

  const launchApp = useCallback(
    async (appId: string) => {
      if (!activeDevice) return;
      try {
        await launchDeviceApp(activeDevice.ip, appId);
      } catch (err) {
        console.error('[remote-hook] Failed to launch app:', err);
      }
    },
    [activeDevice]
  );

  const togglePower = useCallback(async () => {
    await sendKey('power');
  }, [sendKey]);

  const adjustVolumeDelta = useCallback(
    async (prev: number, curr: number) => {
      if (!activeDevice) return;
      const diff = curr - prev;
      if (diff === 0) return;
      const steps = Math.max(1, Math.round(Math.abs(diff) / 5));
      const key = diff > 0 ? 'vol-up' : 'vol-down';
      for (let i = 0; i < steps; i++) {
        await sendKey(key);
        if (i < steps - 1) await new Promise((r) => setTimeout(r, 80));
      }
    },
    [activeDevice, sendKey]
  );

  return { sendKey, launchApp, togglePower, adjustVolumeDelta };
}
