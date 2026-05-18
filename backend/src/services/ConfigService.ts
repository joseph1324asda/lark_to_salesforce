import { db } from '../db/database.js';
import { env } from '../config/env.js';

export class ConfigService {
  getAll(maskSecrets = true): Record<string, string> {
    const rows = db.prepare('SELECT key, value, is_secret FROM app_config').all() as Array<{key:string; value:string; is_secret:number}>;
    const values: Record<string, string> = {
      SALESFORCE_CLIENT_ID: env.salesforce.clientId,
      SALESFORCE_USERNAME: env.salesforce.username,
      SALESFORCE_PRIVATE_KEY_PATH: env.salesforce.privateKeyPath,
      SALESFORCE_LOGIN_URL: env.salesforce.loginUrl,
      SALESFORCE_API_VERSION: env.salesforce.apiVersion,
      SALESFORCE_INSTANCE_URL: env.salesforce.instanceUrl,
      SALESFORCE_REFRESH_TOKEN: env.salesforce.refreshToken,
      SALESFORCE_CLIENT_SECRET: env.salesforce.clientSecret,
      FEISHU_APP_ID: env.feishu.appId,
      FEISHU_APP_SECRET: env.feishu.appSecret,
      FEISHU_BITABLE_APP_TOKEN: env.feishu.bitableAppToken,
      FEISHU_BITABLE_TABLE_ID: env.feishu.bitableTableId,
      SYNC_CRON: env.syncCron
    };
    for (const row of rows) values[row.key] = maskSecrets && row.is_secret ? '******' : (row.value ?? '');
    return values;
  }

  get(key: string): string {
    const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? this.getAll(false)[key] ?? '';
  }

  upsert(values: Record<string, string>): void {
    const secretKeys = new Set(['SALESFORCE_PRIVATE_KEY', 'SALESFORCE_REFRESH_TOKEN', 'SALESFORCE_CLIENT_SECRET', 'FEISHU_APP_SECRET']);
    const stmt = db.prepare(`INSERT INTO app_config (key, value, is_secret, updated_at) VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_secret = excluded.is_secret, updated_at = datetime('now')`);
    const tx = db.transaction(() => Object.entries(values).forEach(([key, value]) => {
      if (value !== '******') stmt.run(key, value, secretKeys.has(key) ? 1 : 0);
    }));
    tx();
  }
}
