import { defineHandler } from "nitro";
import { getStore } from "../../../utils/blob.js";

// POST /api/notes — 创建/更新笔记 { path: "xxx.md", content: "..." }

export default defineHandler(async (event) => {
  try {
    const { path, content } = (await event.req.json()) as { path: string; content: string };
    if (!path) return Response.json({ error: "path is required" }, { status: 400 });
    const store = getStore("notes");
    await store.set(path, content ?? "");
    return Response.json({ ok: true, path });
  } catch (e: any) {
    return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
});
