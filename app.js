const services = [];

const grid = document.querySelector("#service-grid");
const timeline = document.querySelector("#timeline");
const pulseAllButton = document.querySelector("#pulse-all");
const autoPulseButton = document.querySelector("#autopulse");
const lastRun = document.querySelector("#last-run");
const webhookNote = document.querySelector("#webhook-note");

const state = new Map();
let autoPulseId = null;

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} -> ${response.status}`);
  }
  return response.json();
}

async function loadServices() {
  const payload = await apiJson("./api/pulse/services");
  services.length = 0;
  for (const service of payload.services || []) {
    services.push({
      ...service,
      eventLabel: service.label,
      isWebhook: Boolean(service.isWebhook) || service.key === "webhook",
    });
  }
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
  timeline.append(entry);
  while (timeline.children.length > 10) {
    timeline.removeChild(timeline.firstChild);
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
    card.className = service.isWebhook ? "card webhook-card" : "card";

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
    eventBadge.textContent = service.isWebhook
      ? "WEBHOOK_URL"
      : `#${service.serviceId}  ${service.eventLabel}`;
    card.appendChild(eventBadge);

    const endpoint = document.createElement("p");
    endpoint.textContent = service.isWebhook
      ? "Optional branch. Used only if enabled and URL is provided."
      : `Endpoint: ${service.endpoint}`;
    endpoint.className = "endpoint-url";
    card.appendChild(endpoint);

    if (service.isWebhook) {
      const configured = document.createElement("p");
      configured.className = "endpoint-url";
      configured.textContent = serviceState.endpoint
        ? `Configured URL: ${serviceState.endpoint}`
        : "Configured URL: (empty)";
      card.appendChild(configured);
    }

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
        service.enabled = checkbox.checked;
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
        service.endpoint = serviceState.endpoint;
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

function applyResult(result) {
  const serviceState = state.get(result.key);
  if (!serviceState) return;
  serviceState.status = result.status;
  serviceState.latencyMs = result.latencyMs;
  serviceState.lastCheck = new Date(result.checkedAt).toLocaleTimeString();
  serviceState.failures = result.status === "healthy" ? 0 : serviceState.failures + 1;
}

async function refreshResults() {
  const payload = await apiJson("./api/pulse/results");
  const results = payload.results || [];

  results.forEach((result) => applyResult(result));
  renderCards();

  timeline.innerHTML = "";
  results
    .slice(0, 10)
    .reverse()
    .forEach((result) => {
      const checkedAt = new Date(result.checkedAt).toLocaleTimeString();
      appendTimeline(
        result.key === "webhook"
          ? `[${checkedAt}] [WEBHOOK_URL] ${result.status.toUpperCase()} ${result.latencyMs}MS`
          : `[${checkedAt}] [#${result.serviceId}] [${result.label}] ${result.status.toUpperCase()} ${result.latencyMs}MS`,
        result.key
      );
    });
}

async function pulseAll() {
  setWebhookNote();

  const payloadServices = services.map((service) => {
    const serviceState = state.get(service.key);
    if (service.isWebhook && serviceState.enabled && !serviceState.endpoint) {
      setWebhookNote(
        "WEBHOOK_URL is enabled but missing URL. Add webhook URL to include it in Pulse All."
      );
      appendTimeline(
        `[${nowLabel()}] [${service.eventLabel}] SKIPPED (ENABLED WITHOUT URL)`,
        service.key
      );
    }
    return {
      ...service,
      enabled: serviceState.enabled,
      endpoint: serviceState.endpoint,
      label: service.eventLabel,
    };
  });

  try {
    const queued = await apiJson("./api/pulse/all", {
      method: "POST",
      body: JSON.stringify({ services: payloadServices }),
    });
    appendTimeline(`[${nowLabel()}] [SYSTEM] PULSE_ALL QUEUED ${queued.queued}`, "webhook");
    lastRun.textContent = `Last run: ${nowLabel()}`;

    setTimeout(() => {
      refreshResults().catch((error) => {
        appendTimeline(`[${nowLabel()}] [SYSTEM] REFRESH FAILED: ${error.message}`, "webhook");
      });
    }, 1500);
  } catch (error) {
    appendTimeline(
      `[${nowLabel()}] [SYSTEM] PULSE_ALL FAILED: ${error instanceof Error ? error.message : "UNKNOWN"}`,
      "webhook"
    );
    return;
  }
}

function toggleAutoPulse() {
  if (autoPulseId) {
    clearInterval(autoPulseId);
    autoPulseId = null;
    autoPulseButton.textContent = "Start Auto Pulse (5s)";
    appendTimeline(`[${nowLabel()}] [SYSTEM] AUTO_PULSE STOPPED`, "webhook");
    return;
  }
  autoPulseId = setInterval(() => {
    pulseAll().catch((error) => {
      appendTimeline(`[${nowLabel()}] [SYSTEM] AUTO_PULSE ERROR: ${error.message}`, "webhook");
    });
  }, 5000);
  autoPulseButton.textContent = "Stop Auto Pulse";
  appendTimeline(`[${nowLabel()}] [SYSTEM] AUTO_PULSE STARTED (5S)`, "webhook");
}

async function init() {
  try {
    await loadServices();
  } catch (error) {
    appendTimeline(
      `[${nowLabel()}] [SYSTEM] SERVICE LOAD FAILED: ${error instanceof Error ? error.message : "UNKNOWN"}`,
      "webhook"
    );
    return;
  }

  services.forEach((service) => {
    state.set(service.key, {
      status: "degraded",
      latencyMs: 0,
      failures: 0,
      lastCheck: "",
      enabled: Boolean(service.enabled),
      endpoint: service.endpoint || "",
    });
  });
  renderCards();
  pulseAllButton.addEventListener("click", () => {
    pulseAll().catch((error) => {
      appendTimeline(`[${nowLabel()}] [SYSTEM] CLICK ERROR: ${error.message}`, "webhook");
    });
  });
  autoPulseButton.addEventListener("click", toggleAutoPulse);
  appendTimeline(`[${nowLabel()}] [SYSTEM] DASHBOARD INITIALIZED`, "webhook");
  await refreshResults();
}

init().catch((error) => {
  appendTimeline(`[${nowLabel()}] [SYSTEM] INIT FAILED: ${error.message}`, "webhook");
});
