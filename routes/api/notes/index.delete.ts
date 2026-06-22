import { defineHandler } from "nitro";
import { getStore } from "../../../utils/blob.js";

// DELETE /api/notes — 删除笔记 { path: "xxx.md" }

export default defineHandler(async (event) => {
  try {
    const { path } = (await event.req.json()) as { path: string };
    if (!path) return Response.json({ error: "path is required" }, { status: 400 });
    const store = getStore("notes");
    await store.delete(path);
    return Response.json({ ok: true, deleted: path });
  } catch (e: any) {
    return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
});
