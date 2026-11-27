import { buildApp } from "./app.js";

const host = process.env["API_HOST"] ?? "0.0.0.0";
const port = Number(process.env["API_PORT"] ?? 4000);

const app = await buildApp();

async function shutdown(signal: string) {
  app.log.info({ signal }, "Shutting down API server");
  await app.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host, port });
