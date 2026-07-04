# REST API Documentation

The Distributed Job Scheduler provides clean REST APIs for managing Queues, Jobs, and Workers.

## Authentication
All API endpoints require a valid API Key to be passed via the `x-api-key` header.
- **Header**: `x-api-key`
- **Mock Valid Value**: `intern-auth-token`

## Endpoints

### 1. Queues

#### List Queues
- **GET** `/api/queues`
- **Response**: `200 OK`
```json
[
  {
    "id": "queue-123",
    "name": "default",
    "concurrencyLimit": 10,
    "defaultPriority": 0,
    "_count": { "jobs": 15 }
  }
]
```

#### Create Queue
- **POST** `/api/queues`
- **Payload**:
```json
{
  "name": "high-priority",
  "projectId": "proj-123",
  "concurrencyLimit": 5,
  "defaultPriority": 10
}
```

### 2. Jobs

#### List Jobs
- **GET** `/api/jobs?queueId=<id>&status=QUEUED`
- **Query Params**:
  - `queueId` (optional): Filter by queue.
  - `status` (optional): Filter by status (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`).
- **Response**: `200 OK` Array of jobs.

#### Create Immediate / Delayed Job
- **POST** `/api/jobs`
- **Payload**:
```json
{
  "name": "Send Email",
  "queueId": "queue-123",
  "payload": { "to": "user@example.com" },
  "priority": 5,
  "delayMs": 5000, // Optional: Delays execution by 5 seconds
  "maxAttempts": 3,
  "retryBackoff": "EXPONENTIAL"
}
```

#### Create Cron / Recurring Job
- **POST** `/api/jobs/cron`
- **Payload**:
```json
{
  "name": "Daily Report",
  "queueId": "queue-123",
  "cronExpression": "0 0 * * *",
  "payload": { "type": "report" }
}
```

#### Retry Failed Job
- **POST** `/api/jobs/retry`
- **Payload**:
```json
{
  "jobId": "job-123"
}
```
- **Description**: Manually re-queues a `FAILED` job and resets its attempts.

### 3. Workers & Stats

#### Get System Health & Workers
- **GET** `/api/workers`
- **Response**:
```json
{
  "stats": {
    "queued": 5,
    "running": 2,
    "completed": 150,
    "failed": 0,
    "deadLetter": 1
  },
  "workers": [
    {
      "id": "worker-1",
      "status": "ACTIVE",
      "lastHeartbeat": "2026-07-03T10:00:00Z"
    }
  ]
}
```
