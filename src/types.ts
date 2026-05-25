export type ServiceKey =
  | "webhook"
  | "github-api"
  | "github-status"
  | "npm-ping"
  | "jsonplaceholder";

export type ServiceType = "api" | "webhook_url";

export type ServiceConfig = {
  key: ServiceKey;
  serviceId: number;
  label: string;
  name: string;
  type: ServiceType;
  endpoint: string;
  enabled: boolean;
  isWebhook?: boolean;
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

