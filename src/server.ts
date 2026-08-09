import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "inngest/express";
import { inngest } from "./inngestClient.js";
import { pulseAllRequested, pulseServiceRequested } from "./inngestFunctions.js";
import { addResult, listResults, serviceDefaults } from "./store.js";
import { ServiceConfig } from "./types.js";
import { checkService } from "./pulseCheck.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const app = express();
const port = Number(process.env.PORT ?? 8090);
const basePathRaw = process.env.BASE_PATH ?? "/inngest";
const basePath =
  basePathRaw === "/" ? "" : `/${basePathRaw.replace(/^\/+|\/+$/g, "")}`;

app.use(express.json());

const router = express.Router();
router.use(express.static(rootDir));

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
  const allowedKeys = new Set(serviceDefaults.map((service) => service.key));
  const fromClient = (provided ?? []).filter((service) => allowedKeys.has(service.key));
  const services = (fromClient.length ? fromClient : serviceDefaults)
    .filter((service) => service.enabled)
    .filter((service) => !service.isWebhook || Boolean(service.endpoint));

  const checks = await Promise.all(services.map((service) => checkService(service)));
  const checkedAt = new Date().toISOString();

  checks.forEach((checked) => {
    const checkedError = "error" in checked ? checked.error : undefined;
    addResult({
      key: checked.service.key,
      serviceId: checked.service.serviceId,
      label: checked.service.label,
      endpoint: checked.service.endpoint,
      status: checked.status,
      statusCode: checked.statusCode,
      latencyMs: checked.latencyMs,
      checkedAt,
      error: checkedError,
    });
  });

  // Best effort event emission for Inngest observability, without blocking UI behavior.
  try {
    await inngest.send({
      name: "pulse/all.requested",
      data: { services, requestedAt: checkedAt },
    });
  } catch (_error) {
    // noop: local and UI pulse should still work even if cloud/event key is not set.
  }

  res.json({ ok: true, queued: services.length, results: checks });
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

