import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Layout, Menu, Typography } from 'antd';
import 'antd/dist/reset.css';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Mapping } from './pages/Mapping';
import { Logs } from './pages/Logs';
import { Config } from './pages/Config';

const pages = { dashboard: <Dashboard />, orders: <Orders />, mapping: <Mapping />, logs: <Logs />, config: <Config /> } as const;
type PageKey = keyof typeof pages;
function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  return <Layout style={{ minHeight: '100vh' }}><Layout.Sider theme="light"><Typography.Title level={4} style={{ padding: 16 }}>Order Sync</Typography.Title><Menu selectedKeys={[page]} onClick={(e: { key: string }) => setPage(e.key as PageKey)} items={[{ key:'dashboard', label:'Dashboard' },{ key:'orders', label:'订单列表' },{ key:'mapping', label:'字段映射' },{ key:'logs', label:'同步日志' },{ key:'config', label:'系统配置' }]} /></Layout.Sider><Layout.Content style={{ padding: 24 }}>{pages[page]}</Layout.Content></Layout>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
