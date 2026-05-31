import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { discoverRokuDevices } from './discovery/ssdp';
import { getDeviceInfo, getApps, launchApp, sendKey } from './drivers/roku/ecp';
import { ROKU_KEYMAP } from './drivers/roku/keymap';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// HTTP server instance
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  console.log('[ws] Client connected');
  
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to LinkMote Proxy' }));

  ws.on('message', (message) => {
    console.log('[ws] Received:', message.toString());
  });

  ws.on('close', () => {
    console.log('[ws] Client disconnected');
  });
});

// Upgrade HTTP to WS
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Helper to broadcast WS messages
function broadcast(data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// ─── API Endpoints ───────────────────────────────────────────────────────────

// SSDP Discovery
app.get('/api/discover', async (req, res) => {
  console.log('[api] Starting network SSDP scan...');
  try {
    const devices = await discoverRokuDevices(3000);
    console.log(`[api] SSDP scan finished. Found ${devices.length} device(s).`);
    broadcast({ type: 'discovery', devices });
    res.json(devices);
  } catch (error: any) {
    console.error('[api] SSDP discovery failed:', error);
    res.status(500).json({ error: 'SSDP scan failed', details: error.message });
  }
});

// Query device info
app.get('/api/device/:ip/info', async (req, res) => {
  const { ip } = req.params;
  try {
    const info = await getDeviceInfo(ip);
    res.json(info);
  } catch (error: any) {
    console.error(`[api] Query device info failed for ${ip}:`, error);
    res.status(500).json({ error: 'Failed to query device info', details: error.message });
  }
});

// Query device apps
app.get('/api/device/:ip/apps', async (req, res) => {
  const { ip } = req.params;
  try {
    const apps = await getApps(ip);
    res.json(apps);
  } catch (error: any) {
    console.error(`[api] Query apps failed for ${ip}:`, error);
    res.status(500).json({ error: 'Failed to query apps', details: error.message });
  }
});

// Send Keypress
app.post('/api/device/:ip/key', async (req, res) => {
  const { ip } = req.params;
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }

  // Translate key to Roku ECP value
  const rokuKey = ROKU_KEYMAP[key.toLowerCase()] || key;

  console.log(`[api] Sending key press "${rokuKey}" to Roku at ${ip} (original UI key: "${key}")`);

  try {
    await sendKey(ip, rokuKey);
    broadcast({ type: 'key_ack', key: rokuKey });
    res.json({ success: true, key: rokuKey });
  } catch (error: any) {
    console.error(`[api] Send keypress failed for ${ip}:`, error);
    res.status(500).json({ error: 'Failed to send keypress', details: error.message });
  }
});

// Launch App
app.post('/api/device/:ip/launch', async (req, res) => {
  const { ip } = req.params;
  const { appId } = req.body;

  if (!appId) {
    return res.status(400).json({ error: 'appId is required' });
  }

  console.log(`[api] Launching App "${appId}" on Roku at ${ip}`);

  try {
    await launchApp(ip, appId);
    broadcast({ type: 'launch_ack', appId });
    res.json({ success: true, appId });
  } catch (error: any) {
    console.error(`[api] Launch app failed for ${ip}:`, error);
    res.status(500).json({ error: 'Failed to launch app', details: error.message });
  }
});

// Health check / general info
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    service: 'LinkMote Local Proxy',
    time: new Date().toISOString(),
  });
});

// Start listening on all network interfaces
server.listen(Number(port), '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LinkMote Node.js proxy server running on:`);
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://0.0.0.0:${port}`);
  console.log(`======================================================\n`);
});
