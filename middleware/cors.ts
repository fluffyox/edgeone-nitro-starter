import { defineMiddleware } from "nitro";

export default defineMiddleware((event) => {
  if (event.req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
});
