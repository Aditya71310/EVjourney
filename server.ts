import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { connectDatabase } from './server/config/db.ts';
import { ensureDemoDataSeeded } from './server/services/dataService.ts';
import authRoutes from './server/routes/authRoutes.ts';
import vehicleRoutes from './server/routes/vehicleRoutes.ts';
import journeyRoutes from './server/routes/journeyRoutes.ts';
import timelineRoutes from './server/routes/timelineRoutes.ts';
import userRoutes from './server/routes/userRoutes.ts';
import socialRoutes from './server/routes/socialRoutes.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  await connectDatabase();
  await ensureDemoDataSeeded();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ev-journey' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/journeys', journeyRoutes);
  app.use('/api', timelineRoutes);
  app.use('/api', userRoutes);
  app.use('/api', socialRoutes);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] EV Journey running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
