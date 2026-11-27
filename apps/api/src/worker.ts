import { PgBoss } from "pg-boss";

const connectionString =
  process.env["DATABASE_URL"] ?? "postgresql://voicekhata:change_me_local_dev@localhost:5432/voicekhata";

const boss = new PgBoss(connectionString);

boss.on("error", (err: unknown) => {
  console.error("[worker] pg-boss error", err);
});

async function start() {
  await boss.start();
  console.info("[worker] pg-boss connected; awaiting scheduled copilot jobs");
}

async function stop(signal: string) {
  console.info(`[worker] received ${signal}, draining queue`);
  await boss.stop();
  process.exit(0);
}

process.on("SIGINT", () => void stop("SIGINT"));
process.on("SIGTERM", () => void stop("SIGTERM"));

await start();
