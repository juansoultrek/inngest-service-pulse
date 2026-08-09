# Inngest Service Pulse

A small Express + Inngest dashboard that pulses your stack’s **public status pages** (and an optional webhook URL) from one UI. Useful as a reliability / Inngest showcase: check latency + operational state, queue events, and skim a short run timeline.

No product API keys required for the default service list.

---

## Prerequisites

- **Node.js 20+**
- **npm** (this repo has a `package-lock.json`; prefer **`npm ci`**)

---

## Run on localhost (follow in order)

### 1. Install dependencies

At the repository root (directory that contains **`package.json`**):

```bash
npm ci
```

### 2. Create `.env` (optional)

```bash
cp .env.example .env
```

Defaults work without Inngest Cloud keys. The UI pulse still runs; event emission to Inngest is best-effort.

### 3. Start the development server

```bash
npm run dev
```

### 4. Open the app

Default URL:

**`http://localhost:8090`**

Also mounted under **`http://localhost:8090/inngest`** when `BASE_PATH=/inngest` (the default).

### 5. Try the UI

1. Click **Pulse All** (or start **Auto Pulse**).
2. Watch the service cards and the run timeline update.
3. Optionally enable **Webhook URL**, paste an HTTPS endpoint, and include it in the next pulse.

### 6. Health check (optional)

```bash
curl -sS http://localhost:8090/health
```

---

## What gets pulsed

| Service | Endpoint |
| --- | --- |
| GitHub API | `https://api.github.com/rate_limit` |
| GitHub Status | `https://www.githubstatus.com/api/v2/status.json` |
| Tavus Status | `https://status.tavus.io/api/v2/status.json` |
| Nango Status | `https://status.nango.dev/index.json` |
| Resend Status | `https://resend-status.com/api/v1/summary` |
| PostHog Status | `https://www.posthogstatus.com/api/status` |
| Supabase Status | `https://status.supabase.com/api/v2/status.json` |
| Webhook URL | Your URL (optional, off by default) |

Status-page checks parse the vendor JSON (not only HTTP 200), so a reported outage can show as **degraded** / **down**.

---

## Production-like local run

```bash
npm run build
npm start
```

**`npm start`** runs `node dist/server.js` and does **not** load `.env` by itself — export vars in the shell or your host’s process manager.

---

## Environment variables

See **[`.env.example`](.env.example)**.

| Variable | Purpose |
| --- | --- |
| `PORT` | Listen port; default `8090`. |
| `BASE_PATH` | Mount prefix; default `/inngest` (also served at `/` for local use). |
| `INNGEST_EVENT_KEY` | Optional; send pulse events to Inngest Cloud. |
| `INNGEST_SIGNING_KEY` | Optional; verify Inngest function invocations. |

---

## Deploy workflow (optional)

[`.github/workflows/deploy-ssh.yml`](.github/workflows/deploy-ssh.yml) is **optional**. It is wired for SSH/cPanel deploy (GitHub Secrets + remote extract + `tmp/restart.txt`).

If you clone this repo:

- You **do not need** that workflow to run the app locally.
- Leave it unused, delete it, or replace it with your own hosting.

### Typical cPanel shape

- **Node:** `20.x`
- **Startup file:** `dist/server.js`
- **App URL / `BASE_PATH`:** `/inngest`
- **Secrets:** `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USERNAME`, `DEPLOY_SSH_PRIVATE_KEY`, `DEPLOY_SSH_PORT`, `DEPLOY_REMOTE_APP_DIR`

---

## Commit style

`JuanSoulTrek Inngest Service Pulse | short imperative summary`

---

## License

ISC
