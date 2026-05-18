import { FeishuClient } from '../clients/FeishuClient.js';

export class BitableService {
  constructor(private feishu = new FeishuClient()) {}

  async findRecordIdBySalesforceOrderId(orderId: string, uniqueField = 'Salesforce订单ID'): Promise<string | undefined> {
    let pageToken: string | undefined;
    do {
      const page = await this.feishu.listRecords(500, pageToken);
      const match = page.records.find((record) => record.fields?.[uniqueField] === orderId);
      if (match) return match.record_id;
      pageToken = page.hasMore ? page.pageToken : undefined;
    } while (pageToken);
    return undefined;
  }
}
