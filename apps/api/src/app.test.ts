import { HealthResponseSchema } from "@voicekhata/shared";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("API health endpoints", () => {
  const appPromise = buildApp({ allowedOrigin: "http://localhost:3000" });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("GET /healthz returns valid HealthResponseSchema payload", async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: "GET",
      url: "/healthz"
    });

    expect(response.statusCode).toBe(200);
    const parsed = HealthResponseSchema.safeParse(response.json());
    expect(parsed.success).toBe(true);
  });

  it("GET /api/v1/health returns valid HealthResponseSchema payload", async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health"
    });

    expect(response.statusCode).toBe(200);
    const parsed = HealthResponseSchema.safeParse(response.json());
    expect(parsed.success).toBe(true);
  });

  it("returns 404 for unknown routes", async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nonexistent"
    });

    expect(response.statusCode).toBe(404);
  });
});
