import { defineHandler } from "nitro";

export default defineHandler(() => {
  const env = process.env;
  // Find all EdgeOne/Pages related env vars
  const relevant: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (k.match(/edge|page|maker|blob|project|deploy|credential/i)) {
      relevant[k] = v ? v.substring(0, 20) + "..." : "(empty)";
    }
  }
  return Response.json({ envKeys: Object.keys(env).sort(), relevant });
});
