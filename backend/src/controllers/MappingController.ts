import type { Request, Response } from 'express';
import { MappingService } from '../services/MappingService.js';

const service = new MappingService();
export class MappingController {
  get(_req: Request, res: Response): void { res.json(service.list()); }
  put(req: Request, res: Response): void { res.json(service.replace(req.body.mappings ?? req.body)); }
}
