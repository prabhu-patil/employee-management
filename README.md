# Employee Management System

A full-stack employee management platform with authentication, attendance tracking, leave & holiday management, project tracking, and an analytics dashboard. Built with a **FastAPI** backend and an **Angular** frontend, fully containerized with Docker.

## Features

- **Authentication & Authorization** — JWT auth with refresh tokens and Google OAuth (Authlib)
- **Employee Management** — full CRUD for employee records and departments
- **Attendance Tracking** — clock-in/out with work-mode (on-site / remote) and location support
- **Leave Management** — apply for, approve, and track leave requests
- **Holidays** — manage the company holiday calendar
- **Projects** — track projects and assignments
- **Dashboard** — analytics and charts (ApexCharts) with an interactive map view (Leaflet)
- **Scheduled Jobs** — background tasks via APScheduler
- **Rate Limiting** — request throttling with SlowAPI
- **PDF Export** — report generation with ReportLab

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python, FastAPI, SQLAlchemy (async), Alembic, Pydantic |
| **Frontend** | Angular 21, Angular Material, TailwindCSS, ApexCharts, Leaflet |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Auth** | JWT (python-jose), Passlib/bcrypt, Google OAuth (Authlib) |
| **Infra** | Docker, Docker Compose, Nginx, pgAdmin |

## Project Structure

```
employee-management/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/routers/     # auth, employees, attendance, leaves, holidays, projects, dashboard
│   │   ├── core/            # config, database, security, scheduler
│   │   ├── models/          # SQLAlchemy models
│   │   └── schemas/         # Pydantic schemas
│   ├── alembic/             # database migrations
│   └── Dockerfile
├── frontend/emp-frontend/   # Angular application
├── nginx/                   # reverse-proxy config
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Docker & Docker Compose
- (For local dev without Docker) Python 3.11+, Node.js 20+, PostgreSQL 16

### 1. Configure environment
```bash
cp .env.example .env   # then fill in your own values
```

### 2. Run with Docker (recommended)
```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| pgAdmin | http://localhost:5050 |

### 3. Run locally (without Docker)

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend/emp-frontend
npm install
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime |
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Database credentials |
| `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` | pgAdmin login |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |

> ⚠️ The real `.env` is git-ignored and must never be committed. Use `.env.example` as a template.

## API Documentation
Interactive docs once the backend is running:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
