# VoicePilot Dashboard — Phase 2

Next.js App Router frontend for the Phase 1 FastAPI backend. Access tokens are set as HttpOnly cookies by Next route handlers; browser code calls a same-origin API proxy and never receives or stores the bearer token.

## Requirements

- Node.js 20.9 or later
- The Phase 1 backend running at `http://127.0.0.1:8000` (or set another backend URL)

## Run the app

From the VoicePilot project root, start FastAPI in one terminal:

```powershell
cd backend
Copy-Item .env.example .env
python -m uvicorn voicepilot.main:app --reload
```

In a second terminal, from the VoicePilot project root, start Next.js:

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The API URL is configured with server-only `BACKEND_API_URL` in `.env.local`.

## Checks

```powershell
npm run typecheck
npm run lint
npm run build
npm audit
```

## Backend-backed features

- Registration, login, logout, and authenticated route protection.
- Initial business onboarding, business profile, hours, timezone, and services.
- Overview, latest calls and details, appointments, receptionist configuration, Google Calendar status, and read-only account settings.
- Search/status filters for loaded call and appointment records; the Phase 1 list endpoints return at most 100 records and do not provide date-range filters or total counts.

Google Calendar is shown as disconnected and OAuth actions are disabled because the backend does not implement OAuth. Appointment entries created in the dashboard remain pending; no calendar booking is implied. Call recording/playback, AI execution, conversation preview, handoff execution, account/password edits, and business description are not available through the current backend and are not simulated here.

## Authentication boundary

The backend issues short-lived JWTs. Next stores them in a `voicepilot_session` HttpOnly, SameSite=Lax cookie (Secure in production) and forwards them server-side to FastAPI. A same-origin check protects state-changing API proxy calls. `BACKEND_API_URL` is server-only; no backend token or API credential is exposed to browser JavaScript.
