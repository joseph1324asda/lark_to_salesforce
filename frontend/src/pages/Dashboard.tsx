import { Button, Card, Col, message, Row, Space, Statistic } from 'antd';
import { useEffect, useState } from 'react';
import { get, post } from '../api/client';

interface Status { totalOrders:number; failedCount:number; todayNew:number; todayUpdated:number; lastSync?: { started_at:string; status:string } }

export function Dashboard() {
  const [status, setStatus] = useState<Status>();
  const [loading, setLoading] = useState(false);
  const load = () => get<Status>('/status').then(setStatus);
  useEffect(() => { void load(); }, []);
  const run = async (label: string, action: () => Promise<unknown>) => {
    setLoading(true);
    try { await action(); message.success(`${label}完成`); await load(); } catch (e) { message.error(`${label}失败: ${String(e)}`); } finally { setLoading(false); }
  };
  return <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Row gutter={16}>
      <Col span={6}><Card><Statistic title="订单总数" value={status?.totalOrders ?? 0} /></Card></Col>
      <Col span={6}><Card><Statistic title="今日新增" value={status?.todayNew ?? 0} /></Card></Col>
      <Col span={6}><Card><Statistic title="今日更新" value={status?.todayUpdated ?? 0} /></Card></Col>
      <Col span={6}><Card><Statistic title="失败数量" value={status?.failedCount ?? 0} valueStyle={{ color: '#cf1322' }} /></Card></Col>
    </Row>
    <Card title="同步控制" extra={`最近同步：${status?.lastSync?.started_at ?? '-'}`}> 
      <Space wrap>
        <Button loading={loading} type="primary" onClick={() => run('全量同步', () => post('/sync/full'))}>全量同步</Button>
        <Button loading={loading} onClick={() => run('增量同步', () => post('/sync/incremental'))}>增量同步</Button>
        <Button loading={loading} onClick={() => run('测试 Salesforce', () => post('/test/salesforce'))}>测试 Salesforce 连接</Button>
        <Button loading={loading} onClick={() => run('测试飞书', () => post('/test/feishu'))}>测试飞书连接</Button>
        <Button loading={loading} danger onClick={() => run('错误重试', () => post('/sync/retry'))}>错误重试</Button>
      </Space>
    </Card>
  </Space>;
}
