import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });
export const db = new Database(env.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_sync_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salesforce_order_id TEXT NOT NULL UNIQUE,
      salesforce_order_number TEXT,
      bitable_record_id TEXT,
      last_hash TEXT,
      last_salesforce_modified_at TEXT,
      last_synced_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'running',
      error_message TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      success_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS field_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salesforce_field TEXT NOT NULL UNIQUE,
      feishu_field TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      is_secret INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  seedMappings();
}

function seedMappings(): void {
  const defaults = [
    ['Id', 'Salesforce订单ID'], ['OrderNumber', '订单编号'], ['Status', '订单状态'],
    ['Account.Name', '客户名称'], ['AccountId', '客户ID'], ['TotalAmount', '订单金额'],
    ['EffectiveDate', '生效日期'], ['EndDate', '结束日期'], ['ActivatedDate', '激活日期'],
    ['CreatedDate', 'Salesforce创建时间'], ['LastModifiedDate', 'Salesforce更新时间'],
    ['OwnerId', '负责人'], ['Description', '描述'], ['SalesforceUrl', 'Salesforce链接'],
    ['RawJson', '原始JSON'], ['SyncStatus', '同步状态'], ['LastSyncedAt', '最后同步时间']
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO field_mapping (salesforce_field, feishu_field, enabled) VALUES (?, ?, 1)');
  const tx = db.transaction(() => defaults.forEach(([sf, fsName]) => stmt.run(sf, fsName)));
  tx();
}
