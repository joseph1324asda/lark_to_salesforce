import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { migrate } from './db/database.js';
import { apiRouter } from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startScheduler } from './scheduler/syncScheduler.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

migrate();
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
app.use('/api', apiRouter);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(frontendDist, 'index.html')));
}
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API listening on ${env.port}`);
  startScheduler();
});
