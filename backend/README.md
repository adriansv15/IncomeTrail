# IncomeTrail S3 Document Upload

`documents_handler.py` is a Python Lambda handler for the existing API Gateway HTTP API. It uses boto3 to issue short-lived S3 POST policies and stores verified document metadata in the existing `IncomeTrail` DynamoDB table. It does not create or modify AWS resources.

## Routes to Configure

Add both routes to the existing HTTP API and integrate them with this handler:

- `POST /documents/upload-intent`
- `POST /documents`
- `GET /documents`

Protect both routes with the existing Cognito JWT authorizer. The handler reads the owner only from `requestContext.authorizer.jwt.claims.sub`.

Set Lambda environment variables:

- `UPLOAD_BUCKET`: private S3 bucket for evidence files
- `TABLE_NAME`: `IncomeTrail`
- `ALLOWED_ORIGIN`: exact deployed frontend origin (for local development, `http://localhost:5173`)

The Lambda runtime provides `AWS_REGION`; deploy in `ap-southeast-2`. Use Python 3.12 and handler `documents_handler.lambda_handler`.

Package the handler with boto3:

```powershell
python -m pip install -r backend/requirements.txt -t backend/package
Copy-Item backend/documents_handler.py backend/package/
Compress-Archive -Path backend/package/* -DestinationPath backend/documents-handler.zip
```

## Least-Privilege Role Permissions

Grant the Lambda role `s3:PutObject` and `s3:GetObject` only on `arn:aws:s3:::YOUR_BUCKET/users/*`, plus `dynamodb:PutItem` and `dynamodb:Query` on the existing `IncomeTrail` table. `GetObject` is used only to verify the uploaded object with `HeadObject` before registering metadata. Do not grant public bucket access.

## S3 CORS

Configure the bucket to allow browser form POSTs from the exact frontend origin. Example for local development:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 300
  }
]
```

Configure API Gateway CORS separately to allow the frontend origin, `POST` and `OPTIONS`, and the `Authorization` and `Content-Type` headers.

## Upload Behavior

The intent route accepts PDF, CSV, JPEG, PNG, and WebP files up to 10 MB. Its five-minute presigned policy is scoped to `users/<cognito-sub>/documents/<random-id>.<extension>` and the exact declared content type and size. After S3 accepts the browser upload, `POST /documents` verifies the object and records metadata under `PK=USER#<sub>`, `SK=DOCUMENT#<document-id>`. Textract processing is not included.