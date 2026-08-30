import { serve } from "@hono/node-server";
import { config } from "./config.js";
import app from "./app.js";

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Backend escuchando en http://localhost:${info.port}`);
});
