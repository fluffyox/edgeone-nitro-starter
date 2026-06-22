import { defineHandler } from "nitro";
import { getStore } from "@edgeone/pages-blob";

// GET /api/notes?path=folder/ — 列出文件和文件夹

export default defineHandler(async (event) => {
  try {
    const store = getStore("notes");
    const prefix = new URL(event.req.url).searchParams.get("path") || "";
    const { blobs, directories } = await store.list({
      prefix,
      directories: true,
      consistency: "strong",
    });
    return Response.json({
      files: blobs.map((b) => ({ key: b.key, name: b.key.replace(prefix, "") })),
      folders: (directories || []).map((d) => ({ key: d, name: d.replace(prefix, "") })),
    });
  } catch (e: any) {
    return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
});
