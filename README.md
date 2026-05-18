# Salesforce Order 到飞书多维表格单向同步系统

基于 Node.js + TypeScript + Express、React + Vite + Ant Design、SQLite、node-cron 和 Docker 的 MVP。系统通过 Salesforce OAuth 获取 Order 数据，并按 `Salesforce Order.Id` 唯一键同步到飞书多维表格。

## 功能

- Salesforce JWT Bearer Flow / Refresh Token Flow 鉴权。
- 默认同步 Salesforce 标准 `Order` 主表字段。
- SOQL 查询与 `queryMore` 分页。
- 按 `LastModifiedDate` 增量同步，窗口自动回退 5 分钟。
- 飞书 `tenant_access_token` 自动获取与缓存。
- 飞书多维表格记录新增、更新、批量更新客户端能力。
- 本地 SQLite 保存 `order_sync_state`、`sync_log`、`field_mapping`、`app_config`。
- Hash 判断字段变化，未变化时跳过更新，避免重复创建。
- 手动全量同步、手动增量同步、定时增量同步、单订单重同步、失败重试。
- React 管理界面：Dashboard、订单列表、字段映射、同步日志、系统配置。

## 本地运行

```bash
cp .env.example .env
npm install
npm run dev
```

后端默认监听 `3000`，前端由 Vite 启动。生产环境建议用 Docker：

```bash
docker compose up --build
```

## API

- `GET /health`
- `GET /api/status`
- `POST /api/test/salesforce`
- `POST /api/test/feishu`
- `POST /api/sync/full`
- `POST /api/sync/incremental`
- `POST /api/sync/order/:salesforceOrderId`
- `GET /api/orders`
- `GET /api/sync/logs`
- `GET /api/mapping`
- `PUT /api/mapping`
- `GET /api/config`
- `PUT /api/config`

## Salesforce 配置

必填环境变量 / 系统配置：

- `SALESFORCE_CLIENT_ID`
- `SALESFORCE_USERNAME`
- `SALESFORCE_PRIVATE_KEY_PATH` 或 `SALESFORCE_PRIVATE_KEY`
- `SALESFORCE_LOGIN_URL`
- `SALESFORCE_API_VERSION`

如使用 Refresh Token Flow，还可配置：

- `SALESFORCE_REFRESH_TOKEN`
- `SALESFORCE_CLIENT_SECRET`

## 飞书配置

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_BITABLE_APP_TOKEN`
- `FEISHU_BITABLE_TABLE_ID`
