import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '../services/ConfigService.js';

interface TenantTokenResponse { code: number; msg: string; tenant_access_token: string; expire: number }
export interface BitableRecord { record_id: string; fields: Record<string, unknown> }

export class FeishuClient {
  private token?: { value: string; expiresAt: number };
  private http: AxiosInstance;
  constructor(private config = new ConfigService()) {
    this.http = axios.create({ baseURL: 'https://open.feishu.cn/open-apis', timeout: 30000 });
  }

  async testConnection(): Promise<{ ok: boolean }> {
    await this.listRecords(1);
    return { ok: true };
  }

  async listRecords(pageSize = 100, pageToken?: string): Promise<{ records: BitableRecord[]; pageToken?: string; hasMore: boolean }> {
    const res = await this.http.get(`/bitable/v1/apps/${this.config.get('FEISHU_BITABLE_APP_TOKEN')}/tables/${this.config.get('FEISHU_BITABLE_TABLE_ID')}/records`, {
      headers: await this.authHeader(),
      params: { page_size: pageSize, page_token: pageToken }
    });
    const data = res.data.data ?? {};
    return { records: data.items ?? [], pageToken: data.page_token, hasMore: Boolean(data.has_more) };
  }

  async createRecord(fields: Record<string, unknown>): Promise<BitableRecord> {
    const res = await this.http.post(`/bitable/v1/apps/${this.config.get('FEISHU_BITABLE_APP_TOKEN')}/tables/${this.config.get('FEISHU_BITABLE_TABLE_ID')}/records`, { fields }, { headers: await this.authHeader() });
    return res.data.data.record;
  }

  async updateRecord(recordId: string, fields: Record<string, unknown>): Promise<BitableRecord> {
    const res = await this.http.put(`/bitable/v1/apps/${this.config.get('FEISHU_BITABLE_APP_TOKEN')}/tables/${this.config.get('FEISHU_BITABLE_TABLE_ID')}/records/${recordId}`, { fields }, { headers: await this.authHeader() });
    return res.data.data.record;
  }

  async batchUpdate(records: Array<{ record_id: string; fields: Record<string, unknown> }>): Promise<void> {
    if (!records.length) return;
    await this.http.post(`/bitable/v1/apps/${this.config.get('FEISHU_BITABLE_APP_TOKEN')}/tables/${this.config.get('FEISHU_BITABLE_TABLE_ID')}/records/batch_update`, { records }, { headers: await this.authHeader() });
  }

  private async authHeader(): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await this.getTenantAccessToken()}` };
  }

  private async getTenantAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const res = await this.http.post<TenantTokenResponse>('/auth/v3/tenant_access_token/internal', { app_id: this.config.get('FEISHU_APP_ID'), app_secret: this.config.get('FEISHU_APP_SECRET') });
    if (res.data.code !== 0) throw new Error(`Feishu token error: ${res.data.msg}`);
    this.token = { value: res.data.tenant_access_token, expiresAt: Date.now() + res.data.expire * 1000 };
    return this.token.value;
  }
}
