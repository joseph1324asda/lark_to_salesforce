import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { ConfigService } from '../services/ConfigService.js';
import type { SalesforceOrder } from '../types/index.js';

interface TokenResponse { access_token: string; instance_url: string; token_type: string }
interface QueryResponse<T> { records: T[]; done: boolean; nextRecordsUrl?: string; totalSize: number }

const ORDER_FIELDS = ['Id','OrderNumber','Status','AccountId','Account.Name','EffectiveDate','EndDate','TotalAmount','ActivatedDate','CreatedDate','LastModifiedDate','OwnerId','Description'];

export class SalesforceClient {
  private token?: TokenResponse;
  private http?: AxiosInstance;
  constructor(private config = new ConfigService()) {}

  async testConnection(): Promise<{ ok: boolean; instanceUrl: string }> {
    await this.ensureAuthenticated();
    const res = await this.http!.get('/services/data');
    return { ok: Array.isArray(res.data), instanceUrl: this.token!.instance_url };
  }

  async queryOrders(modifiedSince?: Date): Promise<SalesforceOrder[]> {
    await this.ensureAuthenticated();
    const where = modifiedSince ? ` WHERE LastModifiedDate >= ${modifiedSince.toISOString()}` : '';
    const soql = `SELECT ${ORDER_FIELDS.join(', ')} FROM Order${where} ORDER BY LastModifiedDate ASC`;
    const first = await this.http!.get<QueryResponse<SalesforceOrder>>(`/services/data/${this.apiVersion()}/query`, { params: { q: soql } });
    return this.collect(first.data);
  }

  async getOrder(id: string): Promise<SalesforceOrder | undefined> {
    await this.ensureAuthenticated();
    const soql = `SELECT ${ORDER_FIELDS.join(', ')} FROM Order WHERE Id = '${id.replaceAll("'", "\\'")}'`;
    const res = await this.http!.get<QueryResponse<SalesforceOrder>>(`/services/data/${this.apiVersion()}/query`, { params: { q: soql } });
    return res.data.records[0];
  }

  salesforceUrl(orderId: string): string {
    const instanceUrl = this.token?.instance_url ?? this.config.get('SALESFORCE_INSTANCE_URL');
    return instanceUrl ? `${instanceUrl}/${orderId}` : '';
  }

  private async collect<T>(page: QueryResponse<T>): Promise<T[]> {
    const records = [...page.records];
    let next = page.nextRecordsUrl;
    while (!page.done && next) {
      const res = await this.http!.get<QueryResponse<T>>(next);
      records.push(...res.data.records);
      next = res.data.nextRecordsUrl;
      page.done = res.data.done;
    }
    return records;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.token && this.http) return;
    this.token = await this.getToken();
    this.http = axios.create({ baseURL: this.token.instance_url, headers: { Authorization: `Bearer ${this.token.access_token}` }, timeout: 30000 });
  }

  private async getToken(): Promise<TokenResponse> {
    const refreshToken = this.config.get('SALESFORCE_REFRESH_TOKEN');
    if (refreshToken) return this.refreshTokenFlow(refreshToken);
    return this.jwtBearerFlow();
  }

  private async jwtBearerFlow(): Promise<TokenResponse> {
    const loginUrl = this.config.get('SALESFORCE_LOGIN_URL');
    const privateKey = this.privateKey();
    const assertion = jwt.sign({ iss: this.config.get('SALESFORCE_CLIENT_ID'), sub: this.config.get('SALESFORCE_USERNAME'), aud: loginUrl, exp: Math.floor(Date.now() / 1000) + 180 }, privateKey, { algorithm: 'RS256' });
    const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion });
    const res = await axios.post<TokenResponse>(`${loginUrl}/services/oauth2/token`, body, { timeout: 30000 });
    return res.data;
  }

  private async refreshTokenFlow(refreshToken: string): Promise<TokenResponse> {
    const loginUrl = this.config.get('SALESFORCE_LOGIN_URL');
    const body = new URLSearchParams({ grant_type: 'refresh_token', client_id: this.config.get('SALESFORCE_CLIENT_ID'), refresh_token: refreshToken });
    const secret = this.config.get('SALESFORCE_CLIENT_SECRET');
    if (secret) body.set('client_secret', secret);
    const res = await axios.post<TokenResponse>(`${loginUrl}/services/oauth2/token`, body, { timeout: 30000 });
    return res.data;
  }

  private privateKey(): string {
    const inline = this.config.get('SALESFORCE_PRIVATE_KEY');
    if (inline) return inline.replace(/\\n/g, '\n');
    return fs.readFileSync(this.config.get('SALESFORCE_PRIVATE_KEY_PATH'), 'utf8');
  }

  private apiVersion(): string {
    const value = this.config.get('SALESFORCE_API_VERSION') || 'v60.0';
    return value.startsWith('v') ? value : `v${value}`;
  }
}
