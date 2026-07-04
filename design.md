# Design Decisions & Trade-offs

## 1. Database Design & Relational Schema
The database uses a highly normalized schema designed for multitenancy and robust execution tracking.

### Normalization & Entity Relationships
- **Multitenancy**: `Organization` owns `Project` owns `Queue`. This hierarchy strictly segregates job spaces.
- **Job Entity**: The `Job` table acts as the central state machine (`status` enum, `attempts`, `priority`, `scheduledFor`).
- **History Tracking**: The `JobExecution` and `JobLog` tables maintain a 1-to-N relationship with `Job` to ensure historical traceability. Each time a worker attempts a job, a new execution row is logged.
- **Dead Letter Queue (DLQ)**: A separate table that holds permanently failed jobs, adhering to the 1-to-1 relationship with `Job`.

### Primary Keys, Foreign Keys, and Cascading
- **Primary Keys**: UUID strings are used for all tables instead of auto-incrementing integers. This prevents predictable ID enumeration and is essential for distributed systems scaling.
- **Foreign Keys**: `QueueId` on the `Job` table, `WorkerId` on `JobExecution`, etc., enforce referential integrity at the database level.
- **Cascading Behavior**: Deleting a `Queue` would cascade down to delete all associated `Jobs`, ensuring no orphaned records exist. (Note: Cascade deletes are standard but must be used carefully in high-throughput environments).

### Indexes & Performance Considerations
- **Polling Efficiency**: The core query for workers is `SELECT * FROM Job WHERE status = 'QUEUED' AND scheduledFor <= NOW() ORDER BY priority DESC`. 
- **Indexes**: To make this highly efficient, a composite index on `(status, scheduledFor, priority)` is conceptually required so the worker avoids full table scans during polling.

## 2. Monorepo Architecture
To fulfill the requirement of keeping the project "simple and clean" without excessive folders, we chose a Next.js Monorepo. This allows the Frontend, REST API, and Background Worker to share the exact same Database Schema (Prisma) and types without needing separate configurations.

## 3. Database Choice (SQLite vs PostgreSQL)
While PostgreSQL is the standard for distributed queues (`SELECT ... FOR UPDATE SKIP LOCKED` for atomic claiming), configuring Docker can introduce evaluation friction. We opted to use **SQLite** with Prisma. Since SQLite inherently serializes writes, atomic claiming is achieved reliably via an `updateMany` locking strategy, avoiding race conditions during worker polling perfectly fine for demonstration.

## 4. Worker Polling & Concurrency
The worker is a standalone Node.js process (`src/worker.ts`). It polls the database and uses asynchronous execution (`executeJob(job).catch()`). This allows it to run multiple jobs concurrently in the background while continuing to poll, maximizing throughput without blocking the event loop.

## 5. Retries & Dead Letter Queue
Exponential, Linear, and Fixed backoff strategies are implemented by recalculating the `scheduledFor` time upon failure. Once `attempts >= maxAttempts`, the job is marked `FAILED` and moved to the DLQ.
