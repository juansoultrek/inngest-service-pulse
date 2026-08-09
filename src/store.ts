import { PulseResult, ServiceConfig } from "./types.js";

export const serviceDefaults: ServiceConfig[] = [
  {
    key: "webhook",
    serviceId: 0,
    label: "WEBHOOK_URL",
    name: "Webhook URL",
    type: "webhook_url",
    endpoint: "",
    enabled: false,
  },
  {
    key: "github-status",
    serviceId: 1,
    label: "GITHUB_STATUS",
    name: "GitHub Status",
    type: "api",
    endpoint: "https://www.githubstatus.com/api/v2/status.json",
    enabled: true,
    statusProvider: "statuspage",
  },
  {
    key: "tavus-status",
    serviceId: 2,
    label: "TAVUS_STATUS",
    name: "Tavus Status",
    type: "api",
    endpoint: "https://status.tavus.io/api/v2/status.json",
    enabled: true,
    statusProvider: "statuspage",
  },
  {
    key: "nango-status",
    serviceId: 3,
    label: "NANGO_STATUS",
    name: "Nango Status",
    type: "api",
    endpoint: "https://status.nango.dev/index.json",
    enabled: true,
    statusProvider: "betterstack",
  },
  {
    key: "resend-status",
    serviceId: 4,
    label: "RESEND_STATUS",
    name: "Resend Status",
    type: "api",
    endpoint: "https://resend-status.com/api/v1/summary",
    enabled: true,
    statusProvider: "incident_io_summary",
  },
  {
    key: "posthog-status",
    serviceId: 5,
    label: "POSTHOG_STATUS",
    name: "PostHog Status",
    type: "api",
    endpoint: "https://www.posthogstatus.com/api/status",
    enabled: true,
    statusProvider: "posthog_status",
  },
  {
    key: "supabase-status",
    serviceId: 6,
    label: "SUPABASE_STATUS",
    name: "Supabase Status",
    type: "api",
    endpoint: "https://status.supabase.com/api/v2/status.json",
    enabled: true,
    statusProvider: "statuspage",
  },
];

const results: PulseResult[] = [];

export function addResult(result: PulseResult) {
  results.unshift(result);
  if (results.length > 100) results.pop();
}

export function listResults() {
  return results;
}
