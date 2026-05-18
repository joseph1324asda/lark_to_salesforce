import { db } from '../db/database.js';
import type { SyncType } from '../types/index.js';

export class SyncLogService {
  start(syncType: SyncType): number {
    const res = db.prepare('INSERT INTO sync_log (sync_type, started_at, status) VALUES (?, datetime(\'now\'), ?)').run(syncType, 'running');
    return Number(res.lastInsertRowid);
  }

  finish(id: number, values: { successCount: number; failedCount: number; status: string; errorMessage?: string }): void {
    db.prepare(`UPDATE sync_log SET ended_at = datetime('now'), success_count = ?, failed_count = ?, status = ?, error_message = ? WHERE id = ?`)
      .run(values.successCount, values.failedCount, values.status, values.errorMessage, id);
  }

  list(limit = 100): unknown[] {
    return db.prepare('SELECT * FROM sync_log ORDER BY id DESC LIMIT ?').all(limit);
  }
}
