import { db } from '../db/database.js';
import { SalesforceClient } from '../clients/SalesforceClient.js';
import { FeishuClient } from '../clients/FeishuClient.js';
import { BitableService } from './BitableService.js';
import { MappingService } from './MappingService.js';
import { SyncLogService } from './SyncLogService.js';
import { stableHash } from '../utils/hash.js';
import { errorMessage, withRetry } from '../utils/retry.js';
import type { OrderSyncState, SalesforceOrder, SyncType } from '../types/index.js';

export class SyncService {
  constructor(
    private salesforce = new SalesforceClient(),
    private feishu = new FeishuClient(),
    private bitable = new BitableService(feishu),
    private mapping = new MappingService(),
    private logs = new SyncLogService()
  ) {}

  async fullSync(): Promise<{ successCount: number; failedCount: number }> {
    return this.run('full', () => this.salesforce.queryOrders());
  }

  async incrementalSync(): Promise<{ successCount: number; failedCount: number }> {
    const last = db.prepare('SELECT MAX(last_salesforce_modified_at) as value FROM order_sync_state').get() as { value?: string };
    const since = last.value ? new Date(new Date(last.value).getTime() - 5 * 60_000) : undefined;
    return this.run('incremental', () => this.salesforce.queryOrders(since));
  }

  async syncOne(orderId: string, type: SyncType = 'single'): Promise<{ successCount: number; failedCount: number }> {
    return this.run(type, async () => {
      const order = await this.salesforce.getOrder(orderId);
      return order ? [order] : [];
    });
  }

  async retryFailed(): Promise<{ successCount: number; failedCount: number }> {
    const rows = db.prepare("SELECT salesforce_order_id FROM order_sync_state WHERE sync_status = 'failed'").all() as Array<{ salesforce_order_id: string }>;
    let successCount = 0;
    let failedCount = 0;
    for (const row of rows) {
      const result = await this.syncOne(row.salesforce_order_id, 'retry');
      successCount += result.successCount;
      failedCount += result.failedCount;
    }
    return { successCount, failedCount };
  }

  private async run(type: SyncType, loadOrders: () => Promise<SalesforceOrder[]>): Promise<{ successCount: number; failedCount: number }> {
    const logId = this.logs.start(type);
    let successCount = 0;
    let failedCount = 0;
    try {
      const orders = await withRetry(loadOrders);
      for (const order of orders) {
        try {
          const changed = await this.syncOrder(order);
          if (changed) successCount += 1;
        } catch (error) {
          failedCount += 1;
          this.markFailed(order, errorMessage(error));
        }
      }
      this.logs.finish(logId, { successCount, failedCount, status: failedCount ? 'partial_failed' : 'success' });
      return { successCount, failedCount };
    } catch (error) {
      this.logs.finish(logId, { successCount, failedCount: failedCount + 1, status: 'failed', errorMessage: errorMessage(error) });
      throw error;
    }
  }

  private async syncOrder(order: SalesforceOrder): Promise<boolean> {
    const now = new Date().toISOString();
    const hash = stableHash(order);
    const existing = this.getState(order.Id);
    if (existing?.last_hash === hash && existing.bitable_record_id) {
      this.upsertState(order, { ...existing, sync_status: 'skipped', last_synced_at: now, raw_json: JSON.stringify(order), error_message: undefined });
      return false;
    }
    const recordId = existing?.bitable_record_id ?? await this.bitable.findRecordIdBySalesforceOrderId(order.Id) ?? undefined;
    const fields = this.mapping.toFeishuFields(order, { salesforceUrl: this.salesforce.salesforceUrl(order.Id), syncStatus: 'success', lastSyncedAt: now });
    const saved = await withRetry(async () => recordId ? this.feishu.updateRecord(recordId, fields) : this.feishu.createRecord(fields));
    this.upsertState(order, { bitable_record_id: saved.record_id, last_hash: hash, last_salesforce_modified_at: order.LastModifiedDate, last_synced_at: now, sync_status: 'success', raw_json: JSON.stringify(order), error_message: undefined });
    return true;
  }

  private markFailed(order: SalesforceOrder, message: string): void {
    this.upsertState(order, { last_salesforce_modified_at: order.LastModifiedDate, sync_status: 'failed', error_message: message, raw_json: JSON.stringify(order) });
  }

  private getState(orderId: string): OrderSyncState | undefined {
    return db.prepare('SELECT * FROM order_sync_state WHERE salesforce_order_id = ?').get(orderId) as OrderSyncState | undefined;
  }

  private upsertState(order: SalesforceOrder, values: Partial<OrderSyncState>): void {
    db.prepare(`INSERT INTO order_sync_state (
      salesforce_order_id, salesforce_order_number, bitable_record_id, last_hash, last_salesforce_modified_at, last_synced_at, sync_status, error_message, raw_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(salesforce_order_id) DO UPDATE SET
      salesforce_order_number = excluded.salesforce_order_number,
      bitable_record_id = COALESCE(excluded.bitable_record_id, order_sync_state.bitable_record_id),
      last_hash = COALESCE(excluded.last_hash, order_sync_state.last_hash),
      last_salesforce_modified_at = COALESCE(excluded.last_salesforce_modified_at, order_sync_state.last_salesforce_modified_at),
      last_synced_at = COALESCE(excluded.last_synced_at, order_sync_state.last_synced_at),
      sync_status = excluded.sync_status,
      error_message = excluded.error_message,
      raw_json = excluded.raw_json,
      updated_at = datetime('now')`)
      .run(order.Id, order.OrderNumber, values.bitable_record_id, values.last_hash, values.last_salesforce_modified_at, values.last_synced_at, values.sync_status, values.error_message, values.raw_json);
  }
}
