import type { Hono } from "hono";

let app: Hono | null = null;

async function getApp() {
  if (!app) {
    const mod = await import("../backend/src/app.js");
    app = mod.default;
  }
  return app;
}

export const GET = async (req: Request) => (await getApp()).fetch(req);
export const POST = async (req: Request) => (await getApp()).fetch(req);
export const PUT = async (req: Request) => (await getApp()).fetch(req);
export const DELETE = async (req: Request) => (await getApp()).fetch(req);
export const PATCH = async (req: Request) => (await getApp()).fetch(req);
export const OPTIONS = async (req: Request) => (await getApp()).fetch(req);
