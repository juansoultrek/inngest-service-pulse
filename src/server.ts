import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "inngest/express";
import { inngest } from "./inngestClient.js";
import { pulseAllRequested, pulseServiceRequested } from "./inngestFunctions.js";
import { listResults, serviceDefaults } from "./store.js";
import { ServiceConfig } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const app = express();
const port = Number(process.env.PORT ?? 8090);
const basePathRaw = process.env.BASE_PATH ?? "/inngest";
const basePath =
  basePathRaw === "/" ? "" : `/${basePathRaw.replace(/^\/+|\/+$/g, "")}`;

app.use(express.json());
app.use(express.static(rootDir));

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "inngest-service-pulse",
    basePath: basePath || "/",
    ts: new Date().toISOString(),
  });
});

router.get("/api/pulse/services", (_req, res) => {
  res.json({ services: serviceDefaults });
});

router.get("/api/pulse/results", (_req, res) => {
  res.json({ results: listResults() });
});

router.post("/api/pulse/all", async (req, res) => {
  const provided = req.body?.services as ServiceConfig[] | undefined;
  const services = (provided?.length ? provided : serviceDefaults)
    .filter((service) => service.enabled)
    .filter((service) => !service.isWebhook || Boolean(service.endpoint));

  await inngest.send({
    name: "pulse/all.requested",
    data: { services, requestedAt: new Date().toISOString() },
  });

  res.json({ ok: true, queued: services.length });
});

router.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [pulseAllRequested, pulseServiceRequested],
  })
);

router.get("/", (_req, res) => {
  res.sendFile(path.resolve(rootDir, "index.html"));
});

if (basePath) {
  app.use(basePath, router);
}

// Root mount for local dev and environments without a path prefix.
app.use("/", router);

app.listen(port, () => {
  console.log(
    `Inngest Service Pulse running on http://localhost:${port}${basePath || "/"}`
  );
});

