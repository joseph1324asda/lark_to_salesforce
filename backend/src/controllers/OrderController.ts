import type { Request, Response } from 'express';
import { db } from '../db/database.js';
import { ConfigService } from '../services/ConfigService.js';

export class OrderController {
  list(_req: Request, res: Response): void {
    const rows = db.prepare('SELECT * FROM order_sync_state ORDER BY COALESCE(last_salesforce_modified_at, updated_at) DESC LIMIT 500').all() as Array<Record<string, unknown>>;
    const config = new ConfigService();
    const appToken = config.get('FEISHU_BITABLE_APP_TOKEN');
    const tableId = config.get('FEISHU_BITABLE_TABLE_ID');
    res.json(rows.map((row) => ({ ...row, feishu_record_url: row.bitable_record_id && appToken && tableId ? `https://feishu.cn/base/${appToken}?table=${tableId}&record=${row.bitable_record_id}` : undefined })));
  }

  status(_req: Request, res: Response): void {
    const total = (db.prepare('SELECT COUNT(*) as count FROM order_sync_state').get() as { count: number }).count;
    const failed = (db.prepare("SELECT COUNT(*) as count FROM order_sync_state WHERE sync_status = 'failed'").get() as { count: number }).count;
    const today = db.prepare("SELECT COUNT(*) as count FROM order_sync_state WHERE date(created_at) = date('now')").get() as { count: number };
    const updatedToday = db.prepare("SELECT COUNT(*) as count FROM order_sync_state WHERE date(updated_at) = date('now')").get() as { count: number };
    const lastLog = db.prepare('SELECT * FROM sync_log ORDER BY id DESC LIMIT 1').get();
    res.json({ totalOrders: total, failedCount: failed, todayNew: today.count, todayUpdated: updatedToday.count, lastSync: lastLog });
  }
}
