import cron from 'node-cron';
import { env } from '../config/env.js';
import { SyncService } from '../services/SyncService.js';

export function startScheduler(): void {
  if (!cron.validate(env.syncCron)) {
    console.warn(`Invalid SYNC_CRON '${env.syncCron}', scheduler disabled`);
    return;
  }
  cron.schedule(env.syncCron, async () => {
    try {
      await new SyncService().incrementalSync();
    } catch (error) {
      console.error('Scheduled incremental sync failed', error);
    }
  });
}
