import { PulseResult, ServiceConfig } from "./types.js";

export const serviceDefaults: ServiceConfig[] = [
  {
    key: "webhook",
    serviceId: 5,
    label: "WEBHOOK_URL",
    name: "Webhook URL",
    type: "webhook_url",
    endpoint: "",
    enabled: false,
  },
  {
    key: "github-api",
    serviceId: 1,
    label: "GITHUB_API",
    name: "GitHub API",
    type: "api",
    endpoint: "https://api.github.com/rate_limit",
    enabled: true,
  },
  {
    key: "github-status",
    serviceId: 2,
    label: "GITHUB_STATUS",
    name: "GitHub Status",
    type: "api",
    endpoint: "https://www.githubstatus.com/api/v2/status.json",
    enabled: true,
  },
  {
    key: "npm-ping",
    serviceId: 3,
    label: "NPM_PIN",
    name: "NPM PIN",
    type: "api",
    endpoint: "https://registry.npmjs.org/-/ping",
    enabled: true,
  },
  {
    key: "jsonplaceholder",
    serviceId: 4,
    label: "JSON_PLASTHORDEN",
    name: "JSON Plasthorden",
    type: "api",
    endpoint: "https://jsonplaceholder.typicode.com/posts/1",
    enabled: true,
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

