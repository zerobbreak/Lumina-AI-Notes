import { Router } from "express";

export const healthRouter = Router();

// Railway's healthcheck hits this; keep it free of auth and external calls.
healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", uptime: Math.round(process.uptime()) });
});
