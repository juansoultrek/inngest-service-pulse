const services = [
  {
    key: "webhook",
    serviceId: 5,
    eventLabel: "WEBHOOK_URL",
    name: "Webhook URL",
    endpoint: "",
    defaultEnabled: false,
    isWebhook: true,
  },
  {
    key: "github-api",
    serviceId: 1,
    eventLabel: "GITHUB_API",
    name: "GitHub API",
    endpoint: "https://api.github.com/rate_limit",
    defaultEnabled: true,
  },
  {
    key: "github-status",
    serviceId: 2,
    eventLabel: "GITHUB_STATUS",
    name: "GitHub Status",
    endpoint: "https://www.githubstatus.com/api/v2/status.json",
    defaultEnabled: true,
  },
  {
    key: "npm-ping",
    serviceId: 3,
    eventLabel: "NPM_PIN",
    name: "NPM PIN",
    endpoint: "https://registry.npmjs.org/-/ping",
    defaultEnabled: true,
  },
  {
    key: "jsonplaceholder",
    serviceId: 4,
    eventLabel: "JSON_PLASTHORDEN",
    name: "JSON Plasthorden",
    endpoint: "https://jsonplaceholder.typicode.com/posts/1",
    defaultEnabled: true,
  },
];

const grid = document.querySelector("#service-grid");
const timeline = document.querySelector("#timeline");
const pulseAllButton = document.querySelector("#pulse-all");
const autoPulseButton = document.querySelector("#autopulse");
const lastRun = document.querySelector("#last-run");
const webhookNote = document.querySelector("#webhook-note");

const state = new Map();
let autoPulseId = null;

function randomLatency() {
  return Math.floor(Math.random() * 900) + 70;
}

function nextStatus() {
  const n = Math.random();
  if (n < 0.75) return "healthy";
  if (n < 0.92) return "degraded";
  return "down";
}

function statusLabel(status) {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Degraded";
  return "Down";
}

function nowLabel() {
  return new Date().toLocaleTimeString();
}

function appendTimeline(text, key = "webhook") {
  const entry = document.createElement("div");
  entry.className = `entry entry-${key}`;
  entry.textContent = text;
  timeline.prepend(entry);
  while (timeline.children.length > 10) {
    timeline.removeChild(timeline.lastChild);
  }
}

function setWebhookNote(message = "") {
  if (!message) {
    webhookNote.textContent = "";
    webhookNote.classList.remove("visible");
    return;
  }
  webhookNote.textContent = message;
  webhookNote.classList.add("visible");
}

function renderCards() {
  grid.innerHTML = "";

  services.forEach((service) => {
    const serviceState = state.get(service.key);
    const card = document.createElement("article");
    card.className = "card";

    const heading = document.createElement("h3");
    heading.textContent = service.name;
    card.appendChild(heading);

    const eventBadge = document.createElement("span");
    const eventClass =
      service.key === "webhook"
        ? "event-e5"
        : service.key === "github-api"
          ? "event-e1"
          : service.key === "github-status"
            ? "event-e2"
            : service.key === "npm-ping"
              ? "event-e3"
              : "event-e4";
    eventBadge.className = `event-id ${eventClass}`;
    eventBadge.textContent = `#${service.serviceId}  ${service.eventLabel}`;
    card.appendChild(eventBadge);

    const endpoint = document.createElement("p");
    endpoint.textContent = service.isWebhook
      ? "Optional branch. Used only if enabled and URL is provided."
      : service.endpoint;
    card.appendChild(endpoint);

    const statusRow = document.createElement("div");
    statusRow.className = "status-row";
    statusRow.innerHTML = `
      <span class="dot ${serviceState.status}"></span>
      <strong>${statusLabel(serviceState.status)}</strong>
      <span class="muted">Latency: ${serviceState.latencyMs}ms</span>
    `;
    card.appendChild(statusRow);

    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `Last check: ${serviceState.lastCheck || "never"} | Consecutive failures: ${serviceState.failures}`;
    card.appendChild(meta);

    if (service.isWebhook) {
      const wrapper = document.createElement("div");
      wrapper.className = "webhook-config";

      const label = document.createElement("label");
      label.className = "check";
      label.innerHTML = `
        <input type="checkbox" ${serviceState.enabled ? "checked" : ""} />
        Use in Pulse All
      `;
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => {
        serviceState.enabled = checkbox.checked;
        appendTimeline(
          `[${nowLabel()}] [${service.eventLabel}] ${serviceState.enabled ? "ENABLED" : "DISABLED"} IN PULSE_ALL`,
          service.key
        );
        setWebhookNote();
        renderCards();
      });

      const input = document.createElement("input");
      input.type = "url";
      input.placeholder = "https://example.com/webhook";
      input.value = serviceState.endpoint;
      input.addEventListener("change", () => {
        serviceState.endpoint = input.value.trim();
        appendTimeline(
          `[${nowLabel()}] [${service.eventLabel}] URL UPDATED`,
          service.key
        );
        setWebhookNote();
      });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      card.appendChild(wrapper);
    }

    grid.appendChild(card);
  });
}

function runPulse(service) {
  const serviceState = state.get(service.key);
  const status = nextStatus();
  const latency = randomLatency();

  serviceState.status = status;
  serviceState.latencyMs = latency;
  serviceState.lastCheck = nowLabel();
  serviceState.failures = status === "healthy" ? 0 : serviceState.failures + 1;

  appendTimeline(
    `[${serviceState.lastCheck}] [#${service.serviceId}] [${service.eventLabel}] ${status.toUpperCase()} ${latency}MS`,
    service.key
  );
}

function pulseAll() {
  setWebhookNote();

  services.forEach((service) => {
    const serviceState = state.get(service.key);
    if (service.isWebhook) {
      if (!serviceState.enabled || !serviceState.endpoint) {
        if (service.isWebhook) {
          setWebhookNote(
            "WEBHOOK_URL is enabled but missing URL. Add webhook URL to include it in Pulse All."
          );
        }
        appendTimeline(
          `[${nowLabel()}] [${service.eventLabel}] SKIPPED (DISABLED OR URL MISSING)`,
          service.key
        );
        return;
      }
    }
    runPulse(service);
  });
  lastRun.textContent = `Last run: ${nowLabel()}`;
  renderCards();
}

function toggleAutoPulse() {
  if (autoPulseId) {
    clearInterval(autoPulseId);
    autoPulseId = null;
    autoPulseButton.textContent = "Start Auto Pulse (5s)";
    appendTimeline(`[${nowLabel()}] [SYSTEM] AUTO_PULSE STOPPED`, "webhook");
    return;
  }
  autoPulseId = setInterval(pulseAll, 5000);
  autoPulseButton.textContent = "Stop Auto Pulse";
  appendTimeline(`[${nowLabel()}] [SYSTEM] AUTO_PULSE STARTED (5S)`, "webhook");
}

function init() {
  services.forEach((service) => {
    state.set(service.key, {
      status: "degraded",
      latencyMs: 0,
      failures: 0,
      lastCheck: "",
      enabled: service.defaultEnabled,
      endpoint: service.endpoint,
    });
  });
  renderCards();
  pulseAllButton.addEventListener("click", pulseAll);
  autoPulseButton.addEventListener("click", toggleAutoPulse);
  appendTimeline(`[${nowLabel()}] [SYSTEM] DASHBOARD INITIALIZED`, "webhook");
}

init();
