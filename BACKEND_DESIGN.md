# IncomeTrail MongoDB Backend Design

## Goal

Store income sources, income records, evidence documents, and verification progress for the React dashboard.

The frontend should call an API. It should never connect directly to MongoDB.

```text
React frontend -> Node/Express API -> MongoDB
                                      -> S3 later for document files
```

## MongoDB Collections

Database: `incometrail`

Every user-owned document contains `userId`. The API gets `userId` from authentication, not from the request body.

### `users`

```js
{
  _id: ObjectId,
  authId: "authentication-provider-user-id",
  name: "Arnav Deshmukh",
  email: "arnav@example.com",
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### `incomeSources`

Stores an income stream. Archive records instead of deleting them.

```js
{
  _id: ObjectId,
  userId: ObjectId,
  type: "gig_work", // shift_work | casual_work | gig_work | freelancing | other
  name: "Uber",
  status: "active", // active | archived
  startDate: ISODate,
  endDate: null,
  details: {
    platform: "Uber",
    clientName: null,
    hourlyRateCents: null,
    expectedHoursPerWeek: null,
    paymentFrequency: "monthly"
  },
  createdAt: ISODate,
  updatedAt: ISODate,
  archivedAt: null
}
```

### `incomeRecords`

Stores actual income events used for totals and history.

```js
{
  _id: ObjectId,
  userId: ObjectId,
  sourceId: ObjectId,
  amountCents: 32000,
  currency: "AUD",
  date: ISODate,
  period: "month", // day | week | month | one_off
  details: {
    hoursWorked: null,
    hourlyRateCents: null,
    invoiceReference: null
  },
  evidenceStatus: "self_reported", // self_reported | document_supported | transaction_supported
  createdAt: ISODate,
  updatedAt: ISODate
}
```

Important rules:

- Casual work records store hours and hourly rate.
- Gig work stores the actual amount. Do not calculate gig income from an hourly rate.
- Freelance records can store a client, project, payment frequency, and amount.
- Use integer cents instead of floating-point money values.

### `documents`

Stores document metadata. Store the actual file in S3 or another object store, not MongoDB.

```js
{
  _id: ObjectId,
  userId: ObjectId,
  sourceId: ObjectId,
  verificationId: ObjectId,
  type: "bank_statement", // payslip | gig_statement | invoice | other
  fileName: "september-statement.pdf",
  contentType: "application/pdf",
  storageKey: "users/<userId>/documents/<documentId>",
  status: "uploaded", // pending | uploaded | processing | processed | failed
  supportedAmountCents: 0,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### `verificationRequests`

Stores the verification tracker state.

```js
{
  _id: ObjectId,
  userId: ObjectId,
  sourceIds: [ObjectId],
  documentIds: [ObjectId],
  status: "draft", // draft | submitted | documents_received | under_review | approved | rejected | cancelled
  claimedAmountCents: 300000,
  supportedAmountCents: 280000,
  evidenceCoverage: 93,
  paymentStatus: "not_required", // not_required | pending | paid | failed
  createdAt: ISODate,
  updatedAt: ISODate
}
```

## Indexes

```js
db.users.createIndex({ authId: 1 }, { unique: true })
db.incomeSources.createIndex({ userId: 1, status: 1 })
db.incomeRecords.createIndex({ userId: 1, date: -1 })
db.incomeRecords.createIndex({ userId: 1, sourceId: 1, date: -1 })
db.documents.createIndex({ userId: 1, createdAt: -1 })
db.verificationRequests.createIndex({ userId: 1, updatedAt: -1 })
```

## API Routes

Base path: `/api/v1`

### Dashboard

```text
GET /dashboard?period=last_6_months
```

Returns:

- Current income
- Income reliability value and explanation
- Evidence coverage breakdown
- Active source count
- Income history chart points
- Latest income records

The dashboard values should be calculated from `incomeRecords` and `documents`, not stored as duplicate totals.

### Income sources

```text
GET   /income-sources?status=active
POST  /income-sources
GET   /income-sources/:sourceId
PATCH /income-sources/:sourceId
POST  /income-sources/:sourceId/archive
POST  /income-sources/:sourceId/restore
```

### Income records

```text
GET   /income-records?from=2026-01-01&to=2026-09-30
POST  /income-records
PATCH /income-records/:recordId
```

### Evidence documents

```text
GET  /documents
POST /documents/upload-intent
POST /documents
GET  /documents/:documentId
```

Flow:

1. Frontend asks for an upload URL.
2. API returns a short-lived S3 upload URL.
3. Browser uploads the file directly to S3.
4. Frontend calls `POST /documents` with the file metadata.
5. A future worker can process the document with OCR/Textract.

### Verification

```text
GET   /verification-requests/latest
POST  /verification-requests
PATCH /verification-requests/:verificationId
POST  /verification-requests/:verificationId/submit
GET   /verification-requests/:verificationId/timeline
```

The prototype may keep payment status as `not_required`. Real payment integration can be added later.

## Security Rules

- Require authentication for all user data routes.
- Get `userId` from the verified token.
- Always query with both `userId` and the requested document ID.
- Do not collect TFN or other government identifiers by default.
- Do not claim government verification without an authorised integration.
- Do not store document binaries in MongoDB.
- Do not log bank transactions or document contents.
- Use signed, short-lived upload URLs.

## Frontend Integration

Add a small API layer later:

```text
frontend/src/services/apiClient.ts
frontend/src/services/dashboardApi.ts
frontend/src/services/incomeSourcesApi.ts
frontend/src/services/documentsApi.ts
frontend/src/services/verificationApi.ts
```

Replace the current local state in this order:

1. Load sources from `GET /income-sources`.
2. Create sources with `POST /income-sources`.
3. Archive sources with the archive endpoint.
4. Load dashboard metrics from `GET /dashboard`.
5. Connect verification and document upload flows.
