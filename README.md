# 🚀 Distributed Job Scheduler

A production-inspired distributed job scheduling platform capable of reliably executing asynchronous background jobs across multiple workers. Built as a unified Next.js monorepo with a focus on engineering quality, reliability, and clean architecture.

---

## ✨ Features

### Core Scheduling
- **Immediate Jobs** — Execute as soon as a worker is available
- **Delayed Jobs** — Schedule jobs to run after a specified delay (`delayMs`)
- **Recurring Jobs** — Full cron expression support (`0 * * * *`)
- **Batch Jobs** — Spawn multiple jobs via the REST API in sequence

### Reliability & Concurrency
- **Atomic Job Claiming** — Workers use database-level locking to guarantee no two workers ever execute the same job
- **Configurable Retry Strategies** — Fixed, Linear, and Exponential backoff with configurable delays and max attempts
- **Dead Letter Queue (DLQ)** — Permanently failed jobs are archived for inspection and manual retry
- **Graceful Shutdown** — Worker drains all in-flight jobs before exiting on SIGINT/SIGTERM

### Observability
- **Job Execution Logs** — Every attempt is recorded with timestamps, status, and error messages
- **Worker Heartbeats** — Workers send a heartbeat every 10s; dashboard shows live ACTIVE/OFFLINE status
- **Execution Metrics** — Real-time counts for Queued, Running, Completed, Failed, and DLQ jobs

### Dashboard
- **Live Dashboard** — Polls APIs every 3 seconds for near-real-time updates
- **Queue Explorer** — Filter jobs by queue and status
- **Retry UI** — One-click retry for failed jobs directly from the dashboard
- **Worker Monitor** — See all registered workers and their health status

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              Web Dashboard (React)                   │
│           http://localhost:3000                      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (polling every 3s)
┌──────────────────────▼──────────────────────────────┐
│           Next.js REST API Routes                    │
│  /api/queues  /api/jobs  /api/workers               │
│  /api/jobs/cron          /api/jobs/retry            │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────────┐
│              SQLite Database                         │
│  Organizations, Projects, Queues, Jobs, Workers,    │
│  JobExecutions, JobLogs, ScheduledJobs, DLQ         │
└──────────────────────┬──────────────────────────────┘
                       │ Atomic polling
┌──────────────────────▼──────────────────────────────┐
│        Background Worker Process (ts-node)           │
│  Polls → Claims atomically → Executes concurrently  │
│  Heartbeat → Retries → DLQ on permanent failure     │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

The system uses a fully normalized relational schema with 10 tables:

| Table | Purpose |
|---|---|
| `Organization` | Top-level tenant |
| `User` | Authentication entity scoped to an org |
| `Project` | Namespace for grouping queues |
| `Queue` | Job queue with concurrency, priority, pause config |
| `Job` | Core job entity with status state machine |
| `JobExecution` | Per-attempt execution records |
| `JobLog` | Structured logs for each job |
| `Worker` | Registered worker nodes with heartbeat |
| `ScheduledJob` | Cron/recurring job definitions |
| `DeadLetterQueue` | Archive for permanently failed jobs |

---

## 📡 REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/queues` | List all queues with job counts |
| `POST` | `/api/queues` | Create a queue |
| `GET` | `/api/jobs` | List jobs (filter by `queueId`, `status`) |
| `POST` | `/api/jobs` | Create an immediate or delayed job |
| `POST` | `/api/jobs/cron` | Create a recurring cron job |
| `POST` | `/api/jobs/retry` | Retry a permanently failed job |
| `GET` | `/api/workers` | Get workers + system health stats |

### Create a Job Example
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Send Email",
    "queueId": "<queue-id>",
    "payload": { "to": "user@example.com" },
    "delayMs": 5000,
    "maxAttempts": 3,
    "retryBackoff": "EXPONENTIAL"
  }'
```

### Create a Cron Job Example
```bash
curl -X POST http://localhost:3000/api/jobs/cron \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hourly Report",
    "queueId": "<queue-id>",
    "cronExpression": "0 * * * *",
    "payload": {}
  }'
```

---

## 🛠️ Setup & Running Locally

### Prerequisites
- Node.js 18+
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup the Database
```bash
npx prisma db push
npx prisma generate
```

### 3. Seed the Database
```bash
npx ts-node src/lib/seed.ts
```

### 4. Start the Web Server (Terminal 1)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.

### 5. Start the Background Worker (Terminal 2)
```bash
npx ts-node src/worker.ts
```
The worker will register, begin polling for jobs, and process them concurrently.

### 6. Run Automated Tests
```bash
npx vitest run
```

---

## 📁 Project Structure

```
├── prisma/
│   └── schema.prisma          # Full relational schema (10 models)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Dashboard UI (React + TailwindCSS)
│   │   └── api/
│   │       ├── queues/        # Queue management
│   │       ├── workers/       # Worker health & stats
│   │       └── jobs/          # Job creation, cron, retry
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── seed.ts            # Database seed script
│   └── worker.ts              # Background worker service
├── tests/
│   └── scheduler.test.ts      # Automated tests (Vitest)
├── api_docs.md                # Full API documentation
├── design.md                  # Architecture & design decisions
├── architecture.mermaid       # System architecture diagram
└── er_diagram.mermaid         # Database ER diagram
```

---

## 🧪 Tests

```
✓ tests/scheduler.test.ts (3 tests) 12ms
  ✓ should create a job successfully
  ✓ should simulate worker backoff calculation
  ✓ should transition a job to DLQ logic when max attempts reached

Test Files: 1 passed | Tests: 3 passed | Duration: 235ms
```

---

## 📄 Deliverables

| Deliverable | File |
|---|---|
| Source Code | This repository |
| Setup Instructions | This README |
| Architecture Diagram | `architecture.mermaid` |
| ER Diagram | `er_diagram.mermaid` |
| API Documentation | `api_docs.md` |
| Design Decisions | `design.md` |
| Automated Tests | `tests/scheduler.test.ts` |

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 16 (App Router) |
| Language | TypeScript |
| ORM | Prisma v6 |
| Database | SQLite |
| Worker | Node.js / ts-node |
| Testing | Vitest |
| Styling | TailwindCSS + Lucide Icons |
