export type ServiceKey =
  | "webhook"
  | "github-api"
  | "github-status"
  | "tavus-status"
  | "nango-status"
  | "resend-status"
  | "posthog-status"
  | "supabase-status";

export type ServiceType = "api" | "webhook_url";

/** How to interpret the response body for health. */
export type StatusProvider =
  | "http"
  | "statuspage"
  | "betterstack"
  | "incident_io_summary"
  | "posthog_status";

export type ServiceConfig = {
  key: ServiceKey;
  serviceId: number;
  label: string;
  name: string;
  type: ServiceType;
  endpoint: string;
  enabled: boolean;
  isWebhook?: boolean;
  statusProvider?: StatusProvider;
};

export type PulseResultStatus = "healthy" | "degraded" | "down";

export type PulseResult = {
  key: ServiceKey;
  serviceId: number;
  label: string;
  endpoint: string;
  status: PulseResultStatus;
  statusCode: number;
  latencyMs: number;
  checkedAt: string;
  error?: string;
};
