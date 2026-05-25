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

## Namecheap + CI deployment

This project deploys with GitHub Actions over SSH using the same secret names as your other projects.

### Deploy target folder

Use the app under:

- `/inngest`

Recommended remote app dir:

- `public_html/juansoultrek.com/inngest`

### GitHub Secrets (same names as existing projects)

- `DEPLOY_SSH_HOST`
- `DEPLOY_SSH_USERNAME`
- `DEPLOY_SSH_PRIVATE_KEY`
- `DEPLOY_SSH_PORT`
- `DEPLOY_REMOTE_APP_DIR` (set to `public_html/juansoultrek.com/inngest`)

### Node app settings (cPanel)

- **Node version:** `20.x`
- **Application root:** `/home/badgroovy/public_html/juansoultrek.com/inngest`
- **Application URL:** `juansoultrek.com/inngest`
- **Startup file:** `dist/server.js`
- **Restart trigger:** `tmp/restart.txt` (handled by CI)

### App environment variables

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `PORT` (optional; cPanel/Passenger usually injects it)

### Verify after deploy

- `https://juansoultrek.com/inngest/`
- `https://juansoultrek.com/inngest/health`
- `https://juansoultrek.com/inngest/api/inngest`
