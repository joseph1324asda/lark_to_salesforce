import { Button, Card, Form, Input, message } from 'antd';
import { useEffect } from 'react';
import { get, put } from '../api/client';

const fields = ['SALESFORCE_CLIENT_ID','SALESFORCE_USERNAME','SALESFORCE_PRIVATE_KEY_PATH','SALESFORCE_LOGIN_URL','SALESFORCE_API_VERSION','SALESFORCE_INSTANCE_URL','SALESFORCE_REFRESH_TOKEN','SALESFORCE_CLIENT_SECRET','FEISHU_APP_ID','FEISHU_APP_SECRET','FEISHU_BITABLE_APP_TOKEN','FEISHU_BITABLE_TABLE_ID','SYNC_CRON'];
export function Config() {
  const [form] = Form.useForm();
  useEffect(() => { void get<Record<string,string>>('/config').then((values) => form.setFieldsValue(values)); }, [form]);
  const save = async () => { await put('/config', form.getFieldsValue()); message.success('配置已保存，部分配置需要重启后生效'); };
  return <Card title="系统配置"><Form form={form} layout="vertical">{fields.map((name) => <Form.Item key={name} name={name} label={name}><Input.Password visibilityToggle={name.includes('SECRET') || name.includes('TOKEN')} /></Form.Item>)}<Button type="primary" onClick={save}>保存配置</Button></Form></Card>;
}
