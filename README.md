# edgeone-nitro-starter

开箱即用的 [腾讯云 EdgeOne Pages](https://pages.edgeone.ai/) 全栈项目脚手架，基于 [Nitro v3](https://nitro.build/) + TypeScript。

已踩完所有坑，直接 clone 开写业务。

## 特性

- Nitro v3 + TypeScript，零配置烦恼
- 部署到 EdgeOne Pages（Node.js 函数环境），也可一键切到 Cloudflare / Vercel / Node.js
- 文件路由 — 建文件即注册路由
- CORS 预配置
- 总包体 < 34 KB（gzip < 10 KB）

## 快速开始

### 1. 创建项目

```bash
# 克隆脚手架
git clone https://github.com/fluffyox/edgeone-nitro-starter.git my-project
cd my-project
rm -rf .git && git init

# 安装依赖
npm install
```

### 2. 本地开发

```bash
# 方式一：通过 EdgeOne CLI（推荐，端口 8088）
npm i -g edgeone
edgeone login
edgeone makers dev

# 方式二：直接 Nitro（端口 3000）
npx nitro dev
```

打开 http://localhost:8088 （或 3000），看到 Hello 页面即成功。

### 3. 部署到 EdgeOne

```bash
edgeone makers deploy -n my-project
```

首次会自动创建项目。部署完成后 CLI 输出访问 URL。

绑定自定义域名请到 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone/pages) 操作。

## 路由

在 `routes/` 目录下创建文件，Nitro 自动注册为路由：

### 文件名 → 路由映射

| 文件 | 路由 | 方法 |
|---|---|---|
| `routes/index.ts` | `/` | GET |
| `routes/about.ts` | `/about` | GET |
| `routes/api/users.ts` | `/api/users` | GET |
| `routes/api/users.post.ts` | `/api/users` | POST |
| `routes/api/users.put.ts` | `/api/users` | PUT |
| `routes/api/users/[id].ts` | `/api/users/:id` | GET |
| `routes/api/users/[id].delete.ts` | `/api/users/:id` | DELETE |
| `routes/blog/[...slug].ts` | `/blog/*` | GET (catch-all) |

### 写一个 GET 接口

```ts
// routes/api/hello.ts → GET /api/hello
import { defineHandler } from "nitro";

export default defineHandler(() => {
  return Response.json({ message: "hello" });
});
```

### 写一个 POST 接口

```ts
// routes/api/users.post.ts → POST /api/users
import { defineHandler } from "nitro";

export default defineHandler(async (event) => {
  const body = await event.req.json();
  return Response.json({ created: body });
});
```

### 读取 URL 参数

```ts
// routes/api/users/[id].ts → GET /api/users/:id
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const id = event.url.pathname.split("/").pop();
  return Response.json({ id });
});
```

### 读取 Query 参数

```ts
// routes/api/search.ts → GET /api/search?q=xxx
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const q = new URL(event.req.url).searchParams.get("q");
  return Response.json({ query: q });
});
```

### 返回 HTML（SSR）

```ts
// routes/index.ts → GET /
import { defineHandler } from "nitro";

export default defineHandler(() => {
  return `<html><body><h1>Hello</h1></body></html>`;
});
```

### 返回二进制文件

```ts
// routes/download.ts → GET /download
import { defineHandler } from "nitro";

export default defineHandler(() => {
  const data = new Uint8Array([0x00, 0x01, 0x02]);
  return new Response(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="data.bin"',
    },
  });
});
```

### 错误处理

```ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const id = event.url.pathname.split("/").pop();
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }
  return Response.json({ id });
});
```

## 中间件

在 `middleware/` 目录下创建文件，对所有请求生效：

```ts
// middleware/auth.ts
import { defineMiddleware } from "nitro";

export default defineMiddleware((event) => {
  const token = event.req.headers.get("authorization");
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 不返回值 = 继续执行下一个中间件/路由
});
```

脚手架已包含 `middleware/cors.ts`，自动处理 OPTIONS 预检请求。

## CORS

### 方式一：routeRules（推荐）

在 `nitro.config.ts` 中添加：

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

### 方式二：中间件

已内置 `middleware/cors.ts`，OPTIONS 请求返回 204。

## 环境变量

### 定义

```ts
// nitro.config.ts
export default defineConfig({
  runtimeConfig: {
    apiSecret: "",      // ← NITRO_API_SECRET 自动映射
    databaseUrl: "",    // ← NITRO_DATABASE_URL 自动映射
  },
});
```

### 设置值

```bash
# 本地：.env 文件
echo "NITRO_API_SECRET=my-secret" >> .env

# EdgeOne：CLI
edgeone makers env set NITRO_API_SECRET my-secret
```

### 读取

```ts
import { useRuntimeConfig } from "nitro/runtime-config";

export default defineHandler(() => {
  const { apiSecret } = useRuntimeConfig();
  return Response.json({ hasSecret: !!apiSecret });
});
```

> **注意**: EdgeOne 环境变量值有 1000 字符限制。

## Storage

Nitro 内置 Storage 抽象层，开发用内存，生产可接 KV 等持久化存储：

```ts
// nitro.config.ts
export default defineConfig({
  storage: { data: { driver: "memory" } },
  devStorage: { data: { driver: "memory" } },
});
```

```ts
// routes/api/cache.ts
import { defineHandler } from "nitro";
import { useStorage } from "nitro/storage";

export default defineHandler(async (event) => {
  const storage = useStorage("data");

  if (event.req.method === "POST") {
    const { key, value } = await event.req.json();
    await storage.setItem(key, value);
    return Response.json({ ok: true });
  }

  const keys = await storage.getKeys();
  return Response.json({ keys });
});
```

## 部署到其他平台

同一份代码，换个环境变量就能部署到别家：

```bash
# Cloudflare Pages
NITRO_PRESET=cloudflare-pages npm run build

# Vercel
NITRO_PRESET=vercel npm run build

# Node.js 独立服务器
NITRO_PRESET=node npm run build
node .output/server/index.mjs
```

## 项目结构

```
edgeone-nitro-starter/
├── nitro.config.ts       # Nitro 配置
├── edgeone.json          # EdgeOne CLI 配置
├── package.json
├── tsconfig.json
├── .env.example          # 环境变量模板
├── .gitignore
├── routes/               # 文件路由（自动注册）
│   ├── index.ts          # GET /
│   └── api/
│       └── hello.ts      # GET /api/hello
├── middleware/            # 中间件（对所有请求生效）
│   └── cors.ts           # OPTIONS → 204
└── CLAUDE.md             # AI 助手上下文（开发细节和踩坑记录）
```

## 常见问题

### 路由全部 404？

确保 `nitro.config.ts` 中有 `serverDir: "."`。Nitro v3 默认不扫描路由目录。

### `edgeone makers dev` 报错 "No runners started"？

需要有 `edgeone.json` 且 `devCommand` 配置正确。不要把 `edgeone makers dev` 自身写进去。

### 部署超时但没报错？

CLI 等待超时不代表部署失败。去 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone/pages) 查看实际状态。

### curl 本地测试没响应？

如果你用了 HTTP 代理（Clash 等），加 `--noproxy '*'`：
```bash
curl --noproxy '*' http://localhost:8088/api/hello
```

### Nitro v2 的写法不工作？

v3 有大量破坏性变更：
- `defineEventHandler` → `defineHandler`
- `readBody(event)` → `event.req.json()`
- `getMethod(event)` → `event.req.method`
- `getQuery(event)` → `new URL(event.req.url).searchParams`
- 需要显式 `import`，没有自动导入

详见 [Nitro v3 迁移指南](https://nitro.build/docs/migration)。

## 技术栈

- [Nitro v3](https://nitro.build/) — 全栈服务器框架
- [EdgeOne Pages](https://pages.edgeone.ai/) — 腾讯云边缘部署平台
- [TypeScript](https://www.typescriptlang.org/)

## License

[MIT](LICENSE)
