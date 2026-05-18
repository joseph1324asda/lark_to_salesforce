import { db } from '../db/database.js';
import type { FieldMapping, SalesforceOrder } from '../types/index.js';

export class MappingService {
  list(): FieldMapping[] {
    return db.prepare('SELECT * FROM field_mapping ORDER BY id').all() as FieldMapping[];
  }

  replace(mappings: FieldMapping[]): FieldMapping[] {
    const stmt = db.prepare(`INSERT INTO field_mapping (salesforce_field, feishu_field, enabled, updated_at) VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(salesforce_field) DO UPDATE SET feishu_field = excluded.feishu_field, enabled = excluded.enabled, updated_at = datetime('now')`);
    const tx = db.transaction(() => mappings.forEach((m) => stmt.run(m.salesforce_field, m.feishu_field, m.enabled ? 1 : 0)));
    tx();
    return this.list();
  }

  toFeishuFields(order: SalesforceOrder, context: { salesforceUrl: string; syncStatus: string; lastSyncedAt: string }): Record<string, unknown> {
    const raw = JSON.stringify(order);
    const computed: Record<string, unknown> = { SalesforceUrl: context.salesforceUrl, RawJson: raw, SyncStatus: context.syncStatus, LastSyncedAt: context.lastSyncedAt };
    const fields: Record<string, unknown> = {};
    for (const mapping of this.list().filter((m) => m.enabled)) {
      fields[mapping.feishu_field] = computed[mapping.salesforce_field] ?? getPath(order, mapping.salesforce_field);
    }
    return fields;
  }
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);
}
