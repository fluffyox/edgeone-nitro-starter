# CLAUDE.md — EdgeOne Nitro Starter 脚手架

## 这是什么

这是我们的 **EdgeOne Pages + Nitro v3** 专属脚手架模板。所有 EdgeOne 边缘函数项目从这里 fork。模板已包含所有踩过的坑的修复，拿来即用。

## 技术栈

- **Nitro v3** (`nitro@^3.0.260610-beta`) — 不要用 `3.0.0` 正式版，已 deprecated
- **TypeScript** — 全项目 TS
- **EdgeOne Pages** — `edgeone-pages` preset，主 handler 跑在 **Node.js 函数环境**（不是 V8 边缘函数）
- **EdgeOne CLI** (`npm i -g edgeone`) — 本地开发与部署

## 项目结构

```
nitro.config.ts       — Nitro 配置（⚠️ serverDir: "." 是必须的）
edgeone.json          — EdgeOne CLI 配置（devCommand / buildCommand / outputDirectory）
package.json          — 依赖与脚本
tsconfig.json         — TypeScript 配置
.env.example          — 环境变量模板
.gitignore            — 排除 .edgeone、.output、.env、node_modules
routes/               — Nitro 文件路由
  index.ts            — GET / — SSR 页面
  api/
    hello.ts          — GET /api/hello — JSON 接口
middleware/
  cors.ts             — OPTIONS 预检 → 204
```

## ⚠️ Nitro v3 必读（全是坑）

### 1. serverDir 必须设为 "."
```ts
// nitro.config.ts
export default defineConfig({
  serverDir: ".",  // ← 不写这个，路由全部 404
});
```
Nitro v3 默认 `serverDir: false`，不会扫描 `routes/` 和 `api/` 目录。

### 2. 没有自动导入
Nitro v3 的 `imports` 配置默认 `false`。每个路由文件必须显式导入：
```ts
import { defineHandler } from "nitro";                    // 路由处理器
import { defineMiddleware } from "nitro";                  // 中间件
import { useRuntimeConfig } from "nitro/runtime-config";   // 运行时配置
import { useStorage } from "nitro/storage";                // Storage
```

### 3. defineHandler 不是 defineEventHandler
v2 用 `defineEventHandler`，v3 改为 `defineHandler`，从 `"nitro"` 导入。

### 4. Web 标准 API
v3 不再有 `readBody()`、`getMethod()`、`getQuery()` 等工具函数：
```ts
// ✗ 旧写法
const body = await readBody(event);
const method = getMethod(event);

// ✓ v3 写法
const body = await event.req.json();
const method = event.req.method;
const url = new URL(event.req.url);
const query = url.searchParams.get("key");
```

### 5. 返回 Response 对象
v3 路由直接返回 Web 标准 `Response`：
```ts
// JSON
return Response.json({ hello: "world" });

// 自定义 headers
return new Response(binaryData, {
  status: 200,
  headers: { "Content-Type": "application/octet-stream" },
});
```

## EdgeOne CLI 注意事项

### edgeone.json 配置
```json
{
  "devCommand": "npx nitro dev",
  "buildCommand": "NITRO_PRESET=edgeone-pages npx nitro build",
  "outputDirectory": ".edgeone"
}
```
- **devCommand** 不能写 `edgeone makers dev`，会递归死循环
- CLI 读 devCommand 来启动框架 dev server，再套一层代理到 8088 端口

### 命令速查
```bash
# 安装 CLI
npm i -g edgeone

# 登录（选 Global）
edgeone login

# 绑定项目（同步 KV 和环境变量）
edgeone makers link

# 本地开发 → http://localhost:8088
edgeone makers dev

# 部署（自动 build + deploy）
edgeone makers deploy -n <project-name>

# 环境变量
edgeone makers env ls
edgeone makers env set KEY value
edgeone makers env pull
```

### CLI 已知问题
- `edgeone makers env set` — 值不能含换行符/特殊字符，且有 **1000 字符限制**
- `edgeone makers env ls` — 有时显示空即使已设置
- 部署经常超过 CLI 等待超时（~120s），但部署本身通常成功，去控制台确认
- CLI 命名空间从 `edgeone pages` 迁移到了 `edgeone makers`，旧命令仍可用

## 构建与部署

```bash
# 安装
npm install

# 本地开发
edgeone makers dev          # 端口 8088（通过 EdgeOne CLI）
npx nitro dev               # 端口 3000（直接 Nitro）

# 构建
NITRO_PRESET=edgeone-pages npm run build   # → .edgeone/

# 部署
edgeone makers deploy -n <project-name>

# 类型检查
npm run typecheck
```

### 构建输出
EdgeOne preset 输出到 `.edgeone/`（不是 `.output/`）：
```
.edgeone/
├── cloud-functions/ssr-node/handler.js   ← 入口
├── cloud-functions/ssr-node/*.mjs        ← 路由和依赖
├── assets/                               ← 静态文件
└── nitro.json                            ← 元信息
```

## 多 Provider 可移植

同一份代码可切 preset 部署到其他平台：
```bash
NITRO_PRESET=node npm run build              # Node.js → .output/
NITRO_PRESET=cloudflare-pages npm run build   # Cloudflare Pages
NITRO_PRESET=vercel npm run build             # Vercel
```

应用代码不要写 EdgeOne 专有假设（不要直接引用 EdgeOne runtime API）。

## 添加新路由

在 `routes/` 下建文件，Nitro 自动注册：
```
routes/api/users.ts          → GET  /api/users
routes/api/users.post.ts     → POST /api/users
routes/api/users/[id].ts     → GET  /api/users/:id
routes/blog/[...slug].ts     → GET  /blog/*
```

路由模板：
```ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  return Response.json({ ok: true });
});
```

## CORS

已配置好。如需在 `nitro.config.ts` 中全局加 CORS headers：
```ts
routeRules: {
  "/api/**": {
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  },
},
```
`middleware/cors.ts` 处理 OPTIONS 预检。

## Storage

Nitro Storage 抽象，开发用内存 driver，生产可接 EdgeOne KV：
```ts
// nitro.config.ts
storage: { data: { driver: "memory" } },
devStorage: { data: { driver: "memory" } },

// 路由中使用
import { useStorage } from "nitro/storage";
const storage = useStorage("data");
await storage.setItem("key", "value");
const val = await storage.getItem("key");
```

## 环境变量 / runtimeConfig

```ts
// nitro.config.ts
runtimeConfig: {
  myKey: "",  // NITRO_MY_KEY 环境变量自动映射
},

// 路由中使用
import { useRuntimeConfig } from "nitro/runtime-config";
const { myKey } = useRuntimeConfig();
```

`.env` 文件中 `NITRO_MY_KEY=xxx` 会自动映射到 `runtimeConfig.myKey`。
⚠️ EdgeOne 环境变量值限 1000 字符。

## 本地代理问题

如果本机有 HTTP 代理（Clash 等），localhost 请求可能被代理拦截。测试时用：
```bash
curl --noproxy '*' http://localhost:8088/api/hello
```
或浏览器把 `localhost` 加入代理排除列表。
