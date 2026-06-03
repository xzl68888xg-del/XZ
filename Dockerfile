# === 阶段一：依赖安装与编译 ===
FROM node:18-alpine AS builder
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制整个 Monorepo 的依赖规约文件，用于精确锁版本和缓存层机制
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/admin-web/package.json ./apps/admin-web/

# 仅安装依赖（利用 Docker 缓存，只要 package.json 不动，这一步就不会重新下载）
RUN pnpm install --frozen-lockfile

# 复制真正的源码体
COPY packages/shared/ ./packages/shared/
COPY apps/admin-web/ ./apps/admin-web/

# 执行工程打包
RUN pnpm --filter @sys/admin-web build

# === 阶段二：微型高纯度生产运行端 ===
FROM nginx:alpine
# 将上一阶段编译出来的极致优化压缩包，安全复制到 Nginx 生产目录
COPY --from=builder /app/apps/admin-web/dist /usr/share/nginx/html

# 覆盖容器内默认的 Nginx 配置（可使用上文提到的 nginx.conf）
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
