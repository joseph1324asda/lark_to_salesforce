# Salesforce Order 到飞书多维表格单向同步系统

这是一个 **Salesforce → 飞书多维表格** 的单向同步 MVP。系统从 Salesforce 标准 `Order` 对象读取订单数据，以 `Salesforce Order.Id` 作为唯一键，将订单新增或更新到飞书多维表格；不会把飞书数据反向写回 Salesforce。

## 1. 功能概览

- Salesforce OAuth：支持 **JWT Bearer Flow** 和 **Refresh Token Flow**。
- Salesforce 数据读取：默认同步标准 `Order` 主表字段，支持 SOQL 查询与 `queryMore` 分页。
- 增量同步：按 `LastModifiedDate` 查询，增量窗口自动向前回退 5 分钟，降低边界漏数风险。
- 飞书能力：自动获取并缓存 `tenant_access_token`，支持多维表格记录新增、更新和批量更新客户端能力。
- 去重与变更检测：以 `Order.Id` 为唯一键，先查本地状态和飞书记录；使用 hash 判断字段是否变化，未变化则跳过更新。
- 本地审计：SQLite 保存 `order_sync_state`、`sync_log`、`field_mapping`、`app_config`。
- 同步入口：手动全量同步、手动增量同步、单订单重同步、失败重试、定时增量同步。
- 管理界面：Dashboard、订单列表、字段映射、同步日志、系统配置。

## 2. 技术栈

| 层级 | 技术 |
| --- | --- |
| 后端 | Node.js、TypeScript、Express |
| 前端 | React、Vite、Ant Design |
| 数据库 | SQLite (`better-sqlite3`) |
| 调度 | `node-cron` |
| 部署 | Docker / Docker Compose |

## 3. 目录结构

```text
.
├── backend/                 # Express + TypeScript 后端
│   └── src/
│       ├── clients/         # SalesforceClient、FeishuClient
│       ├── controllers/     # API 控制器
│       ├── db/              # SQLite 初始化与迁移
│       ├── routes/          # API 路由
│       ├── scheduler/       # 定时同步任务
│       ├── services/        # 同步、映射、配置、日志服务
│       └── utils/           # hash、retry 等工具
├── frontend/                # React + Vite 管理界面
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 4. 安装前准备

### 4.1 本地环境

- Node.js >= 20
- npm >= 10
- Docker 与 Docker Compose（如使用容器部署）
- 可访问 Salesforce 与飞书开放平台 API 的网络环境

### 4.2 Salesforce 准备

任选一种授权方式：

#### 方式 A：JWT Bearer Flow（推荐服务端定时任务）

1. 在 Salesforce 创建 External Client App / Connected App。
2. 启用 OAuth，并上传 X.509 证书。
3. 授权范围建议至少包含：
   - `api`
   - `refresh_token` / `offline_access`（如后续也需要 Refresh Token Flow）
4. 将私钥保存到本地文件，例如 `./keys/salesforce.key`，或通过环境变量 `SALESFORCE_PRIVATE_KEY` 提供。
5. 确认运行同步的 Salesforce 用户对 `Order` 和相关字段有读取权限。

#### 方式 B：Refresh Token Flow

1. 在 Salesforce Connected App 启用 OAuth。
2. 获取 `refresh_token`。
3. 配置 `SALESFORCE_REFRESH_TOKEN`；如果 App 要求 client secret，同时配置 `SALESFORCE_CLIENT_SECRET`。

### 4.3 飞书准备

1. 创建飞书自建应用，获取 `FEISHU_APP_ID` 与 `FEISHU_APP_SECRET`。
2. 给应用开通多维表格相关权限，并完成租户授权。
3. 创建目标多维表格和数据表，获取：
   - `FEISHU_BITABLE_APP_TOKEN`
   - `FEISHU_BITABLE_TABLE_ID`
4. 在飞书多维表格中创建字段，字段名默认如下：
   - `Salesforce订单ID`
   - `订单编号`
   - `订单状态`
   - `客户名称`
   - `客户ID`
   - `订单金额`
   - `生效日期`
   - `结束日期`
   - `激活日期`
   - `Salesforce创建时间`
   - `Salesforce更新时间`
   - `负责人`
   - `描述`
   - `Salesforce链接`
   - `原始JSON`
   - `同步状态`
   - `最后同步时间`

> 字段名可以在系统的“字段映射”页面调整；第一版建议先按上述默认字段建表，降低接入成本。

## 5. 环境变量配置

复制示例配置：

```bash
cp .env.example .env
```

`.env` 示例：

```dotenv
PORT=3000
DATABASE_PATH=./data/app.db
SYNC_CRON=*/10 * * * *

SALESFORCE_CLIENT_ID=your_connected_app_client_id
SALESFORCE_USERNAME=integration-user@example.com
SALESFORCE_PRIVATE_KEY_PATH=./keys/salesforce.key
SALESFORCE_PRIVATE_KEY=
SALESFORCE_LOGIN_URL=https://login.salesforce.com
SALESFORCE_API_VERSION=v60.0
SALESFORCE_INSTANCE_URL=
SALESFORCE_REFRESH_TOKEN=
SALESFORCE_CLIENT_SECRET=

FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_BITABLE_APP_TOKEN=base_xxx
FEISHU_BITABLE_TABLE_ID=tblxxx
```

### 5.1 Salesforce 配置说明

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `SALESFORCE_CLIENT_ID` | 是 | External Client App / Connected App 的 Consumer Key |
| `SALESFORCE_USERNAME` | JWT Flow 必填 | 被授权的 Salesforce 用户名 |
| `SALESFORCE_PRIVATE_KEY_PATH` | JWT Flow 二选一 | 私钥文件路径 |
| `SALESFORCE_PRIVATE_KEY` | JWT Flow 二选一 | 私钥内容，换行可写成 `\\n` |
| `SALESFORCE_LOGIN_URL` | 是 | 生产一般为 `https://login.salesforce.com`，沙箱为 `https://test.salesforce.com` |
| `SALESFORCE_API_VERSION` | 是 | 例如 `v60.0` |
| `SALESFORCE_REFRESH_TOKEN` | Refresh Token Flow 必填 | 配置后优先使用 Refresh Token Flow |
| `SALESFORCE_CLIENT_SECRET` | 视 App 配置 | Connected App client secret |

### 5.2 飞书配置说明

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `FEISHU_APP_ID` | 是 | 飞书自建应用 App ID |
| `FEISHU_APP_SECRET` | 是 | 飞书自建应用 App Secret |
| `FEISHU_BITABLE_APP_TOKEN` | 是 | 多维表格 App Token |
| `FEISHU_BITABLE_TABLE_ID` | 是 | 多维表格 Table ID |

## 6. 本地安装与启动

### 6.1 安装依赖

```bash
npm install
```

### 6.2 开发模式启动

当前仓库根目录的 `npm run dev` 默认启动后端。若需要同时开发前端，请打开两个终端：

```bash
npm run dev --workspace backend
```

```bash
npm run dev --workspace frontend
```

默认访问地址：

- 后端 API：`http://localhost:3000`
- 前端 Vite：通常为 `http://localhost:5173`

### 6.3 生产构建

```bash
npm run build
```

构建成功后启动后端：

```bash
npm run start --workspace backend
```

后端会在存在 `frontend/dist` 时自动托管前端静态文件。

## 7. Docker 部署

1. 准备 `.env` 文件。
2. 如使用 JWT Flow，把私钥放到 `./keys/` 目录，例如 `./keys/salesforce.key`，并在 `.env` 中配置容器内路径，例如：

```dotenv
SALESFORCE_PRIVATE_KEY_PATH=/app/keys/salesforce.key
```

3. 构建并启动：

```bash
docker compose up --build -d
```

4. 查看日志：

```bash
docker compose logs -f order-sync
```

5. 停止服务：

```bash
docker compose down
```

## 8. 首次使用流程

1. 按第 4 节完成 Salesforce 和飞书准备。
2. 按第 5 节填写 `.env`。
3. 执行 `npm install`，然后启动后端和前端。
4. 打开前端 Dashboard。
5. 点击“测试 Salesforce 连接”。
6. 点击“测试飞书连接”。
7. 进入“字段映射”页面，确认 Salesforce 字段和飞书字段名称匹配。
8. 点击“增量同步”做小范围验证；如果是首次初始化，也可以点击“全量同步”。
9. 在“订单列表”确认同步状态、飞书记录 ID、原始 JSON 与错误信息。
10. 在“同步日志”确认每次同步的开始时间、结束时间、成功数、失败数与状态。

## 9. API 清单

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/status` | Dashboard 汇总状态 |
| `POST` | `/api/test/salesforce` | 测试 Salesforce 连接 |
| `POST` | `/api/test/feishu` | 测试飞书连接 |
| `POST` | `/api/sync/full` | 手动全量同步 |
| `POST` | `/api/sync/incremental` | 手动增量同步 |
| `POST` | `/api/sync/order/:salesforceOrderId` | 重新同步单个订单 |
| `POST` | `/api/sync/retry` | 重试失败订单 |
| `GET` | `/api/orders` | 查询本地订单同步状态 |
| `GET` | `/api/sync/logs` | 查询同步日志 |
| `GET` | `/api/mapping` | 查询字段映射 |
| `PUT` | `/api/mapping` | 更新字段映射 |
| `GET` | `/api/config` | 查询系统配置 |
| `PUT` | `/api/config` | 更新系统配置 |

## 10. 可用性验证

在本仓库中已执行以下检查：

```bash
npm run typecheck --workspace backend
npm run typecheck --workspace frontend
npm run build --workspace backend
```

验证结果：

- 后端 TypeScript 类型检查通过。
- 前端 TypeScript 类型检查通过。
- 后端 TypeScript 构建通过。

当前执行环境访问 npm registry 时返回 `403 Forbidden`，因此无法在该环境完成 `npm install` 与依赖下载；受此影响，前端生产构建会因为 `vite` 未安装而无法完成。该限制属于当前执行环境的网络/registry 权限问题，不是项目代码逻辑错误。网络和 npm registry 可用时，请使用以下命令完成完整验证：

```bash
npm install
npm run typecheck
npm run build
```

## 11. 同步规则说明

1. 以 Salesforce `Order.Id` 作为唯一键。
2. 如果本地 `order_sync_state` 不存在该订单，则创建飞书记录。
3. 如果本地已存在该订单，则使用 `bitable_record_id` 更新飞书记录。
4. 如果本地没有 `bitable_record_id`，会按默认唯一字段 `Salesforce订单ID` 扫描飞书记录，避免重复创建。
5. 更新前计算订单 JSON hash；hash 未变化时跳过飞书更新。
6. 每次同步会写入 `sync_log`。
7. 单条订单同步失败会更新 `order_sync_state.sync_status = failed` 和 `error_message`。
8. 增量同步基于本地最大 `last_salesforce_modified_at`，查询窗口向前回退 5 分钟。

## 12. 常见问题

### 12.1 Salesforce 连接失败

- 确认 `SALESFORCE_LOGIN_URL` 是否正确；生产环境和沙箱不同。
- 确认 Connected App 已启用 OAuth 且证书/私钥匹配。
- 确认 `SALESFORCE_USERNAME` 对 `Order` 对象和字段有读取权限。
- 如使用 Refresh Token Flow，确认 refresh token 未被吊销。

### 12.2 飞书连接失败

- 确认飞书应用的 App ID / App Secret 正确。
- 确认应用已开通并授权多维表格权限。
- 确认 `FEISHU_BITABLE_APP_TOKEN` 与 `FEISHU_BITABLE_TABLE_ID` 属于同一个多维表格。
- 确认飞书表字段名与字段映射一致。

### 12.3 重复同步是否会创建重复飞书记录？

正常不会。系统优先使用本地 `order_sync_state.bitable_record_id` 更新记录；如果本地状态缺失，会按 `Salesforce订单ID` 在飞书表中查找已有记录，找到后更新而不是创建。

### 12.4 定时同步频率如何调整？

修改 `.env` 中的 `SYNC_CRON`，默认值为：

```dotenv
SYNC_CRON=*/10 * * * *
```

表示每 10 分钟执行一次增量同步。修改后重启服务生效。
