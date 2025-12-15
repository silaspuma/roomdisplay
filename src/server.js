import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';
import { StateManager } from './state.js';
import { ProcessManager } from './process-manager.js';
import { PowerManager } from './power-manager.js';
import { SpotifyManager } from './spotify-manager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const stateManager = new StateManager();
const processManager = new ProcessManager();
const powerManager = new PowerManager();
const spotifyManager = new SpotifyManager(stateManager);

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = join(__dirname, '../uploads');

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, '../public')));
app.use('/uploads', express.static(UPLOAD_DIR));

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', data: stateManager.getState() }));

  ws.on('message', async (message) => {
    try {
      const { type, data } = JSON.parse(message);
      await handleCommand(type, data);
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
});

stateManager.onChange((state) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'state', data: state }));
    }
  });
});

async function handleCommand(type, data) {
  if (stateManager.getState().isSleeping && type !== 'wake') {
    return;
  }

  switch (type) {
    case 'mode':
      if (data && ['dashboard', 'music', 'airplay', 'cast', 'image', 'off'].includes(data.mode)) {
        const success = stateManager.setMode(data.mode);
        if (success) {
          await processManager.handleMode(data.mode);
        }
      }
      break;
    case 'sleep':
      stateManager.setSleeping(true);
      await powerManager.suspend();
      break;
    case 'wake':
      stateManager.setSleeping(false);
      await powerManager.wake();
      break;
    case 'schedule':
      if (data) {
        stateManager.updateSchedule(data);
      }
      break;
  }
}

app.get('/api/state', (req, res) => {
  res.json(stateManager.getState());
});

app.post('/api/mode', async (req, res) => {
  const { mode } = req.body;
  if (!mode || !['dashboard', 'music', 'airplay', 'cast', 'image', 'off'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  await handleCommand('mode', { mode });
  res.json({ success: true });
});

app.post('/api/sleep', async (req, res) => {
  await handleCommand('sleep');
  res.json({ success: true });
});

app.post('/api/wake', async (req, res) => {
  await handleCommand('wake');
  res.json({ success: true });
});

app.post('/api/schedule', async (req, res) => {
  const { weekdayWakeTime, sleepTime, enabled } = req.body;
  await handleCommand('schedule', { weekdayWakeTime, sleepTime, enabled });
  res.json({ success: true });
});

app.post('/api/image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `display-${Date.now()}.jpg`;
    const filepath = join(UPLOAD_DIR, filename);
    
    writeFileSync(filepath, buffer);
    
    res.json({ success: true, url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

spotifyManager.startPolling();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
