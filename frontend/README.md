# IncomeTrail Frontend

React, TypeScript, and Vite frontend with Amazon Cognito authentication and API Gateway integration.

## Configure AWS

Copy the example environment file:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` with the API URL, Cognito User Pool ID, app client ID, and AWS region for your environment. These `VITE_*` values are included in the browser build, so never put AWS secret keys or other private credentials in them. Restart Vite after changing the file.

The local environment file is ignored by Git.

## Run

```powershell
npm install
npm run dev
```

Production checks:

```powershell
npm run build
npm run lint
```

## Integrated Routes

- `GET /income-profile`
- `GET /income-sources`
- `POST /income-sources`
- `GET /evidence`
- `POST /documents/upload-intent`
- `POST /documents`
- `GET /documents`
- `POST /credentials`
- `GET /verify/{credentialId}`

Protected requests include the Cognito access token as `Authorization: Bearer <token>`.

## Evidence Upload

The frontend requests a short-lived upload policy, posts the file directly to S3, then registers and reloads its metadata. The Python/boto3 handler and deployment requirements are in `../backend/`.

Before using uploads in AWS, connect all three document routes to the existing HTTP API with the Cognito JWT authorizer, configure the Lambda role and environment variables, and set bucket CORS for the frontend origin. See `../backend/README.md`. No AWS resources were changed by this code update.