# Agenda Assistente Facil API

Backend em FastAPI com dois perfis:
- `provider` (profissional)
- `customer` (paciente)

## Requisitos
- Python 3.10+
- PostgreSQL

## Configuracao
Crie `.env` a partir de `.env.example`.
Para OAuth Google, preencha:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_STATE_SECRET`
- `DATA_ENCRYPTION_KEY`

## Execucao local com uv
```bash
uv sync
uv run uvicorn app.main:app --reload
```

## Execucao local com Poetry
```bash
poetry install
poetry run uvicorn app.main:app --reload
```

## Endpoints principais
- `POST /api/v1/auth/register/provider`
- `POST /api/v1/auth/register/customer`
- `POST /api/v1/auth/token`
- `GET /api/v1/auth/provider/google/start`
- `GET /api/v1/auth/provider/google/callback`
- `GET /api/v1/agenda-config/me`
- `PUT /api/v1/agenda-config/me`
- `GET /api/v1/appointments/me`
- `GET /api/v1/appointments/provider/me?start=...&end=...`
- `POST /api/v1/appointments/provider/reconcile?start=...&end=...`
- `POST /api/v1/appointments`
- `GET /api/v1/appointments/availability/{professional_id}`
- `POST /api/v1/appointments/{appointment_id}/cancel`
- `POST /api/v1/appointments/{appointment_id}/reschedule`

## Makefile (Poetry)
```bash
make install
make run
make test
```

## Migracoes com Alembic
```bash
make db-upgrade
make db-downgrade
make db-revision MSG="add campo x"
make db-history
make db-current
```
