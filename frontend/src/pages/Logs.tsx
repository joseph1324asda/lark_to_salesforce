import { Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { get } from '../api/client';
import type { SyncLog } from '../types';

export function Logs() {
  const [rows, setRows] = useState<SyncLog[]>([]);
  useEffect(() => { void get<SyncLog[]>('/sync/logs').then(setRows); }, []);
  return <Table rowKey="id" dataSource={rows} columns={[
    { title:'同步类型', dataIndex:'sync_type' }, { title:'开始时间', dataIndex:'started_at' }, { title:'结束时间', dataIndex:'ended_at' },
    { title:'成功数量', dataIndex:'success_count' }, { title:'失败数量', dataIndex:'failed_count' },
    { title:'状态', dataIndex:'status', render: (v:string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v}</Tag> }, { title:'错误原因', dataIndex:'error_message' }
  ]} />;
}
