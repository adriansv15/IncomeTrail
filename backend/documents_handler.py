import base64
import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import PurePosixPath
from typing import Any

import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

REGION = os.environ.get("AWS_REGION", "ap-southeast-2")
TABLE_NAME = os.environ.get("TABLE_NAME", "IncomeTrail")
UPLOAD_BUCKET = os.environ.get("UPLOAD_BUCKET", "")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
MAX_FILE_SIZE = 10 * 1024 * 1024
PRESIGNED_POST_TTL = 300
ALLOWED_FILE_TYPES = {
    ".csv": "text/csv",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".webp": "image/webp",
}

s3 = None
table = None


def _s3_client() -> Any:
    global s3
    if s3 is None:
        s3 = boto3.client("s3", region_name=REGION)
    return s3


def _dynamodb_table() -> Any:
    global table
    if table is None:
        table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)
    return table


def _response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Access-Control-Allow-Headers": "authorization,content-type",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def _body(event: dict[str, Any]) -> dict[str, Any]:
    raw_body = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw_body = base64.b64decode(raw_body).decode("utf-8")
    if isinstance(raw_body, dict):
        return raw_body
    parsed = json.loads(raw_body)
    if not isinstance(parsed, dict):
        raise ValueError("Request body must be a JSON object.")
    return parsed


def _user_sub(event: dict[str, Any]) -> str | None:
    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
        .get("sub")
    )


def _validated_file(payload: dict[str, Any]) -> tuple[str, str, int]:
    raw_name = str(payload.get("fileName", "")).replace("\\", "/")
    file_name = PurePosixPath(raw_name).name.strip()
    content_type = str(payload.get("contentType", "")).lower().strip()
    extension = PurePosixPath(file_name).suffix.lower()

    try:
        file_size = int(payload.get("fileSize", 0))
    except (TypeError, ValueError) as error:
        raise ValueError("fileSize must be an integer.") from error

    if not file_name or len(file_name) > 255 or "\x00" in file_name:
        raise ValueError("A valid fileName is required.")
    if ALLOWED_FILE_TYPES.get(extension) != content_type:
        raise ValueError("File type is not supported or does not match its extension.")
    if file_size < 1 or file_size > MAX_FILE_SIZE:
        raise ValueError("File size must be between 1 byte and 10 MB.")
    return file_name, content_type, file_size


def _create_upload_intent(user_sub: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not UPLOAD_BUCKET:
        raise RuntimeError("UPLOAD_BUCKET is not configured.")

    file_name, content_type, file_size = _validated_file(payload)
    document_id = uuid.uuid4().hex
    extension = PurePosixPath(file_name).suffix.lower()
    object_key = f"users/{user_sub}/documents/{document_id}{extension}"
    post = _s3_client().generate_presigned_post(
        Bucket=UPLOAD_BUCKET,
        Key=object_key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", file_size, file_size],
        ],
        ExpiresIn=PRESIGNED_POST_TTL,
    )
    return {
        "documentId": document_id,
        "fileName": file_name,
        "contentType": content_type,
        "fileSize": file_size,
        "key": object_key,
        "uploadUrl": post["url"],
        "fields": post["fields"],
        "expiresIn": PRESIGNED_POST_TTL,
    }


def _register_document(user_sub: str, payload: dict[str, Any]) -> dict[str, Any]:
    document_id = str(payload.get("documentId", ""))
    if not re.fullmatch(r"[a-f0-9]{32}", document_id):
        raise ValueError("A valid documentId is required.")

    file_name, content_type, declared_size = _validated_file(payload)
    extension = PurePosixPath(file_name).suffix.lower()
    expected_key = f"users/{user_sub}/documents/{document_id}{extension}"
    if payload.get("key") != expected_key:
        raise ValueError("The uploaded object does not belong to this account.")

    head = _s3_client().head_object(Bucket=UPLOAD_BUCKET, Key=expected_key)
    actual_size = int(head.get("ContentLength", 0))
    actual_type = head.get("ContentType", "")
    if actual_size != declared_size or actual_type != content_type:
        raise ValueError("Uploaded file metadata does not match the upload request.")

    created_at = datetime.now(timezone.utc).isoformat()
    _dynamodb_table().put_item(
        Item={
            "PK": f"USER#{user_sub}",
            "SK": f"DOCUMENT#{document_id}",
            "entityType": "DOCUMENT",
            "documentId": document_id,
            "fileName": file_name,
            "contentType": content_type,
            "fileSize": actual_size,
            "objectKey": expected_key,
            "status": "UPLOADED",
            "createdAt": created_at,
        },
        ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
    )
    return {
        "documentId": document_id,
        "fileName": file_name,
        "contentType": content_type,
        "fileSize": actual_size,
        "status": "UPLOADED",
        "createdAt": created_at,
    }


def _list_documents(user_sub: str) -> dict[str, Any]:
    documents: list[dict[str, Any]] = []
    query_args: dict[str, Any] = {
        "KeyConditionExpression": Key("PK").eq(f"USER#{user_sub}") & Key("SK").begins_with("DOCUMENT#"),
        "ScanIndexForward": False,
    }
    while True:
        result = _dynamodb_table().query(**query_args)
        for item in result.get("Items", []):
            documents.append({
                "documentId": item.get("documentId"),
                "fileName": item.get("fileName"),
                "contentType": item.get("contentType"),
                "fileSize": item.get("fileSize"),
                "status": item.get("status"),
                "createdAt": item.get("createdAt"),
            })
        next_key = result.get("LastEvaluatedKey")
        if not next_key:
            break
        query_args["ExclusiveStartKey"] = next_key
    return {"documents": documents}


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    del context
    request_context = event.get("requestContext", {})
    method = request_context.get("http", {}).get("method", event.get("httpMethod", ""))
    route_key = request_context.get("routeKey", "")
    path = event.get("rawPath", event.get("path", ""))
    route = route_key or f"{method} {path}"

    if method == "OPTIONS":
        return _response(204, {})
    if route not in {"GET /documents", "POST /documents/upload-intent", "POST /documents"}:
        return _response(404, {"message": "Route not found."})

    user_sub = _user_sub(event)
    if not user_sub:
        return _response(401, {"message": "Authentication is required."})

    try:
        if route == "GET /documents":
            return _response(200, _list_documents(user_sub))
        payload = _body(event)
        if route == "POST /documents/upload-intent":
            return _response(200, _create_upload_intent(user_sub, payload))
        return _response(201, _register_document(user_sub, payload))
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as error:
        return _response(400, {"message": str(error)})
    except ClientError as error:
        error_code = error.response.get("Error", {}).get("Code", "")
        if error_code in {"NoSuchKey", "NotFound", "404"}:
            return _response(404, {"message": "Uploaded object was not found."})
        if error_code == "ConditionalCheckFailedException":
            return _response(409, {"message": "Document is already registered."})
        return _response(500, {"message": "Internal server error."})
    except Exception:
        return _response(500, {"message": "Internal server error."})