export interface OrderState { id:number; salesforce_order_id:string; salesforce_order_number?:string; bitable_record_id?:string; last_salesforce_modified_at?:string; last_synced_at?:string; sync_status:string; raw_json?:string; error_message?:string; feishu_record_url?:string; }
export interface SyncLog { id:number; sync_type:string; started_at:string; ended_at?:string; success_count:number; failed_count:number; status:string; error_message?:string; feishu_record_url?:string; }
export interface Mapping { id?:number; salesforce_field:string; feishu_field:string; enabled:number; }
