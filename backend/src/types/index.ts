export type SyncStatus = 'success' | 'failed' | 'skipped' | 'running';
export type SyncType = 'full' | 'incremental' | 'single' | 'retry';

export interface SalesforceOrder {
  Id: string;
  OrderNumber?: string;
  Status?: string;
  AccountId?: string;
  Account?: { Name?: string } | null;
  EffectiveDate?: string;
  EndDate?: string;
  TotalAmount?: number;
  ActivatedDate?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
  OwnerId?: string;
  Description?: string;
  attributes?: { url?: string; type?: string };
}

export interface FieldMapping {
  id?: number;
  salesforce_field: string;
  feishu_field: string;
  enabled: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderSyncState {
  id: number;
  salesforce_order_id: string;
  salesforce_order_number?: string;
  bitable_record_id?: string;
  last_hash?: string;
  last_salesforce_modified_at?: string;
  last_synced_at?: string;
  sync_status: SyncStatus;
  error_message?: string;
  raw_json?: string;
  created_at: string;
  updated_at: string;
}
