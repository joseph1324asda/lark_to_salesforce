import { Button, Modal, Space, Table, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { get, post } from '../api/client';
import type { OrderState } from '../types';

export function Orders() {
  const [rows, setRows] = useState<OrderState[]>([]);
  const load = () => get<OrderState[]>('/orders').then(setRows);
  useEffect(() => { void load(); }, []);
  const retry = async (id: string) => { await post(`/sync/order/${id}`); message.success('重新同步完成'); await load(); };
  return <Table rowKey="id" dataSource={rows} columns={[
    { title:'订单编号', dataIndex:'salesforce_order_number' },
    { title:'Salesforce订单ID', dataIndex:'salesforce_order_id' },
    { title:'Salesforce更新时间', dataIndex:'last_salesforce_modified_at' },
    { title:'同步状态', dataIndex:'sync_status', render: (v:string) => <Tag color={v === 'failed' ? 'red' : v === 'success' ? 'green' : 'blue'}>{v}</Tag> },
    { title:'最后同步时间', dataIndex:'last_synced_at' },
    { title:'错误原因', dataIndex:'error_message' },
    { title:'操作', render: (_: unknown, r: OrderState) => <Space><Button onClick={() => retry(r.salesforce_order_id)}>重新同步</Button><Button onClick={() => Modal.info({ title:'原始JSON', width: 800, content:<pre>{r.raw_json}</pre> })}>查看JSON</Button><Button href={`https://login.salesforce.com/${r.salesforce_order_id}`} target="_blank">打开Salesforce</Button><Button href={r.feishu_record_url} target="_blank" disabled={!r.feishu_record_url}>打开飞书记录</Button></Space> }
  ]} />;
}
