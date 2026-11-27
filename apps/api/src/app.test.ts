import { HealthResponseSchema, TransactionDraftSchema } from "@voicekhata/shared";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("API health, OpenAPI playground, and voice sandbox endpoints", () => {
  const appPromise = buildApp({ allowedOrigin: "http://localhost:3000" });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("GET /healthz returns valid HealthResponseSchema payload", async () => {
    const app = await appPromise;
    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(HealthResponseSchema.safeParse(response.json()).success).toBe(true);
  });

  it("GET /api/v1/health returns valid HealthResponseSchema payload", async () => {
    const app = await appPromise;
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });

    expect(response.statusCode).toBe(200);
    expect(HealthResponseSchema.safeParse(response.json()).success).toBe(true);
  });

  it("GET /reference/ renders Scalar interactive API documentation for humans", async () => {
    const app = await appPromise;
    const response = await app.inject({ method: "GET", url: "/reference/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");

    const specResponse = await app.inject({ method: "GET", url: "/reference/openapi.json" });
    expect(specResponse.statusCode).toBe(200);
    expect((specResponse.json() as { openapi: string }).openapi).toMatch(/^3\./);
  });

  it("GET /api/v1/catalog/presets returns seeded items and rejects bad presets", async () => {
    const app = await appPromise;
    const ok = await app.inject({ method: "GET", url: "/api/v1/catalog/presets?preset=dairy" });
    expect(ok.statusCode).toBe(200);
    expect((ok.json() as { items: unknown[] }).items.length).toBeGreaterThan(0);

    const bad = await app.inject({ method: "GET", url: "/api/v1/catalog/presets?preset=invalid_shop" });
    expect(bad.statusCode).toBe(400);
  });

  it("POST /api/v1/sandbox/parse returns valid TransactionDraft and rejects empty transcript", async () => {
    const app = await appPromise;
    const ok = await app.inject({
      method: "POST",
      url: "/api/v1/sandbox/parse",
      payload: {
        transcript: "Ramesh ko 2 kilo chawal, 1 litre doodh, 100 rupaye jama",
        preset: "kirana"
      }
    });
    expect(ok.statusCode).toBe(200);
    const body = ok.json() as { draft: unknown };
    expect(TransactionDraftSchema.safeParse(body.draft).success).toBe(true);

    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/sandbox/parse",
      payload: { transcript: "" }
    });
    expect(bad.statusCode).toBe(400);
  });

  it("returns 404 for unknown routes", async () => {
    const app = await appPromise;
    const response = await app.inject({ method: "GET", url: "/api/v1/nonexistent" });

    expect(response.statusCode).toBe(404);
  });
});
