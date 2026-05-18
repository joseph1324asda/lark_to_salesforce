import type { Request, Response } from 'express';
import { ConfigService } from '../services/ConfigService.js';

const service = new ConfigService();
export class ConfigController {
  get(_req: Request, res: Response): void { res.json(service.getAll()); }
  put(req: Request, res: Response): void { service.upsert(req.body); res.json(service.getAll()); }
}
