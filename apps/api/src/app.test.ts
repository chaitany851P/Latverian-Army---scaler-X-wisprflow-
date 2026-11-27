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

    const hindi = await app.inject({
      method: "POST",
      url: "/api/v1/sandbox/parse",
      payload: {
        transcript: "रमेश भाई के खाते में 2 किलो खान 20 रुपए किलो",
        preset: "kirana"
      }
    });
    expect(hindi.statusCode).toBe(200);
    const hindiJson = hindi.json() as {
      subtotalPaise: number;
      draft: { paymentSplit: { udhaarPaise: number }; items: Array<{ skuId: string }> };
    };
    expect(hindiJson.draft.items[0]?.skuId).toBe("SKU_SUGAR");
    expect(hindiJson.subtotalPaise).toBe(4000);
    expect(hindiJson.draft.paymentSplit.udhaarPaise).toBe(4000);

    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/sandbox/parse",
      payload: { transcript: "" }
    });
    expect(bad.statusCode).toBe(400);
  });

  it("POST /api/v1/sandbox/parse supports in-place CORRECTION when activeResult is provided", async () => {
    const app = await appPromise;
    const initial = await app.inject({
      method: "POST",
      url: "/api/v1/sandbox/parse",
      payload: {
        transcript: "रमेश भाई के खाते में 2 किलो खान 20 रुपए किलो",
        preset: "kirana"
      }
    });
    expect(initial.statusCode).toBe(200);
    const activeResult = initial.json();

    const corrected = await app.inject({
      method: "POST",
      url: "/api/v1/sandbox/parse",
      payload: {
        transcript: "Nahi 2 nahi 1 kilo",
        preset: "kirana",
        activeResult
      }
    });
    expect(corrected.statusCode).toBe(200);
    const body = corrected.json() as {
      subtotalPaise: number;
      draft: { intent: string; items: Array<{ skuId: string; quantityBase: number }> };
    };
    expect(body.draft.intent).toBe("CORRECTION");
    expect(body.draft.items[0]?.skuId).toBe("SKU_SUGAR");
    expect(body.draft.items[0]?.quantityBase).toBe(1000);
    expect(body.subtotalPaise).toBe(2000);
  });

  it("GET /healthz returns 503 degraded when DATABASE_URL is unreachable", async () => {
    const previousDbUrl = process.env["DATABASE_URL"];
    process.env["DATABASE_URL"] = "postgresql://voicekhata:bad@127.0.0.1:1/voicekhata";
    const failingApp = await buildApp({ allowedOrigin: "http://localhost:3000" });
    try {
      const response = await failingApp.inject({ method: "GET", url: "/healthz" });
      expect(response.statusCode).toBe(503);
      const parsed = HealthResponseSchema.safeParse(response.json());
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.status).toBe("degraded");
      }
    } finally {
      await failingApp.close();
      if (previousDbUrl === undefined) {
        delete process.env["DATABASE_URL"];
      } else {
        process.env["DATABASE_URL"] = previousDbUrl;
      }
    }
  });

  it("returns 404 for unknown routes", async () => {
    const app = await appPromise;
    const response = await app.inject({ method: "GET", url: "/api/v1/nonexistent" });

    expect(response.statusCode).toBe(404);
  });
});
