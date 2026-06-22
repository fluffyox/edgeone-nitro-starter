import { defineHandler } from "nitro";
import { getStore } from "../../../utils/blob.js";

// GET /api/notes/folder/xxx.md — 读取单个笔记内容

export default defineHandler(async (event) => {
  const fullPath = decodeURIComponent(
    event.url.pathname.replace("/api/notes/", ""),
  );
  if (!fullPath) {
    return Response.json({ error: "path is required" }, { status: 400 });
  }

  const store = getStore("notes");
  const content = await store.get(fullPath, { consistency: "strong" });

  if (content === null) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ path: fullPath, content });
});
