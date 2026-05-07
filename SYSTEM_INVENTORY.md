# SYSTEM INVENTORY — Immigration CRM
> Generated: 2026-05-07  
> Purpose: Pre-refactor snapshot before Mongo→Postgres + single-tenant→multi-tenant migration  
> Branch captured: main (git object store corrupted — see GIT STATUS section below)  
> Commit tag target: v0-legacy  

---

## GIT STATUS

**The git object store is corrupted.** `refs/heads/main` points to SHA `ab7bc56b` which does not exist on disk (likely an external-drive filesystem event). All source files are intact. Git operations (tag, branch) require re-initialising the repository first.

**Recommended fix (requires explicit user approval):**
```bash
git init
git add .
git commit -m "chore: snapshot codebase state and create system inventory before refactor"
git tag v0-legacy
git checkout -b legacy-archive
git checkout main
```

---

## Backend: Models

### Admin (`backend/models/Admin.js`)

| Field      | Type    | Constraints                              |
|------------|---------|------------------------------------------|
| username   | String  | unique, required, trim, 3–30 chars       |
| email      | String  | unique, required, lowercase, trim        |
| password   | String  | required, min 6 chars; bcrypt-hashed     |
| role       | String  | enum ["admin"], default "admin"          |
| isActive   | Boolean | default true                             |
| createdAt  | Date    | auto (timestamps: true)                  |
| updatedAt  | Date    | auto (timestamps: true)                  |

**Hooks / methods:**
- `pre("save")` — bcrypt hash 10 rounds if password modified
- `comparePassword(candidatePassword)` — bcrypt compare
- `toJSON()` — strips `password` field from output

---

### Student (`backend/models/Student.js`)

| Field               | Type    | Notes                                              |
|---------------------|---------|----------------------------------------------------|
| aiKey               | String  | unique, indexed — internal invisible ID            |
| profile             | Mixed   | Free-form JSON (extracted from documents)          |
| username            | String  | unique sparse, 3–30 chars                          |
| email               | String  | unique sparse, lowercase                           |
| role                | String  | enum ["student"], default "student"                |
| status              | String  | enum ["pending","registered","active","inactive"]  |
| isFirstLogin        | Boolean | default true                                       |
| contactInfo         | Object  | `{ name, email, phone, message }`                  |
| requiredDocuments[] | Array   | See sub-schema below                               |
| documents[]         | Array   | Older S3 reference array `{key,bucket,name,mimeType,size,uploadedAt}` |
| tasks[]             | Array   | Embedded tasks (see sub-schema below)              |
| profileComplete     | Boolean | default false                                      |
| recommendationEnabled | Boolean | default true                                     |
| preferences         | Mixed   | default `{}`                                       |
| createdAt/updatedAt | Date    | auto                                               |

**requiredDocuments[] sub-schema:**
```
{
  name, description, slug (required), aiExtractionEnabled (bool),
  files: [{
    key (required), bucket, name (required), size, mimeType,
    uploadedAt, uploadedBy→Student, uploadedByRole,
    verification: { status (pending|verified|failed), confidence, detectedType, reason, checkedAt },
    verificationTaskId→Task
  }],
  isUploaded (bool),
  verification: { status, confidence, detectedType, reason, lastCheckedAt },
  createdAt, updatedAt
}
```

**tasks[] sub-schema (embedded in Student):**
```
{
  title (required), description, dueDate,
  status (pending|completed), default pending,
  attachment: { key, bucket, name, mimeType, size },
  assignedBy→Admin, assignedAt, completedAt, seenByStudent
}
```

**Relationships:** `tasks[].assignedBy` → Admin; `requiredDocuments[].files[].uploadedBy` → Student; `requiredDocuments[].files[].verificationTaskId` → Task

---

### Task (`backend/models/Task.js`)

| Field                      | Type    | Notes                                              |
|----------------------------|---------|----------------------------------------------------|
| type                       | String  | enum ["general","ai-verification"], indexed        |
| title                      | String  | required                                           |
| description                | String  |                                                    |
| status                     | String  | enum ["pending","verified","failed","completed"], indexed |
| priority                   | String  | enum ["low","medium","high"], default "medium"     |
| studentId                  | ObjectId| → Student                                          |
| studentAiKey               | String  | indexed                                            |
| studentName                | String  |                                                    |
| documentId                 | ObjectId| reference to requiredDocuments sub-doc             |
| documentField              | String  | document name                                      |
| documentSlug               | String  |                                                    |
| fileId                     | ObjectId|                                                    |
| fileName                   | String  |                                                    |
| uploadTimestamp            | Date    |                                                    |
| verificationStatus         | String  | enum ["pending","verified","failed"]               |
| verificationConfidence     | Number  |                                                    |
| verificationDetectedType   | String  |                                                    |
| verificationReason         | String  |                                                    |
| verificationHistory[]      | Array   | `{status, confidence, detectedType, reason, recordedAt}` |
| isRead                     | Boolean | default false, indexed                             |
| resolvedAt                 | Date    |                                                    |
| metadata                   | Mixed   | `{s3Key, bucket, mimeType}`                        |
| createdBy                  | ObjectId| → Admin                                            |
| resolvedBy                 | ObjectId| → Admin                                            |
| notificationMuted          | Boolean | default false                                      |
| notificationDeleted        | Boolean | default false                                      |

**Indexes:** `createdAt desc`; compound `(type, status, isRead)`

---

### File (`backend/models/File.js`)

| Field              | Type    | Notes                                                 |
|--------------------|---------|-------------------------------------------------------|
| aiKey              | String  | indexed — student identifier                          |
| studentId          | ObjectId| → Student, indexed                                    |
| studentName        | String  |                                                       |
| ownerType          | String  | enum ["student","admin","ai_assistant","system"]       |
| field              | String  | e.g. "Passport", "IELTS"                             |
| fieldSlug          | String  | indexed                                               |
| requiredDocumentId | ObjectId| indexed                                               |
| originalName       | String  |                                                       |
| storedName         | String  |                                                       |
| mimeType           | String  |                                                       |
| size               | Number  |                                                       |
| path               | String  | local temp path                                       |
| s3Key              | String  |                                                       |
| bucket             | String  |                                                       |
| storageLocation    | String  | enum ["TEMP","S3","LOCAL"], default "S3"              |
| source             | String  | enum ["manual","admin","ai","smart"], default "manual"|
| status             | String  | default "UPLOADED"                                    |

---

### Notification (`backend/models/Notification.js`)

| Field           | Type    | Notes                               |
|-----------------|---------|-------------------------------------|
| recipientUserId | ObjectId| required                            |
| recipientRole   | String  | enum ["admin","student"], required  |
| actorUserId     | ObjectId|                                     |
| actorName       | String  |                                     |
| taskId          | ObjectId|                                     |
| taskTitle       | String  |                                     |
| taskSummary     | String  |                                     |
| type            | String  | enum ["TASK_COMPLETED"], required   |
| status          | String  | enum ["UNREAD","READ"], indexed     |
| meta            | Mixed   |                                     |
| readAt          | Date    |                                     |

**Index:** `(recipientUserId, status, createdAt desc)`

---

### Recommendation (`backend/models/Recommendation.js`)

| Field        | Type    | Notes                                   |
|--------------|---------|-----------------------------------------|
| studentId    | ObjectId| → Student, unique, indexed, required    |
| universities | Array   | See UniSchema below                     |
| generatedAt  | Date    | default Date.now                        |
| source       | String  | enum ["openai","fallback"]              |

**UniSchema (no _id):**
```
{ name, country, program, degreeLevel, eligibilityReason,
  tuitionFee (Number), aiScore (0–1 float), website }
```

---

## Backend: API Endpoints

Base: `http://localhost:4000/api`  
Auth middleware: JWT Bearer token; roles: `admin`, `student`

### `/api/auth`

| Method | Path              | Auth         | Purpose                                       |
|--------|-------------------|--------------|-----------------------------------------------|
| POST   | /login            | public       | JWT login for admin or student                |
| POST   | /login-link       | public       | Send Firebase magic sign-in link to email     |
| POST   | /firebase-login   | public       | Complete Firebase email link auth             |
| POST   | /register         | public       | Student self-registration (invite flow)       |
| POST   | /register-admin   | public       | Create admin account                          |
| POST   | /change-password  | auth         | Change current user password                  |
| GET    | /profile          | auth         | Get current authenticated user profile        |
| GET    | /test             | public       | Route health check                            |

### `/api/students`

| Method | Path                                                  | Auth         | Purpose                                              |
|--------|-------------------------------------------------------|--------------|------------------------------------------------------|
| GET    | /registered                                           | admin        | List registered/active students                      |
| PUT    | /me/profile                                           | student      | Student updates own profile                          |
| GET    | /:aiKey/files                                         | auth         | List all S3 files for student                        |
| POST   | /:aiKey/documents/:documentId/rename                  | auth         | Rename a document entry                              |
| DELETE | /:aiKey/documents/:documentId                         | auth         | Delete a document entry                              |
| POST   | /                                                     | admin        | Create new student record                            |
| GET    | /                                                     | admin        | List all students                                    |
| GET    | /pending/contacts                                     | admin        | Pending contact form submissions awaiting approval   |
| GET    | /admin/:id                                            | admin        | Get student by MongoDB _id                           |
| POST   | /:id/approve-contact                                  | admin        | Promote contact to student                           |
| POST   | /:id/activate                                         | admin        | Activate student account (set status=active)         |
| PUT    | /:id                                                  | admin        | Full update of student record                        |
| DELETE | /:id                                                  | admin        | Delete student                                       |
| GET    | /:aiKey/required-documents                            | auth         | List required document slots                         |
| POST   | /:aiKey/required-documents                            | admin        | Add new required document slot                       |
| DELETE | /:aiKey/required-documents/:docId                     | admin        | Remove required document slot                        |
| PATCH  | /:aiKey/required-documents/:docId                     | admin        | Update document slot settings (e.g. aiEnabled)       |
| POST   | /:aiKey/required-documents/:docId/files               | auth+multer  | Upload file to specific document slot                |
| POST   | /:aiKey/required-documents/files                      | auth+multer  | Smart upload by documentType (AI/MCP path)           |
| GET    | /:aiKey/required-documents/:docId/files               | auth         | List uploaded files for a slot                       |
| GET    | /:aiKey/required-documents/:docId/files/:fileId/url   | auth         | Get S3 presigned URL for a file                      |
| DELETE | /:aiKey/required-documents/:docId/files/:fileId       | auth         | Delete a file from a slot                            |
| POST   | /:aiKey/required-documents/:docId/files/:fileId/verify| admin        | Trigger AI document verification                     |
| GET    | /:aiKey/tasks                                         | auth         | List student's embedded tasks                        |
| POST   | /:aiKey/tasks                                         | admin+multer | Create task; optional file attachment                |
| PATCH  | /:aiKey/tasks/:taskId                                 | auth         | Update task (e.g. mark complete)                     |
| GET    | /:aiKey/tasks/:taskId/attachment                      | auth         | Get presigned URL for task attachment                |
| DELETE | /:aiKey/tasks/:taskId                                 | auth         | Delete task                                          |
| GET    | /:aiKey                                               | public       | Get student by aiKey (used by MCP server)            |

### `/api/tasks` (admin only — all routes behind `requireAdmin`)

| Method | Path                  | Purpose                                             |
|--------|-----------------------|-----------------------------------------------------|
| GET    | /                     | List AI-verification tasks (filtered/paginated)     |
| POST   | /notifications/read   | Mark task notification IDs as read                  |
| PATCH  | /:taskId              | Update task status/fields                           |
| DELETE | /:taskId              | Delete task                                         |

### `/api/upload`

| Method | Path | Auth    | Purpose                                                  |
|--------|------|---------|----------------------------------------------------------|
| POST   | /    | student | Upload 1–20 files (10 MB each) to local /uploads dir     |

### `/api/notifications` (all routes require auth)

| Method | Path         | Purpose                          |
|--------|--------------|----------------------------------|
| GET    | /            | List notifications for caller    |
| POST   | /:id/read    | Mark one notification as read    |
| POST   | /read-all    | Mark all notifications as read   |

### `/api/contact`

| Method | Path | Auth   | Purpose                          |
|--------|------|--------|----------------------------------|
| POST   | /    | public | Submit contact form              |

### `/api/recommendations` (all routes require auth)

| Method | Path                    | Auth  | Purpose                                         |
|--------|-------------------------|-------|-------------------------------------------------|
| GET    | /:studentId             | auth  | Fetch existing recommendations                  |
| POST   | /generate/:studentId    | auth  | Generate/regenerate AI university list          |
| PATCH  | /enable/:studentId      | admin | Toggle recommendationEnabled flag on student    |

### `/api/ai`

| Method | Path            | Auth   | Purpose                                                    |
|--------|-----------------|--------|------------------------------------------------------------|
| POST   | /chat           | none   | Stream query to MCP server; returns NDJSON                 |
| GET    | /documents/url  | none   | Get S3 presigned URL by fileName + optional aiKey          |

### `/api/files`

| Method | Path          | Auth   | Purpose                                                    |
|--------|---------------|--------|------------------------------------------------------------|
| POST   | /temp-upload  | none   | Save file to OS temp dir; returns absolute path for AI use |

---

## Backend: Services

### `backend/AI/ai.service.js`
- `extractImportantFields({ text, images, schemaDescription })` — OpenAI JSON-mode extraction; returns parsed JSON object of document fields
- `chatWithAssistant({ messages, model })` — Generic OpenAI chat completion; returns string

### `backend/AI/ai-file-extract/extract.service.js`
- `extractProfileWithAI(files[])` — Multi-file pipeline: text-extract → classify → extract → merge into single profile object; adds `documentsFound[]` metadata
- `extractTextFromFile(filePath, mimeType)` — Extract raw text from PDF (pdf-parse), DOCX (mammoth), or plain text

### `backend/AI/ai-file-extract/document-classifier.js`
- `classifyDocument({ text, images })` — Returns document category string (Passport, Visa, Resume/CV, etc.)

### `backend/AI/ai-file-extract/field-priority.js`
- `prioritizeFields(profile)` — Sorts profile object keys by priority (personal info first)
- `formatFieldName(fieldName)` — camelCase → Title Case

### `backend/AI/ai-document-verify/verification.service.js`
- `verifyDocumentType({ expectedType, filePath, mimeType })` — AI verifies doc matches expected type; returns `{ status, confidence, detectedType, reason, checkedAt }`

### `backend/AI/ai-recommendation/aiRecommendation.service.js`
- `generateUniversityListFromProfile(profile)` — Calls OpenAI (gpt-4o-mini, JSON mode); returns `{ universities[], source }` with fallback list if AI fails

### `backend/AI/assistant/index.js`
- `handleAssistantQuery(query, studentId, authHeader, res)` — Proxies to MCP server via HTTP; pipes NDJSON stream to Express response

### `backend/AI/assistant/context-manager.js`
- `buildStudentContext(studentId)` — Fetches student from DB; formats name/status/docs/tasks as context string (⚠️ not currently used by assistant flow)

### `backend/modules/students/student.service.js`
- `upsertStudent({ aiKey, profile, documents })` — Upsert by aiKey; merges profiles; passport-smart-merge (manual entries protected from AI overwrite)

### `backend/modules/tasks/task.service.js`
- `createVerificationTask({ student, document, fileMeta, verification })` — Create or update ai-verification Task; emits Socket.IO event
- `resolveVerificationTasks({ documentId, fileId, status, resolvedBy, reason })` — Close open verification tasks; emits events
- `markTasksRead(taskIds[])` — Bulk mark tasks as isRead=true
- `purgeExpiredTasks()` — Delete tasks older than TASK_RETENTION_DAYS (default 60)
- `formatTask(task)` — Serialize Task mongoose doc to plain object

### `backend/modules/s3/s3.service.js`
- `uploadFileToS3(filePath, fileName, studentKey)` — PutObject to S3; returns `{ key, bucket, fileName, uploadedAt }`
- `getPresignedUrl(key, filename)` — GetObject presigned URL; expires per S3_PRESIGNED_URL_EXPIRY
- `deleteS3Object(key)` — DeleteObject
- `listStudentFiles(studentKey)` — ListObjectsV2 by prefix `{studentKey}/`
- `deleteLocalFile(filePath)` — fs.unlinkSync temp file

### `backend/modules/notifications/email.service.js`
- `sendEmailNotification(templateName, recipientEmail, data)` — Send templated HTML email (7 templates)
- `sendBulkEmailNotifications(notifications[])` — Send multiple emails
- `testEmailConfiguration()` — Verify SMTP transport

### `backend/utils/sendEmail.js`
- `sendEmail({ to, subject, text, html })` — Base nodemailer send (used by invite and MCP email tool)

### `backend/modules/students/student.invite.js`
- `sendStudentInviteEmail({ email, name })` — Generate Firebase magic link + send styled HTML invite email

### `backend/socket/index.js`
- `initSocket(server)` — Configure Socket.IO with JWT auth; rooms: `user:{id}`, `student:{aiKey}`, `admins`
- `emitTaskCreated(task)` — Emit `task:created` to admins room
- `emitTaskUpdated(task)` — Emit `task:updated` to admins room
- `emitNotification(notification)` — Emit `notification:new` to `user:{recipientId}`

---

## Backend: AI Prompts (verbatim)

### Prompt 1 — Document Field Extraction
**File:** `backend/AI/ai.service.js` · `extractImportantFields()`  
**Model:** `OPENAI_MODEL` env (default `gpt-4o-mini`) · **mode:** JSON

**System:**
```
You are an expert immigration document analyst.
Your task is to extract key information from the provided document text and/or images.
Return a valid JSON object.
${schemaDescription ? `Follow this structure: ${schemaDescription}` : "Extract important fields like Name, DateOfBirth, PassportNumber, ExpiryDate, etc."}
- Do NOT include explanations.
- Use ISO dates (YYYY-MM-DD) where possible.
- If a field is missing or unclear, omit it or use null.
```

**Schema hints injected at runtime (examples):**
- Passport: `{ Name, DateOfBirth, PassportNumber, ExpiryDate, Nationality, IssuingCountry }`
- Resume/CV: `{ FullName, Email, Phone, Skills: [], Experience: [{Title,Company,StartDate,EndDate}], Education: [{Degree,Institution,Year}] }`

---

### Prompt 2 — Document Classifier
**File:** `backend/AI/ai-file-extract/document-classifier.js` · `classifyDocument()`  
**Model:** `gpt-4o-mini`

**System:**
```
You are an expert document classifier for an immigration CRM.
Classify the provided document into one of the following categories:
- Passport
- Visa
- Resume / CV
- Cover Letter
- Educational Transcript
- Language Test Result (IELTS/CELPIP)
- Bank Statement
- Police Certificate
- Medical Exam
- Application Form
- Other / Unknown

Return ONLY the category name.
```

---

### Prompt 3 — Document Verification
**File:** `backend/AI/ai-document-verify/verification.service.js` · `verifyDocumentType()`  
**Model:** `OPENAI_VERIFICATION_MODEL` or `OPENAI_MODEL` (default `gpt-4o-mini`) · **mode:** JSON

**System:**
```
You are an immigration compliance assistant who labels documents with high precision.
```

**User message (dynamic `expectedType`):**
```
You must determine if the provided document is a "${expectedType}".
Respond with JSON: {"status":"verified|failed|pending","detectedType":"string","confidence":0-1,"reason":"string"}.
Mark as:
- "verified" only if you are sure it matches the expected type.
- "failed" if it clearly is a different document.
- "pending" if the content is unreadable, incomplete, or uncertain.
```
*(Followed by extracted text up to 6 000 chars and/or base64 image(s))*

---

### Prompt 4 — University Recommendation
**File:** `backend/AI/ai-recommendation/aiRecommendation.service.js` · `generateUniversityListFromProfile()`  
**Model:** `gpt-4o-mini` · **mode:** JSON · **temperature:** 0.2

**System:**
```
You are an AI university admissions recommender. 
You MUST return output in valid JSON format that strictly matches this schema:

{
  "universities": [
    {
      "name": "string",
      "country": "string",
      "program": "string",
      "degreeLevel": "string",
      "eligibilityReason": "string",
      "tuitionFee": number,
      "aiScore": number,
      "website": "string"
    }
  ]
}

Do not rename the "universities" key.
Do not wrap it in any extra objects.
Do not include any commentary, text, or explanation outside the JSON object.
If you cannot produce valid data, return {"universities": []}.
```

**User (dynamic, profile injected):**
```
Student Profile JSON:\n${JSON.stringify(profile, null, 2)}\n
Constraints:
- Provide 5–10 university options.
- Higher aiScore for closer matches to GPA, IELTS/TOEFL/PTE, and budget.
- Include real universities where possible.
- TuitionFee is yearly (in CAD or equivalent).
- Keep explanations short and factual.
```

**Retry prompt (on schema violation):**
```
Your previous response was invalid. 
You must return a JSON object containing only one key: "universities" (array). 
Retry now.
```

---

### Prompt 5 — MCP AI Assistant (main system prompt)
**File:** `mcp-server/mcp/chatProcessor.js` · `SYSTEM_PROMPT` constant  
**Model:** `OPENAI_MODEL` env (set to `gpt-4.1`) · **tool_choice:** auto

```
You are an Immigration CRM AI Assistant.

CRITICAL RULES FOR FILE UPLOADS:
- When a user attaches a file (you'll see "[System: User attached file: ... (Path: ...)]"), you MUST call the 'uploadDocument' tool.
- NEVER respond with text-only when files are attached - you MUST use tools.
- If you need the student's aiKey, call 'searchStudents' first, then call 'uploadDocument'.
- The 'uploadDocument' tool requires: aiKey (student identifier), documentType (e.g., "Passport", "IELTS"), and filePath (from the attachment).

RESPONSE FORMATTING RULES:
1. Use markdown formatting for ALL responses
2. Structure responses with headers (## Header), lists, and bold text
3. When listing documents, format each file name as: **filename.ext** (e.g., **passport.pdf**, **ielts_result.pdf**)
4. Use bullet points for lists (-)
5. Use numbered lists for steps (1., 2., 3.)
6. Use code blocks with backticks for IDs or technical data
7. Use **bold** for important information
8. Keep responses concise but informative
9. Never return plain paragraphs - always use structured formatting
10. When uploading files, use the 'uploadDocument' tool and specify the 'documentType' (e.g., "Passport", "IELTS") instead of looking for IDs. The system will handle the rest.
11. When a user attaches a file you will see a line like "[System: User attached file: <name> (Path: <abs path>)]" inside their message. Always treat that path as the source to read when calling any document tooling.
12. If a user asks you to upload or process an attachment, call 'uploadDocument' with the student's aiKey (look it up via search tools if needed), the requested document type, and the provided file path. Ask for clarification whenever information is missing.

STUDENT TASK MANAGEMENT:
- Always use backend task routes via tools: 'getTasksForStudent', 'createStudentTask', 'updateStudentTaskStatus', and 'deleteStudentTask'. This ensures notifications/logging fire.
- BEFORE calling create/update/delete task tools you must confirm the targeted student and task with the user (e.g., "You asked me to mark the passport upload task for Trupesh as complete—confirm?"). Clarify missing data before acting.
- AFTER the tool call, explicitly confirm success or failure, referencing the student, task name, and new status.
- When users ask for current work, list open tasks in a structured table or bullets including **Task**, **Created**, **Status**, and due dates.
- Marking tasks complete should set status to "completed" (or the closest available) via 'updateStudentTaskStatus'.
- Deletions must state the task being removed and why based on the user's instruction.

Example response format:
## Student Information
- **Name**: John Doe
- **Status**: Active

## Documents
- **passport.pdf** - Verified
- **ielts_result.pdf** - Pending verification

## Tasks
1. Upload remaining documents
2. Complete profile information
```

**Dynamic attachment-enforcement policy (injected when files detected):**
```
CRITICAL ATTACHMENT POLICY - YOU MUST FOLLOW THIS:
- The user has attached ${n} file(s) that MUST be uploaded using the 'uploadDocument' tool.
- YOU CANNOT RESPOND WITH TEXT ONLY - you MUST call tools.
- Step 1: If you don't know the student's aiKey, call 'searchStudents' with the student name from the user's message.
- Step 2: Extract the document type from the user's message (e.g., "Passport", "IELTS", "Resume").
- Step 3: Call 'uploadDocument' with:
  * aiKey: from search results or user message
  * documentType: the document type (e.g., "Passport")
  * filePath: the exact path from the attachment list below
- DO NOT write a response until 'uploadDocument' has been called.
- Provided files: [list]
```

---

## Backend: Environment Variables

> ⚠️ Values redacted. Actual credentials are in `backend/.env` and `mcp-server/.env`.

### `backend/.env`

| Variable                    | Default / Example                            | Purpose                                      |
|-----------------------------|----------------------------------------------|----------------------------------------------|
| PORT                        | 4000                                         | Express listen port                          |
| NODE_ENV                    | development                                  | Node environment                             |
| MONGODB_URI                 | mongodb://localhost:27017/ImmigrationCRM     | MongoDB connection                           |
| JWT_SECRET                  | (secret)                                     | JWT signing key                              |
| JWT_EXPIRY                  | 7d                                           | JWT token lifetime                           |
| OPENAI_API_KEY              | sk-proj-…                                    | OpenAI API key (document AI + recommendations)|
| SMTP_HOST                   | smtp.gmail.com                               | Nodemailer SMTP host                         |
| SMTP_PORT                   | 465                                          | SMTP port                                    |
| SMTP_USER                   | trupeshpmandani@gmail.com                    | SMTP auth username                           |
| SMTP_PASSWORD               | (app password)                               | SMTP auth password                           |
| EMAIL_FROM                  | Trupesh Mandani \<trupeshpmandani@gmail.com\> | Sender display name                          |
| APP_BASE_URL                | http://localhost:5173                        | Frontend origin (CORS + email links)         |
| ADMIN_NOTIFICATIONS_EMAIL   | imtrupesh1610@gmail.com                      | Admin notification recipient                 |
| AWS_ACCESS_KEY_ID           | (key)                                        | AWS S3 access key                            |
| AWS_SECRET_ACCESS_KEY       | (secret)                                     | AWS S3 secret                                |
| AWS_REGION                  | ca-central-1                                 | S3 bucket region                             |
| AWS_S3_BUCKET_NAME          | immigration-crm-trupeshmandani               | S3 bucket name                               |
| S3_PRESIGNED_URL_EXPIRY     | 3600                                         | Presigned URL TTL (seconds)                  |
| FIREBASE_PROJECT_ID         | immigration-crm-2d3fd                        | Firebase project ID (magic links)            |
| FIREBASE_CLIENT_EMAIL       | firebase-adminsdk-…@…                        | Firebase Admin SDK service account email     |
| FIREBASE_PRIVATE_KEY        | (RSA key)                                    | Firebase Admin SDK private key               |
| GOOGLE_CLIENT_EMAIL         | (unused — Drive removed)                     | Legacy Google service account                |
| GOOGLE_PRIVATE_KEY          | (unused — Drive removed)                     | Legacy Google private key                    |

**Referenced in code but not in .env (fall back to defaults):**
| Variable                 | Default                          | Purpose                              |
|--------------------------|----------------------------------|--------------------------------------|
| REDIS_URL                | redis://localhost:6379           | Referenced in config/env.js; no Redis client used |
| SOCKET_ALLOWED_ORIGINS   | (falls back to APP_BASE_URL)     | Socket.IO CORS origins               |
| TASK_RETENTION_DAYS      | 60                               | Days before tasks are purged         |
| MCP_SERVER_URL           | http://localhost:3002/api/chat   | MCP proxy target                     |
| OPENAI_MODEL             | gpt-4o-mini                      | Model for extraction/verification    |
| OPENAI_VERIFICATION_MODEL| (falls back to OPENAI_MODEL)     | Verification-specific model override |

### `mcp-server/.env`

| Variable     | Value                        | Purpose                                |
|--------------|------------------------------|----------------------------------------|
| OPENAI_API_KEY | sk-proj-… (different key)  | MCP server OpenAI key                  |
| OPENAI_MODEL | gpt-4.1                      | MCP assistant model                    |
| BACKEND_URL  | http://localhost:4000/api    | Backend API base URL                   |
| SMTP_HOST    | smtp.gmail.com               | Email tool SMTP host                   |
| SMTP_PORT    | 465                          | Email tool SMTP port                   |
| SMTP_USER    | trupeshpmandani@gmail.com    | Email tool sender                      |
| SMTP_PASSWORD| (app password)               | Email tool SMTP password               |
| EMAIL_FROM   | Trupesh Mandani \<…\>         | Email tool sender name                 |

---

## Frontend: Routes

**Router:** React Router DOM v7 (`BrowserRouter`)  
**Auth guard:** `ProtectedRoute` component — reads JWT from `AuthContext`, redirects to `/login`

| Path                              | Component               | Access         |
|-----------------------------------|-------------------------|----------------|
| /                                 | Landing                 | public         |
| /about                            | About                   | public         |
| /services                         | Services                | public         |
| /pricing                          | Pricing                 | public         |
| /contact                          | Contact                 | public         |
| /faq                              | Faq                     | public         |
| /login                            | Login                   | public         |
| /register                         | Register                | public         |
| /student/dashboard                | StudentDashboard        | student only   |
| /student/profile                  | StudentProfile          | student only   |
| /student/documents                | Documents               | student only   |
| /student/tasks                    | Tasks                   | student only   |
| /student/change-password          | ChangePassword          | student only   |
| /student/university-recommendations | UniversityRecommendations | student only |
| /admin/dashboard                  | AdminDashboard          | admin only     |
| /admin/requests                   | ContactRequests         | admin only     |
| /admin/students/registered        | RegisteredStudents      | admin only     |
| /admin/students                   | StudentList             | admin only     |
| /admin/student-profiles           | StudentList (alias)     | admin only     |
| /admin/students/create            | CreateStudent           | admin only     |
| /admin/students/:id               | StudentDetail           | admin only     |
| /admin/tasks                      | Tasks (admin)           | admin only     |
| /admin/assistant                  | AIAssistant             | admin only     |
| /admin/notifications              | Notifications           | admin only     |
| * (catch-all)                     | Navigate to /           | —              |

---

## Frontend: Pages

### Public Pages (`src/pages/`)

| File              | Purpose                                                              |
|-------------------|----------------------------------------------------------------------|
| Landing.jsx        | Marketing hero landing page                                         |
| About.jsx          | About the company/service                                           |
| Services.jsx       | Immigration services listing                                        |
| Pricing.jsx        | Pricing tiers page                                                  |
| Faq.jsx            | Frequently asked questions                                          |
| Contact.jsx        | Public contact form (POSTs to `/api/contact`)                       |
| Login.jsx          | JWT login + Firebase magic-link ("Continue with email") auth        |
| Register.jsx       | Student registration from invite link                               |

### Student Pages (`src/pages/student/`)

| File                        | Purpose                                                          |
|-----------------------------|------------------------------------------------------------------|
| StudentDashboard.jsx         | Overview: journey flow, pending tasks count, doc status summary  |
| StudentProfile.jsx           | View/edit profile fields including passport details              |
| Documents.jsx                | Upload, view, and manage required documents list                 |
| Tasks.jsx                    | View tasks assigned by admin; mark complete                      |
| ChangePassword.jsx           | Change account password form                                     |
| UniversityRecommendations.jsx| View AI-generated university matches; trigger regeneration       |

### Admin Pages (`src/pages/admin/`)

| File                   | Purpose                                                                        |
|------------------------|--------------------------------------------------------------------------------|
| AdminDashboard.jsx      | Stats overview, student count, quick links                                    |
| StudentList.jsx         | Searchable, filterable list with card/list view toggle                        |
| CreateStudent.jsx       | Create student from contact request or from scratch                           |
| StudentDetail.jsx       | Full student file: profile, required docs, tasks, AI extract trigger, verify  |
| RegisteredStudents.jsx  | Students in registered/active status only                                     |
| ContactRequests.jsx     | Pending contact form submissions; approve → create student                    |
| Tasks.jsx               | AI-verification task queue + general tasks; read/dismiss/resolve              |
| Notifications.jsx       | Notification centre; mark read; filtered by type                              |
| AIAssistant.jsx         | MCP AI chat UI; file attachment support; streams NDJSON replies as markdown   |

### Components

| Directory                    | Contents                                                             |
|------------------------------|----------------------------------------------------------------------|
| components/admin/            | NotificationBell, RequiredDocumentsAdmin, StudentCard, StudentListItem |
| components/chat/             | ChatComponent, MessageRenderer (markdown)                            |
| components/common/           | Button, Card, ConfirmDialog, ErrorBoundary, FilePreview, Loading, Toast, VerificationBadge, ViewToggle |
| components/layout/           | AdminLayout, AppSplitterLayout, Footer, Navbar, StudentLayout        |
| components/student/          | DocumentManager, DocumentUpload, DocumentViewer, ProfileFieldDisplay, RequiredDocuments, StudentJourneyFlow, UploadConfirmationModal, UploadedFilesModal |
| components/ui/               | ProNotification, shadcn-io/shimmering-text                           |

### Context / Hooks / Services

| File                              | Purpose                                                     |
|-----------------------------------|-------------------------------------------------------------|
| context/AuthContext.jsx            | JWT auth state; login/logout; role detection                |
| context/NotificationContext.jsx    | Notification list state + unread count                      |
| hooks/useSocket.jsx                | Socket.IO connection; listens for task:created, notification:new |
| hooks/useViewMode.js               | Card/list toggle persistence (localStorage)                 |
| services/api.js                    | Axios instance with base URL + JWT header injection          |
| services/authService.js            | Login, register, profile API calls                          |
| services/ai.service.js             | POST /api/ai/chat (streaming), GET /api/ai/documents/url    |
| services/mcpAPI.js                 | Chat message send via /api/ai/chat                          |
| services/notificationService.js    | Notification CRUD API calls                                 |
| services/recommendationService.js  | Recommendation GET/generate API calls                       |
| services/requireDocService.js      | Required document CRUD API calls                            |
| services/studentTaskService.js     | Student task API calls                                      |
| services/taskService.js            | Admin task API calls                                        |
| services/uploadService.js          | File upload API calls                                       |

---

## Frontend: UI Library Usage Map

| Library                     | Version | Usage in Project                                               |
|-----------------------------|---------|----------------------------------------------------------------|
| Tailwind CSS                | ^3.4    | Base utility classes throughout; all components use it         |
| shadcn/ui (CVA + Headless)  | custom  | `class-variance-authority`, `@headlessui/react` — common components (Button, Card, Dialog) |
| MUI (`@mui/material`)       | ^7.3    | Data grids, form inputs, icons in admin pages                  |
| PrimeReact                  | ^10.9   | AppSplitterLayout (Splitter component), some data tables        |
| Framer Motion               | ^12.23  | Page/component animations                                      |
| Lucide React                | ^0.553  | Icon set used in nav, cards, badges                            |
| React Icons                 | ^5.2    | Additional icon set                                            |
| React Dropzone              | ^14.3   | Document upload drop zones                                     |
| React Markdown + remark-gfm | ^10.1   | Render AI assistant markdown replies                           |
| Socket.IO Client            | ^4.8    | Real-time task/notification events                             |
| Firebase (client)           | ^11.10  | Email sign-in link auth flow                                   |

---

## MCP Server: Tools

**Server:** Express on port 3002  
**Transport:** HTTP REST (`POST /api/chat`)  
**LLM orchestration:** OpenAI function-calling (`gpt-4.1`), up to 3 completion rounds per request  
**Tool registration:** Auto-discovered from `tools/` directory via `_toolRegistry.js`

### Student Tools (`tools/studentTools.js`)

| Tool name                  | Args (required)                | Purpose                                        |
|----------------------------|--------------------------------|------------------------------------------------|
| `getStudentById`           | studentId                      | Retrieve single student record by internal ID  |
| `searchStudents`           | query? (optional)              | Keyword search; blank = list all students      |
| `getStudentMissingDocuments`| studentId                     | List outstanding required docs for student     |
| `updateStudentStage`       | studentId, newStage            | Update workflow stage                          |
| `addStudentNote`           | studentId, noteText            | Append note to student profile                 |
| `getStudentOverview`       | studentId                      | Consolidated progress overview                 |

### Task Tools (`tools/taskTools.js`)

| Tool name                 | Args (required)                    | Purpose                               |
|---------------------------|------------------------------------|---------------------------------------|
| `getTasksForStudent`      | studentId                          | Fetch all tasks for student           |
| `createStudentTask`       | studentId, title; +description, dueDate, attachmentPath (opt) | Create CRM task with optional file |
| `updateStudentTaskStatus` | studentId, taskId, status; +notes (opt) | Update task status              |
| `deleteStudentTask`       | studentId, taskId                  | Remove task                           |

### Document Tools (`tools/documentTools.js`)

| Tool name              | Args (required)                               | Purpose                                                 |
|------------------------|-----------------------------------------------|---------------------------------------------------------|
| `uploadDocument`       | aiKey, documentType, filePath                 | Upload file via Smart Upload route (by document type)   |
| `getStudentDocuments`  | aiKey                                         | List all files with presigned S3 URLs                   |
| `getDocumentById`      | aiKey, docId, fileId                          | Get single file presigned URL                           |
| `verifyDocument`       | aiKey, docId, fileId; +verified, notes (opt)  | Admin-verify a document                                 |
| `renameDocument`       | aiKey, documentId, newName                    | Rename document entry                                   |
| `getRequiredDocuments` | aiKey                                         | List required document slots (to find IDs)              |
| `deleteDocument`       | aiKey; +documentId OR documentName            | Delete document slot; smart name-to-ID lookup           |

**Commented-out / not implemented:**
- `classifyDocumentType` — direct AI service integration not wired
- `extractDocument` — no dedicated backend route
- `summarizeDocument`, `explainDocument`, `detectDocumentIssues`, `translateDocument`, `compareDocumentDetails` — no backend routes

### Email Tools (`tools/emailTools.js`)

| Tool name   | Args (required)              | Purpose                                 |
|-------------|------------------------------|-----------------------------------------|
| `sendEmail` | to, subject, body; +html opt | Send email via nodemailer SMTP          |

---

## Working End-to-End Flows

Based on code analysis — these flows appear fully wired:

1. **Contact → Student onboarding**  
   Public submits contact form → saved as Student `status=pending` → admin sees in `/admin/requests` → admin approves → `sendStudentInviteEmail()` generates Firebase magic link → student clicks link → `/auth/firebase-login` creates JWT → student sets password → admin activates → `status=active`

2. **Document upload + AI verification**  
   Student uploads file to required-document slot → multer saves to `/tmp/required-docs/` → controller downloads from temp, uploads to S3 → calls `verifyDocumentType()` → creates/updates Task via `createVerificationTask()` → Socket.IO emits `task:created` to admins room → admin sees in task queue → admin manually confirms → `resolveVerificationTasks()` → task resolved

3. **AI document extraction (admin-triggered)**  
   Admin views StudentDetail → triggers extract → uploads files to `/api/upload` → calls `extractProfileWithAI()` → classifies each doc → extracts fields → merges into `student.profile` with passport smart-merge protection

4. **University recommendation generation**  
   Admin/student triggers `POST /api/recommendations/generate/:studentId` → `generateUniversityListFromProfile(student.profile)` → OpenAI returns JSON list → saved to Recommendation collection → shown on student's `/student/university-recommendations`

5. **AI assistant chat (MCP)**  
   Admin opens `/admin/assistant` → types query → `POST /api/ai/chat` → backend proxies to mcp-server `POST /api/chat` → `runMCPChat()` calls OpenAI gpt-4.1 with tool definitions → executes tools (student search, task create, doc upload, email) → streams NDJSON reply → frontend renders markdown

6. **File attachment via AI assistant**  
   Admin attaches file in chat UI → frontend uploads to `/api/files/temp-upload` → gets temp path → appends `[System: User attached file: … (Path: …)]` to message → MCP enforces `uploadDocument` tool call → file uploaded to student's S3 slot

7. **Real-time notifications**  
   Any task create/update → `emitTaskCreated/Updated()` → Socket.IO push to `admins` room → `NotificationBell` updates badge count → notification stored in Notification collection → admin sees in `/admin/notifications`

8. **Student task workflow**  
   Admin creates task via `POST /:aiKey/tasks` (with optional file attachment → S3) → student sees in `/student/tasks` (`seenByStudent=false` initially) → marks complete → `PATCH /:aiKey/tasks/:taskId` → `Notification` record created → admin notified via Socket.IO

---

## Known Broken or Half-Built Things

1. **`backend/modules/notifications/email.service.js` — template interpolation broken**  
   Email HTML templates use `${data.field}` inside a module-level object literal (not a function). These are evaluated at module load time when `data` is undefined, meaning the templates always render as empty strings. Templates must be converted to functions.

2. **Dual upload pipelines**  
   `POST /api/upload` saves to local `/uploads/` dir and is student-only. `POST /:aiKey/required-documents/files` saves to S3. They are separate; no auto-promotion from `/uploads` to S3. The `/api/upload` route appears disconnected from the AI extraction pipeline.

3. **`context-manager.js` — unused**  
   `buildStudentContext()` builds a formatted student context string but is never called; the AI assistant proxies directly to the MCP server instead.

4. **`Student.documents[]` vs `requiredDocuments[]` — dual-store inconsistency**  
   Two arrays store document references. The newer `requiredDocuments[].files[]` is the active one; `documents[]` appears to be an older field. Some endpoints populate both; this will complicate the Postgres migration.

5. **REDIS_URL in config but no Redis client**  
   `config/env.js` exports `REDIS_URL` but nothing in the codebase imports or uses it. Likely a planned feature (queuing, caching, sessions) never implemented.

6. **Google Drive credentials still in `.env`**  
   `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` are present in `backend/.env` despite Drive integration being removed. Dead credential in environment.

7. **Notification model type enum — too narrow**  
   `Notification.type` enum only allows `"TASK_COMPLETED"`. If other notification types are added without migrating the enum, Mongoose will throw validation errors.

8. **`GET /api/students/:aiKey` is public**  
   No authentication required. Returns full student object including profile data by aiKey. Likely acceptable for MCP server use but is an information-disclosure risk.

9. **MCP document tool stubs**  
   `classifyDocumentType` and `extractDocument` are defined but return `success: false` immediately. Five other tools (`summarize`, `explain`, `detect`, `translate`, `compare`) are commented out entirely with notes that backend routes don't exist.

10. **`/auth/register` route — possibly vestigial**  
    The invite flow uses Firebase magic link → `/auth/firebase-login`. The `/auth/register` endpoint exists but its role in the current flow is unclear; may conflict with the Firebase-first onboarding path.

11. **No CSRF protection**  
    JWT is passed as Bearer token; no CSRF tokens on state-mutating routes. Acceptable for API-only backend but worth noting.

12. **`AppSplitterLayout` — PrimeReact Splitter persistence**  
    Panel layout is not persisted to localStorage; resets on page refresh.

13. **`website/` — not scanned**  
    Next.js marketing site was excluded from this inventory. It is separate from the CRM backend.

---

## File Tree (scanned)

```
Immigration-CRM/
├── SYSTEM_INVENTORY.md          ← this file
├── backend/
│   ├── .env                     (credentials — redacted above)
│   ├── index.js                 (Express + Socket.IO bootstrap)
│   ├── AI/
│   │   ├── ai.service.js
│   │   ├── ai-document-verify/
│   │   │   └── verification.service.js
│   │   ├── ai-file-extract/
│   │   │   ├── document-classifier.js
│   │   │   ├── extract.service.js
│   │   │   ├── field-priority.js
│   │   │   └── pdf-to-images.js
│   │   ├── ai-recommendation/
│   │   │   ├── aiRecommendation.service.js
│   │   │   ├── recommendation.controller.js
│   │   │   └── recommendation.route.js
│   │   └── assistant/
│   │       ├── context-manager.js
│   │       └── index.js
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── File.js
│   │   ├── Notification.js
│   │   ├── Recommendation.js
│   │   ├── Student.js
│   │   └── Task.js
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   └── auth.route.js
│   │   ├── contact/
│   │   │   ├── contact.controller.js
│   │   │   └── contact.route.js
│   │   ├── notifications/
│   │   │   ├── email.service.js
│   │   │   ├── notification.controller.js
│   │   │   └── notification.route.js
│   │   ├── s3/
│   │   │   └── s3.service.js
│   │   ├── students/
│   │   │   ├── student.controller.js
│   │   │   ├── student.invite.js
│   │   │   ├── student.route.js
│   │   │   └── student.service.js
│   │   ├── tasks/
│   │   │   ├── task.controller.js
│   │   │   ├── task.routes.js
│   │   │   └── task.service.js
│   │   └── upload/
│   │       ├── upload.controller.js
│   │       ├── upload.routes.js
│   │       └── upload.service.js
│   ├── routes/
│   │   ├── ai.routes.js
│   │   ├── file.routes.js
│   │   └── index.js
│   ├── socket/
│   │   └── index.js
│   └── utils/
│       ├── adminRecipients.js
│       ├── fileName.js
│       ├── firebaseAdmin.js
│       ├── generateAiKey.js
│       └── sendEmail.js
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.jsx              (router)
│       ├── components/
│       │   ├── admin/           (4 components)
│       │   ├── chat/            (2 components)
│       │   ├── common/          (9 components)
│       │   ├── layout/          (5 components)
│       │   ├── student/         (8 components)
│       │   └── ui/              (2 components)
│       ├── context/             (AuthContext, NotificationContext)
│       ├── firebase/            (config.js)
│       ├── hooks/               (useSocket, useViewMode)
│       ├── pages/
│       │   ├── (8 public pages)
│       │   ├── admin/           (9 pages)
│       │   └── student/         (6 pages)
│       ├── services/            (9 service files)
│       └── utils/               (ProtectedRoute, fileName, requiredDocs)
├── mcp-server/
│   ├── .env
│   ├── index.js                 (Express on port 3002)
│   ├── config/                  (backend.js, env.js, logger.js)
│   ├── controllers/             (chat.controller.js)
│   ├── mcp/                     (chatProcessor.js, toolInvoker.js)
│   ├── routes/                  (chat.routes.js)
│   ├── services/                (email.service.js, mcp.service.js, student.service.js)
│   ├── tools/
│   │   ├── _toolRegistry.js
│   │   ├── documentTools.js
│   │   ├── emailTools.js
│   │   ├── studentTools.js
│   │   └── taskTools.js
│   └── utils/                   (authContext.js, httpClient.js)
└── website/                     (Next.js — not scanned)
```

---

*End of inventory. Total: 6 models · 46 API endpoints · 17 backend services/functions · 5 AI prompts · 23 frontend routes · 17 MCP tools (7 active, 2 stubs, 5 missing backend routes)*
