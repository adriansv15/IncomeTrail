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
- `POST /credentials`
- `GET /verify/{credentialId}`

Protected requests include the Cognito access token as `Authorization: Bearer <token>`.

## Evidence Upload

Evidence file selection is not connected to AWS yet. The API contract supplied for this frontend does not include an upload-intent endpoint or S3 upload flow, so selected files are not uploaded. Implement the authenticated signed-upload route before enabling document submission.