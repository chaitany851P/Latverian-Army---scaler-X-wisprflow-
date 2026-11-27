import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";
import { createDb } from "@voicekhata/db";
import {
  getCatalogForPreset,
  HealthResponseSchema,
  parseSandboxUtterance,
  SandboxParseRequestSchema,
  StorePresetSchema
} from "@voicekhata/shared";
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

  await app.register(swagger, {
    openapi: {
      info: {
        title: "VoiceKhata API & Sandbox Playground",
        description: "Interactive OpenAPI tester for VoiceKhata voice billing, catalog presets, and health endpoints.",
        version: "0.1.0"
      }
    }
  });

  await app.register(scalarApiReference, {
    routePrefix: "/reference"
  });

  app.get(
    "/healthz",
    {
      schema: {
        tags: ["Health"],
        summary: "Liveness and Postgres connectivity check"
      }
    },
    async (_request, reply) => {
      let status: "ok" | "degraded" = "ok";
      if (dbHandle) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const queryPromise = dbHandle.pool.query("SELECT 1");
          // Attach noop rejection handler in case the timeout branch wins first
          queryPromise.catch(() => undefined);
          await Promise.race([
            queryPromise,
            new Promise<never>((_resolve, reject) => {
              timer = setTimeout(() => reject(new Error("Database ping timed out")), 1500);
            })
          ]);
        } catch {
          status = "degraded";
        } finally {
          if (timer !== undefined) {
            clearTimeout(timer);
          }
        }
      }
      const payload = HealthResponseSchema.parse({
        status,
        service: geminiClient ? "voicekhata-api+ai" : "voicekhata-api",
        timestamp: new Date().toISOString()
      });
      return reply.status(status === "ok" ? 200 : 503).send(payload);
    }
  );

  app.get(
    "/api/v1/health",
    {
      schema: {
        tags: ["Health"],
        summary: "API health check"
      }
    },
    async () => {
      return HealthResponseSchema.parse({
        status: "ok",
        service: "voicekhata-api",
        timestamp: new Date().toISOString()
      });
    }
  );

  app.get(
    "/api/v1/catalog/presets",
    {
      schema: {
        tags: ["Catalog"],
        summary: "List seeded Indian SKUs for a store preset",
        querystring: {
          type: "object",
          properties: {
            preset: {
              type: "string",
              enum: StorePresetSchema.options,
              default: "kirana"
            }
          }
        }
      }
    },
    async (request, reply) => {
      const query = request.query as { preset?: string };
      const parsed = StorePresetSchema.safeParse(query.preset ?? "kirana");
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid store preset", issues: parsed.error.issues });
      }
      return {
        preset: parsed.data,
        items: getCatalogForPreset(parsed.data)
      };
    }
  );

  app.post(
    "/api/v1/sandbox/parse",
    {
      schema: {
        tags: ["Voice Sandbox"],
        summary: "Parse code-mixed Hinglish command into staged TransactionDraft",
        body: {
          type: "object",
          required: ["transcript"],
          properties: {
            transcript: {
              type: "string",
              examples: ["Ramesh ko 2 kilo chawal, 1 litre doodh, 100 rupaye jama, baaki mahine ke end mein"]
            },
            preset: {
              type: "string",
              enum: StorePresetSchema.options,
              default: "kirana"
            },
            activeResult: {
              type: ["object", "null"],
              additionalProperties: true,
              description: "Optional active Draft Card snapshot for in-place CORRECTION commands"
            }
          }
        }
      }
    },
    async (request, reply) => {
      const parsed = SandboxParseRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid request body", issues: parsed.error.issues });
      }
      return parseSandboxUtterance(
        parsed.data.transcript,
        parsed.data.preset,
        parsed.data.activeResult ?? undefined
      );
    }
  );

  return app;
}
