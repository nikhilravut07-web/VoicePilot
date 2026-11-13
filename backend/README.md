# VoicePilot Backend — Phase 1

FastAPI backend foundation for the VoicePilot business dashboard. This phase does not implement a frontend, telephony/audio service, Gemini, Google OAuth, or calendar synchronization.

## Requirements

- Python 3.11 or later
- SQLite (built into Python for local development)
- PostgreSQL can be used later through SQLAlchemy by setting a PostgreSQL `DATABASE_URL` and installing the matching driver.

For PostgreSQL, install `psycopg[binary]` in the environment before using a `postgresql+psycopg://...` URL. PostgreSQL is supported by the model design but is not exercised by this phase's tests.

## Run locally

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn voicepilot.main:app --reload
```

Open Swagger UI at `http://127.0.0.1:8000/docs`; health check: `http://127.0.0.1:8000/healthz`.
The default SQLite database is created at `backend/voicepilot.db` on first app startup. Set a stable `SECRET_KEY` in `.env` for a persistent local login session; without it, tokens are invalidated when the process restarts. Production mode refuses the development seed option and requires a supplied 32-character secret.

## Optional development seed

Seeding is off by default and refuses to run unless `APP_ENV=development`, `SEED_DEMO_DATA=true`, and `SEED_EMAIL` plus a `SEED_PASSWORD` of at least 12 characters are set. The seed contains one clearly labelled sample business, service, call, pending appointment, disconnected Google Calendar placeholder, and config. Never use these sample records as real business data.

```powershell
$env:APP_ENV = "development"
$env:SEED_DEMO_DATA = "true"
$env:SEED_EMAIL = "owner@example.com"
$env:SEED_PASSWORD = "set-a-unique-demo-password"
python -m voicepilot.seed
```

## Run tests

```powershell
python -m pytest
```

## Authentication

Register with `POST /api/v1/auth/register` (minimum password length 12), or sign in at `POST /api/v1/auth/login`. Send the returned access token as `Authorization: Bearer <token>`. Passwords use Argon2id via `pwdlib`; tokens are signed HS256 JWTs with a configurable 30-minute default expiry. The API reloads the user on every authenticated request and derives business scope from that database row; clients cannot choose a `business_id` for writes.

## Tenant isolation

Every tenant-owned table has a non-null `business_id`. API collection and item lookups always constrain queries using the authenticated user's business. Appointment foreign keys include the business ID when referencing a service or call, preventing cross-business links at the database layer too. Registration creates one business, owner, receptionist config, and a disconnected Google Calendar integration record together.

## API endpoints

All business APIs use `/api/v1` and require a bearer token unless noted.

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Process health, no auth |
| GET | `/docs` | Swagger UI |
| POST | `/api/v1/auth/register` | Create owner account and business |
| POST | `/api/v1/auth/login` | Authenticate and return token |
| GET | `/api/v1/auth/me` | Current authenticated user |
| GET, PATCH | `/api/v1/business` | Read/update current business profile |
| GET, POST | `/api/v1/services` | List/create current business services |
| PATCH, DELETE | `/api/v1/services/{service_id}` | Update/delete own service |
| GET, PATCH | `/api/v1/receptionist-config` | Read/update own business configuration |
| GET | `/api/v1/calls` | List own calls; supports `status`, `limit`, `offset` |
| GET | `/api/v1/calls/{call_id}` | Read own call detail |
| GET, POST | `/api/v1/appointments` | List/create own appointments |
| PATCH | `/api/v1/appointments/{appointment_id}` | Update own appointment; a new appointment starts `pending` |
| GET | `/api/v1/integrations` | List own integration status records |
| GET | `/api/v1/integrations/google-calendar` | Read/create disconnected placeholder status |

Google Calendar cannot be marked connected through this phase's public API. OAuth and calendar writes are not implemented. A dashboard-created appointment remains `pending` until a later verified calendar integration can confirm it.

## Database and migrations

SQLAlchemy 2 models use portable strings, integers, JSON fields, UUID text IDs, and timezone-aware datetime columns; SQLite foreign keys are enabled. The schema includes users, businesses, services, receptionist configs, call sessions, appointments, and integrations. PostgreSQL remains a supported target through a SQLAlchemy URL/driver change, subject to applying migrations and reviewing JSON/datetime behavior on the chosen server version.

The development app initializes missing tables on startup with `create_all`. Alembic is included for tracked schema evolution; before deployment, generate and review migrations rather than relying on `create_all` for upgrades.

## Limitations in Phase 1

- Registration creates a single owner per business; invitation flows and multi-user role management are not included.
- No password reset, refresh token, email verification, rate limiting, or production deployment controls yet.
- Call records are read-only because the telephony system is not part of this backend phase.
- Appointment status cannot be verified against a real calendar yet; booking writes and cancellation sync are not implemented.
- Receptionist settings are stored, but no AI engine consumes them yet.
- SQLite is the tested local database; PostgreSQL migration is designed for, not yet exercised.

