import type { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/SyncService.js';

const service = new SyncService();
export class SyncController {
  full = async (_req: Request, res: Response, next: NextFunction) => { try { res.json(await service.fullSync()); } catch (e) { next(e); } };
  incremental = async (_req: Request, res: Response, next: NextFunction) => { try { res.json(await service.incrementalSync()); } catch (e) { next(e); } };
  one = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await service.syncOne(req.params.salesforceOrderId)); } catch (e) { next(e); } };
  retry = async (_req: Request, res: Response, next: NextFunction) => { try { res.json(await service.retryFailed()); } catch (e) { next(e); } };
}
