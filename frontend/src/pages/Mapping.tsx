import { Button, Form, Input, Switch, Table, message } from 'antd';
import { useEffect, useState } from 'react';
import { get, put } from '../api/client';
import type { Mapping as MappingRow } from '../types';

export function Mapping() {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const load = () => get<MappingRow[]>('/mapping').then(setRows);
  useEffect(() => { void load(); }, []);
  const save = async () => { setRows(await put<MappingRow[]>('/mapping', rows)); message.success('字段映射已保存'); };
  return <><Button type="primary" onClick={save} style={{ marginBottom: 16 }}>保存映射</Button><Table rowKey="salesforce_field" dataSource={rows} pagination={false} columns={[
    { title:'Salesforce 字段', dataIndex:'salesforce_field', render: (v:string, _r: MappingRow, i: number) => <Input value={v} onChange={(e: { target: { value: string } }) => setRows(rows.map((r: MappingRow, idx: number) => idx === i ? { ...r, salesforce_field: e.target.value } : r))} /> },
    { title:'飞书字段', dataIndex:'feishu_field', render: (v:string, _r: MappingRow, i: number) => <Input value={v} onChange={(e: { target: { value: string } }) => setRows(rows.map((r: MappingRow, idx: number) => idx === i ? { ...r, feishu_field: e.target.value } : r))} /> },
    { title:'启用', dataIndex:'enabled', render: (v:number, _r: MappingRow, i: number) => <Switch checked={Boolean(v)} onChange={(checked: boolean) => setRows(rows.map((r: MappingRow, idx: number) => idx === i ? { ...r, enabled: checked ? 1 : 0 } : r))} /> }
  ]} /></>;
}
