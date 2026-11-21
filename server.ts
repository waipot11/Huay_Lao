import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import {
  app,
  runFacebookAutoPostCheck,
  runTelegramAutoScheduler,
  runPostDrawLiveSyncCheck,
  syncAllLotteriesFromLive,
} from './src/server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Facebook Automatic schedule checker (runs in background every 60s)
setInterval(() => {
  void runFacebookAutoPostCheck();
}, 60000);

// Telegram Automatic Notification Checker (completely independent from Facebook toggle, checks every 30s)
setInterval(() => {
  void runTelegramAutoScheduler({ source: 'interval-30s' });
}, 30000);

// Live Lottery Result Auto-Fetcher (polls post-draw windows every 60s; internal 3-min cooldown per lottery)
setInterval(() => {
  void runPostDrawLiveSyncCheck();
}, 60000);

// Run initial Telegram & Live Result sync 3 seconds after startup
setTimeout(() => {
  void syncAllLotteriesFromLive({ force: true });
  void runTelegramAutoScheduler({ source: 'startup' });
}, 3000);

// Setup Vite middleware in dev or static files in production (non-Vercel Node server)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
