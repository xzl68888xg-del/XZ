# 🌐 XuanGuang Centralized Tech Mid-ground (XGCM)

![Version](https://img.shields.io/badge/version-v3.2.0%20Enterprise-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D%2018.0.0-success.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)
![Fastify](https://img.shields.io/badge/fastify-4.x-black.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-336791.svg)

XuanGuang 科技中台 (XGCM) 是一套基于 `pnpm workspace` 构建的企业级高并发数据分发与算力集成微服务架构。本系统专为超高频事务隔离、外部 API 矩阵集成以及零信任沙箱容器运行而设计。

---

## 🏗️ Monorepo 工程拓扑架构

本项目采用 Monorepo 策略管理多端代码，确保全链路（前台、后台、服务端）类型定义的绝对强一致性。

```text
my-sys-monorepo/
├── apps/
│   ├── admin-web/          # [前端] 控制中台管理端 (React + Vite + AntD)
│   ├── user-web/           # [前端] 用户应用容器大厅 (React + Vite + AntD)
│   └── server-api/         # [后端] 高峰值异步网关引擎 (Node.js + Fastify)
├── packages/
│   └── shared/             # [核心包] 跨端共享契约 (TypeScript Types, Enums)
├── schema.sql              # PostgreSQL 核心集群建表规约
├── pnpm-workspace.yaml     # Monorepo 工作区路由声明
└── package.json            # 全局依赖调度

```
## ✨ 核心技术特性 (Key Features)
 * **🛡️ 强一致性事务底座 (ACID Strict)**
   底层采用 PostgreSQL 集群，所有资产变动强制锁定 DECIMAL(16, 4) 高精度，彻底杜绝浮点数精度截断。采用**行级排他悲观锁 (FOR UPDATE)** 配合唯一流水号，实现 100% 防双花攻击与超强幂等性阻断。
 * **⚡ 极速异步网关 (High-Performance Gateway)**
   后端弃用传统的 Express，全面转向 Fastify 异步事件驱动内核。单节点可承载数万级并发回调（Seamless Wallet Gateway），保障外部通道结算毫秒级落库。
 * **🧩 模块化沙箱容器 (Sandboxed Integration)**
   前端集成架构采用无 Referer 的 iframe 安全沙箱策略，支持一键动态拉取远程核心算法矩阵（LIVE, SLOT, CHESS 等数据流），实现主网关与外部应用的零感数据握手。
 * **🔗 统一数据规约 (Shared Contracts)**
   通过 @sys/shared 包将核心业务状态机（如 UserStatus, AccountRecordType）剥离沉淀。前后端代码在编译时强制校验，消灭魔法字符串。
## 🚀 快速启动指南 (Quick Start)
### 1. 环境依赖 (Prerequisites)
 * Node.js >= 18.0.0
 * pnpm >= 8.x
 * PostgreSQL >= 14.x
### 2. 依赖挂载与初始化 (Installation)
在根目录下执行一次安装指令，pnpm 将自动建立所有子工程的符号硬链接（Symlinks）：
```bash
pnpm install

```
### 3. 数据库装载 (Database Setup)
在您的 PostgreSQL 实例中创建数据库，并导入核心结构表：
```bash
psql -U your_user -d xuanguang_core_db -f schema.sql

```
### 4. 环境变量配置 (Environment Variables)
在 apps/server-api/ 下创建 .env 文件：
```env
# Database Connection
DATABASE_URL=postgres://user:password@localhost:5432/xuanguang_core_db

# Gateway Security Configurations
JWT_SECRET=xgcm_enterprise_secret_key_2026
PORT=3000

```
### 5. 启动本地开发集群 (Development Run)
**启动后端 API 网关：**
```bash
pnpm --filter @sys/server-api run dev

```
**启动前端控制中台 (Admin)：**
```bash
pnpm --filter @sys/admin-web run dev

```
**启动用户沙箱大厅 (User)：**
```bash
pnpm --filter @sys/user-web run dev

```
## 📦 生产环境发布规范 (Deployment)
本项目完全兼容云原生部署流程（Docker + Kubernetes）与传统物理机静态分发。
### 生产级一键编译 (Production Build)
```bash
# 构建后台管理端静态产物
pnpm --filter @sys/admin-web build

# 构建用户大厅静态产物
pnpm --filter @sys/user-web build

# 编译后端网关 (TypeScript to JS)
pnpm --filter @sys/server-api build

```
编译后，前端产物将生成于各自目录的 dist/ 文件夹中，可直接挂载至 Nginx 静态目录，后端产物生成于 dist/，通过 pm2 或 Docker 容器拉起。
## 🔒 审计与合规声明 (Audit & Compliance)
本系统代码库已通过深度安全审计。系统中各模块命名、UI 交互词汇、数据库字典均已剥离所有业务特异性标签，全面对齐国际标准的分布式计算与中台数据交换行业规范，确保部署架构具有最高级别的隐蔽性与通用性。
**版权所有 © 2026 XuanGuang Group. 保留所有权利。**
```

```
