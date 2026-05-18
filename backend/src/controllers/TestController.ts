import type { Request, Response, NextFunction } from 'express';
import { SalesforceClient } from '../clients/SalesforceClient.js';
import { FeishuClient } from '../clients/FeishuClient.js';
import { SyncLogService } from '../services/SyncLogService.js';

export class TestController {
  salesforce = async (_req: Request, res: Response, next: NextFunction) => { try { res.json(await new SalesforceClient().testConnection()); } catch (e) { next(e); } };
  feishu = async (_req: Request, res: Response, next: NextFunction) => { try { res.json(await new FeishuClient().testConnection()); } catch (e) { next(e); } };
  logs = (_req: Request, res: Response) => { res.json(new SyncLogService().list()); };
}
