import { Hono } from "hono";
import { requireAuth } from "../middleware.js";

export const me = new Hono();

me.use("*", requireAuth);

me.get("/", (c) => {
  const user = c.get("user");
  return c.json({ uid: user.uid, name: user.name, email: user.email });
});
