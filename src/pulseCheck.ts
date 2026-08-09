import { PulseResultStatus, ServiceConfig, StatusProvider } from "./types.js";

export type CheckedService = {
  service: ServiceConfig;
  statusCode: number;
  latencyMs: number;
  status: PulseResultStatus;
  error?: string;
};

export function evaluateHttpStatus(
  statusCode: number,
  latencyMs: number
): PulseResultStatus {
  if (statusCode >= 500 || latencyMs > 3000) return "down";
  if (statusCode >= 400 || latencyMs > 1200) return "degraded";
  return "healthy";
}

/** @deprecated use evaluateHttpStatus */
export const evaluateStatus = evaluateHttpStatus;

function fromStatuspageIndicator(indicator: unknown): PulseResultStatus | null {
  if (typeof indicator !== "string") return null;
  switch (indicator.toLowerCase()) {
    case "none":
      return "healthy";
    case "minor":
      return "degraded";
    case "major":
    case "critical":
      return "down";
    default:
      return null;
  }
}

function fromNamedState(state: unknown): PulseResultStatus | null {
  if (typeof state !== "string") return null;
  switch (state.toLowerCase().replace(/\s+/g, "_")) {
    case "operational":
    case "none":
    case "up":
      return "healthy";
    case "degraded":
    case "degraded_performance":
    case "partial_outage":
    case "maintenance":
    case "under_maintenance":
      return "degraded";
    case "downtime":
    case "major_outage":
    case "outage":
    case "down":
    case "critical":
      return "down";
    default:
      return null;
  }
}

export function evaluateProviderStatus(
  provider: StatusProvider | undefined,
  body: unknown,
  statusCode: number,
  latencyMs: number
): PulseResultStatus {
  if (statusCode >= 500) return "down";
  if (statusCode >= 400) return "degraded";

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  if (provider === "statuspage" && data) {
    const status = data.status as Record<string, unknown> | undefined;
    const mapped = fromStatuspageIndicator(status?.indicator);
    if (mapped) return worstOf(mapped, latencyFloor(latencyMs));
  }

  if (provider === "betterstack" && data) {
    const nested = data.data as Record<string, unknown> | undefined;
    const attrs = nested?.attributes as Record<string, unknown> | undefined;
    const mapped = fromNamedState(attrs?.aggregate_state);
    if (mapped) return worstOf(mapped, latencyFloor(latencyMs));
  }

  if (provider === "incident_io_summary" && data) {
    const incidents = Array.isArray(data.ongoing_incidents)
      ? data.ongoing_incidents
      : [];
    if (incidents.length === 0) return worstOf("healthy", latencyFloor(latencyMs));
    const severities = incidents.map((incident) => {
      if (!incident || typeof incident !== "object") return "degraded" as PulseResultStatus;
      const severity = String(
        (incident as Record<string, unknown>).status ??
          (incident as Record<string, unknown>).severity ??
          ""
      ).toLowerCase();
      if (severity.includes("outage") || severity.includes("critical")) return "down";
      return "degraded";
    });
    return worstOf(
      severities.includes("down") ? "down" : "degraded",
      latencyFloor(latencyMs)
    );
  }

  if (provider === "posthog_status" && data) {
    const mapped = fromNamedState(data.overall_status);
    if (mapped) return worstOf(mapped, latencyFloor(latencyMs));
  }

  return evaluateHttpStatus(statusCode, latencyMs);
}

/** Status pages are often slower than product APIs; only flag extreme latency. */
function latencyFloor(latencyMs: number): PulseResultStatus {
  if (latencyMs > 8000) return "down";
  if (latencyMs > 5000) return "degraded";
  return "healthy";
}

function worstOf(a: PulseResultStatus, b: PulseResultStatus): PulseResultStatus {
  const rank = { healthy: 0, degraded: 1, down: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
}

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function checkService(service: ServiceConfig): Promise<CheckedService> {
  const startedAt = Date.now();
  try {
    const response = await fetch(service.endpoint, {
      method: "GET",
      headers: {
        "User-Agent": "inngest-service-pulse",
        Accept: "application/json, text/plain, */*",
      },
    });
    const latencyMs = Date.now() - startedAt;
    const body = await readBody(response);
    return {
      service,
      statusCode: response.status,
      latencyMs,
      status: evaluateProviderStatus(
        service.statusProvider,
        body,
        response.status,
        latencyMs
      ),
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    return {
      service,
      statusCode: 0,
      latencyMs,
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
