import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { createDb } from "@voicekhata/db";
import { HealthResponseSchema } from "@voicekhata/shared";
import Fastify from "fastify";
import { createGeminiClient } from "./modules/voice/gemini-client.js";

export interface BuildAppOptions {
  allowedOrigin?: string;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: true
  });

  const dbHandle = process.env["DATABASE_URL"]
    ? createDb(process.env["DATABASE_URL"])
    : null;
  const geminiClient = createGeminiClient();

  app.addHook("onClose", async () => {
    if (dbHandle) {
      await dbHandle.pool.end();
    }
  });

  await app.register(cors, {
    origin: options.allowedOrigin ?? process.env["APP_ORIGIN"] ?? "http://localhost:3000"
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute"
  });

  app.get("/healthz", async () => {
    return HealthResponseSchema.parse({
      status: "ok",
      service: geminiClient ? "voicekhata-api+ai" : "voicekhata-api",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/v1/health", async () => {
    return HealthResponseSchema.parse({
      status: "ok",
      service: "voicekhata-api",
      timestamp: new Date().toISOString()
    });
  });

  return app;
}
