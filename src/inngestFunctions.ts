import { inngest } from "./inngestClient.js";
import { addResult } from "./store.js";
import { PulseResultStatus, ServiceConfig } from "./types.js";

function evaluateStatus(statusCode: number, latencyMs: number): PulseResultStatus {
  if (statusCode >= 500 || latencyMs > 3000) return "down";
  if (statusCode >= 400 || latencyMs > 1200) return "degraded";
  return "healthy";
}

async function checkService(service: ServiceConfig) {
  const startedAt = Date.now();
  try {
    const response = await fetch(service.endpoint, {
      method: "GET",
      headers: { "User-Agent": "inngest-service-pulse" },
    });
    const latencyMs = Date.now() - startedAt;
    return {
      service,
      statusCode: response.status,
      latencyMs,
      status: evaluateStatus(response.status, latencyMs),
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    return {
      service,
      statusCode: 0,
      latencyMs,
      status: "down" as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const pulseAllRequested = inngest.createFunction(
  { id: "pulse-all-requested", triggers: [{ event: "pulse/all.requested" }] },
  async ({ event, step }) => {
    const services = (event.data.services ?? []) as ServiceConfig[];
    for (const service of services) {
      await step.sendEvent(`queue-${service.key}`, {
        name: "pulse/service.requested",
        data: { service },
      });
    }
    return { queued: services.length };
  }
);

export const pulseServiceRequested = inngest.createFunction(
  {
    id: "pulse-service-requested",
    retries: 2,
    triggers: [{ event: "pulse/service.requested" }],
  },
  async ({ event, step }) => {
    const service = event.data.service as ServiceConfig;

    const checked = await step.run("check-service", async () => checkService(service));
    const checkedAt = new Date().toISOString();

    await step.run("store-result", async () => {
      const checkedError = "error" in checked ? checked.error : undefined;
      addResult({
        key: service.key,
        serviceId: service.serviceId,
        label: service.label,
        endpoint: service.endpoint,
        status: checked.status,
        statusCode: checked.statusCode,
        latencyMs: checked.latencyMs,
        checkedAt,
        error: checkedError,
      });
    });

    await step.sendEvent("emit-service-checked", {
      name: "pulse/service.checked",
      data: {
        key: service.key,
        label: service.label,
        status: checked.status,
        statusCode: checked.statusCode,
        latencyMs: checked.latencyMs,
        checkedAt,
      },
    });

    if (checked.status !== "healthy") {
      const checkedError = "error" in checked ? checked.error : undefined;
      await step.sendEvent("emit-incident", {
        name: "pulse/incident.changed",
        data: {
          key: service.key,
          label: service.label,
          state: "opened",
          reason: checkedError ?? `status=${checked.statusCode}`,
          checkedAt,
        },
      });
    }

    return checked;
  }
);

