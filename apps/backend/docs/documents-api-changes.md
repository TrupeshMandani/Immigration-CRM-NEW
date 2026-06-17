# Documents API — Changes for Frontend (Prompts 18-19)

> **Context**: Before Prompt 10, file metadata lived in embedded arrays inside
> the MongoDB Applicant document.  After Prompt 10, every uploaded file gets its
> own row in the Postgres `documents` table.  The S3 bucket structure and
> bucket name are **unchanged**.

---

## New upload flow (frontend must adopt this)

The old flow (multer → backend → S3) is replaced by a presigned-URL flow that
lets the browser upload directly to S3:

```
1. POST /api/documents/upload-url  →  { uploadUrl, documentId, s3Key, contentType }
2. Browser PUT to uploadUrl (direct S3, no backend hop)
3. POST /api/documents/:documentId/finalize  →  { ...doc row, file_hash }
                                            OR   202 { status: 'hashing_queued' }
```

### Step 1 — Request an upload URL

```
POST /api/documents/upload-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "applicantId":  "uuid",          // Postgres applicant UUID
  "documentType": "passport",      // free-text slug (matches document_type column)
  "fileName":     "passport.pdf",  // original filename (used to build S3 key)
  "mimeType":     "application/pdf",
  "sizeBytes":    1234567
}
```

Response `201`:
```json
{
  "uploadUrl":   "https://s3.amazonaws.com/...?X-Amz-Signature=...",
  "documentId":  "8f3a...",
  "s3Key":       "aiKey123/documents/passport/uuid-passport.pdf",
  "contentType": "application/pdf"
}
```

### Step 2 — Browser uploads directly to S3

```
PUT <uploadUrl>
Content-Type: <contentType from step 1>
(body: raw file bytes)
```

The presigned URL expires in **15 minutes**.  If the PUT fails or times out,
call the upload-url endpoint again to get a fresh URL and document ID.

### Step 3 — Finalize (triggers SHA-256 hashing)

```
POST /api/documents/:documentId/finalize
Authorization: Bearer <token>
```

- **200** — file was hashed inline (< 50 MB).  Body is the full document row.
- **202** — file is large (≥ 50 MB), hashing queued in background.
  Body: `{ "status": "hashing_queued", "documentId": "..." }`
  The download URL still works immediately — the `file_hash` field will be
  populated later by the BullMQ worker.
- **422** — file was not found in S3 (upload never arrived or URL expired).

---

## Existing endpoints removed / superseded

| Old endpoint | Status | Replacement |
|---|---|---|
| `POST /api/upload` | **Kept** — still works for the legacy applicant upload flow | — |
| `POST /api/applicants/:aiKey/required-documents/:docId/files` | **Kept** — Postgres-backed required-doc flow | — |
| `GET /api/applicants/:aiKey/files` | **Kept** — returns Postgres `documents[]` for the applicant | — |

---

## New endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents/upload-url` | Request presigned PUT URL |
| `POST` | `/api/documents/:id/finalize` | Confirm upload, trigger hashing |
| `GET` | `/api/documents/:id/download-url` | Get short-TTL presigned GET URL |
| `GET` | `/api/documents/applicant/:applicantId` | List all docs for an applicant |
| `DELETE` | `/api/documents/:id` | Remove document row (S3 file kept) |

All endpoints require `Authorization: Bearer <token>`.  RLS ensures a
request scoped to Firm A cannot see or modify Firm B's documents.

---

## ai_verification field

Each document row has an `ai_verification` JSONB column (`{}` by default).
Prompt 11 will wire the AI document verification pipeline to populate this
field after finalize.  The frontend can poll `GET /api/documents/applicant/:id`
and check `ai_verification.verdict` to show verification status.

---

## File hash

`file_hash` is `null` until finalize completes.  Once set, it is the SHA-256
hex digest of the file content and can be used for deduplication.
