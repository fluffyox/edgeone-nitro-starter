import { defineHandler } from "nitro";

export default defineHandler(() => {
  return Response.json({
    message: "Hello from EdgeOne!",
    timestamp: new Date().toISOString(),
  });
});
