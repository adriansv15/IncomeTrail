import json
import unittest
from unittest.mock import patch

import documents_handler as handler


def make_event(route: str, body: dict, sub: str | None = "user-123") -> dict:
    method = route.split(" ", 1)[0]
    event = {
        "requestContext": {"routeKey": route, "http": {"method": method}},
        "rawPath": route.split(" ", 1)[1],
        "body": json.dumps(body),
    }
    if sub:
        event["requestContext"]["authorizer"] = {"jwt": {"claims": {"sub": sub}}}
    return event


class DocumentUploadTests(unittest.TestCase):
    def test_document_list_returns_safe_metadata_for_authenticated_user(self) -> None:
        with patch.object(handler, "_dynamodb_table") as dynamodb_table:
            dynamodb_table.return_value.query.return_value = {
                "Items": [
                    {
                        "documentId": "a" * 32,
                        "fileName": "income.pdf",
                        "contentType": "application/pdf",
                        "fileSize": 120,
                        "status": "UPLOADED",
                        "createdAt": "2026-09-30T00:00:00+00:00",
                        "objectKey": "private-s3-key",
                    }
                ]
            }
            response = handler.lambda_handler(make_event("GET /documents", {}), None)

        body = json.loads(response["body"])
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(body["documents"][0]["documentId"], "a" * 32)
        self.assertNotIn("objectKey", body["documents"][0])
        dynamodb_table.return_value.query.assert_called_once()

    def test_upload_intent_is_user_scoped_and_size_limited(self) -> None:
        with patch.object(handler, "UPLOAD_BUCKET", "test-bucket"), patch.object(
            handler, "_s3_client"
        ) as s3_client:
            s3_client.return_value.generate_presigned_post.return_value = {
                "url": "https://s3.example/upload",
                "fields": {"key": "signed"},
            }
            response = handler.lambda_handler(
                make_event(
                    "POST /documents/upload-intent",
                    {"fileName": "income.pdf", "contentType": "application/pdf", "fileSize": 120},
                ),
                None,
            )

        body = json.loads(response["body"])
        self.assertEqual(response["statusCode"], 200)
        self.assertTrue(body["key"].startswith("users/user-123/documents/"))
        self.assertEqual(
            s3_client.return_value.generate_presigned_post.call_args.kwargs["Conditions"][1],
            ["content-length-range", 120, 120],
        )

    def test_upload_intent_rejects_missing_identity(self) -> None:
        response = handler.lambda_handler(
            make_event(
                "POST /documents/upload-intent",
                {"fileName": "income.pdf", "contentType": "application/pdf", "fileSize": 120},
                sub=None,
            ),
            None,
        )
        self.assertEqual(response["statusCode"], 401)

    def test_upload_intent_rejects_unsupported_content(self) -> None:
        with patch.object(handler, "UPLOAD_BUCKET", "test-bucket"), patch.object(
            handler, "_s3_client"
        ) as s3_client:
            response = handler.lambda_handler(
                make_event(
                    "POST /documents/upload-intent",
                    {"fileName": "income.exe", "contentType": "application/octet-stream", "fileSize": 120},
                ),
                None,
            )

        self.assertEqual(response["statusCode"], 400)
        s3_client.assert_not_called()

    def test_upload_intent_rejects_oversized_files_before_signing(self) -> None:
        with patch.object(handler, "UPLOAD_BUCKET", "test-bucket"), patch.object(
            handler, "_s3_client"
        ) as s3_client:
            response = handler.lambda_handler(
                make_event(
                    "POST /documents/upload-intent",
                    {
                        "fileName": "income.pdf",
                        "contentType": "application/pdf",
                        "fileSize": handler.MAX_FILE_SIZE + 1,
                    },
                ),
                None,
            )

        self.assertEqual(response["statusCode"], 400)
        s3_client.assert_not_called()

    def test_unexpected_aws_errors_do_not_leak_details(self) -> None:
        with patch.object(handler, "UPLOAD_BUCKET", "test-bucket"), patch.object(
            handler, "_s3_client", side_effect=RuntimeError("private bucket details")
        ):
            response = handler.lambda_handler(
                make_event(
                    "POST /documents/upload-intent",
                    {"fileName": "income.pdf", "contentType": "application/pdf", "fileSize": 120},
                ),
                None,
            )

        self.assertEqual(response["statusCode"], 500)
        self.assertNotIn("private bucket details", response["body"])

    def test_document_registration_checks_owner_and_uploaded_object(self) -> None:
        document_id = "a" * 32
        key = f"users/user-123/documents/{document_id}.pdf"
        with patch.object(handler, "UPLOAD_BUCKET", "test-bucket"), patch.object(
            handler, "_s3_client"
        ) as s3_client, patch.object(handler, "_dynamodb_table") as dynamodb_table:
            s3_client.return_value.head_object.return_value = {
                "ContentLength": 120,
                "ContentType": "application/pdf",
            }
            response = handler.lambda_handler(
                make_event(
                    "POST /documents",
                    {
                        "documentId": document_id,
                        "fileName": "income.pdf",
                        "contentType": "application/pdf",
                        "fileSize": 120,
                        "key": key,
                    },
                ),
                None,
            )

        body = json.loads(response["body"])
        self.assertEqual(response["statusCode"], 201)
        self.assertEqual(body["status"], "UPLOADED")
        self.assertEqual(dynamodb_table.return_value.put_item.call_args.kwargs["Item"]["PK"], "USER#user-123")
        self.assertEqual(dynamodb_table.return_value.put_item.call_args.kwargs["Item"]["objectKey"], key)
        s3_client.return_value.head_object.assert_called_once_with(Bucket="test-bucket", Key=key)

    def test_document_registration_rejects_another_users_key(self) -> None:
        document_id = "a" * 32
        with patch.object(handler, "UPLOAD_BUCKET", "test-bucket"), patch.object(
            handler, "_s3_client"
        ) as s3_client:
            response = handler.lambda_handler(
                make_event(
                    "POST /documents",
                    {
                        "documentId": document_id,
                        "fileName": "income.pdf",
                        "contentType": "application/pdf",
                        "fileSize": 120,
                        "key": f"users/other-user/documents/{document_id}.pdf",
                    },
                ),
                None,
            )

        self.assertEqual(response["statusCode"], 400)
        s3_client.assert_not_called()


if __name__ == "__main__":
    unittest.main()