# Inngest Service Pulse

Service reliability dashboard powered by event-driven pulse workflows.

## What this MVP includes

- TypeScript backend with Express + Inngest SDK.
- Public-service pulse dashboard (no credentials required).
- Global `Pulse All` action with optional webhook URL checks.
- Inngest endpoints for event triggers and function execution.

## Run locally

```bash
npm install
npm run dev
```

Open:

- `http://localhost:8090`
- `http://localhost:8090/health`

## Next phase

- Connect UI controls to `/api/pulse/all` and live `/api/pulse/results`.
- Add persistent storage for pulse history and incidents.
- Add signed webhook validation for user-provided endpoints.

## cPanel + CI deployment

This project deploys with GitHub Actions over SSH.

### Deploy target folder

Use the app under a subpath such as:

- `/inngest`

Recommended remote app dir:

- `public_html/<your-domain>/inngest`

### GitHub Secrets

- `DEPLOY_SSH_HOST`
- `DEPLOY_SSH_USERNAME`
- `DEPLOY_SSH_PRIVATE_KEY`
- `DEPLOY_SSH_PORT`
- `DEPLOY_REMOTE_APP_DIR` (example: `public_html/<your-domain>/inngest`)

### Node app settings (cPanel)

- **Node version:** `20.x`
- **Application root:** `/home/<cpanel-user>/public_html/<your-domain>/inngest`
- **Application URL:** `<your-domain>/inngest`
- **Startup file:** `dist/server.js`
- **Restart trigger:** `tmp/restart.txt` (handled by CI)
- **CloudLinux note:** keep `node_modules` as Node Selector symlink (CI does not upload it).

### App environment variables

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `PORT` (optional; cPanel/Passenger usually injects it)

### Verify after deploy

- `https://<your-domain>/inngest/`
- `https://<your-domain>/inngest/health`
- `https://<your-domain>/inngest/api/inngest`
