import { useCallback } from 'react';
import { sendDeviceKey, launchDeviceApp } from '../services/api';

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
      try {
        await sendDeviceKey(activeDevice.ip, key);
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
      
      // Calculate how many presses to send. Typically we map 5 points on the slider to 1 ECP keypress
      const steps = Math.max(1, Math.round(Math.abs(diff) / 5));
      const key = diff > 0 ? 'vol-up' : 'vol-down';
      
      console.log(`[remote-hook] Volume delta: ${diff}. Sending ${steps} keypresses of "${key}".`);
      
      for (let i = 0; i < steps; i++) {
        await sendKey(key);
        // Small delay to ensure Roku receives and processes all keypresses
        if (i < steps - 1) {
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
      }
    },
    [activeDevice, sendKey]
  );

  return {
    sendKey,
    launchApp,
    togglePower,
    adjustVolumeDelta,
  };
}
