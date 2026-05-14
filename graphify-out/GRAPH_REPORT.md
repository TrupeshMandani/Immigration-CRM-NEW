# Graph Report - Immigration-CRM  (2026-05-14)

## Corpus Check
- 247 files · ~137,190 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1386 nodes · 2273 edges · 109 communities (99 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d31597b5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 31 edges
2. `Backend: Services` - 16 edges
3. `Document Tools - Manual Testing Guide` - 16 edges
4. `withFirmContext()` - 15 edges
5. `runAIJob()` - 15 edges
6. `firms` - 14 edges
7. `SectionShell()` - 14 edges
8. `SYSTEM INVENTORY — Immigration CRM` - 14 edges
9. `cn()` - 13 edges
10. `db` - 13 edges

## Surprising Connections (you probably didn't know these)
- `sendStudentInviteEmail()` --calls--> `sendEmail()`  [INFERRED]
  apps/backend/src/modules/students/student.invite.js → apps/mcp-server/services/email.service.js
- `sendTaskAssignedEmail()` --calls--> `sendEmail()`  [INFERRED]
  apps/backend/src/modules/students/student.controller.js → apps/mcp-server/services/email.service.js
- `notifyStudentAboutRequiredDoc()` --calls--> `sendEmail()`  [INFERRED]
  apps/backend/src/modules/students/student.controller.js → apps/mcp-server/services/email.service.js
- `Navbar()` --calls--> `useAuth()`  [EXTRACTED]
  apps/consultant-web/src/components/layout/Navbar.jsx → apps/consultant-web/src/context/AuthContext.jsx
- `Documents()` --calls--> `useAuth()`  [EXTRACTED]
  apps/consultant-web/src/pages/student/Documents.jsx → apps/consultant-web/src/context/AuthContext.jsx

## Communities (109 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (51): tsReady(), mongoose, taskSchema, deriveOrigins(), emitNotification(), emitTaskCreated(), emitTaskUpdated(), emitToFirm() (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (51): Admin, {
  buildRequiredDocFileName,
  guessExtension,
  getStudentDisplayName,
}, candidate, cleanedPassport, contactEmail, {
  createVerificationTask,
  resolveVerificationTasks,
}, DEFAULT_REQUIRED_DOCUMENTS, doc (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (37): BACKEND_SERVICE_TOKEN, BACKEND_URL, { getEnv }, agentRequest, { describe, it, expect, jest, beforeEach }, documentTools, fs, httpClient (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (39): addNote(), axios, { BACKEND_SERVICE_TOKEN }, buildStudentPath(), client, createStudentTask(), deleteStudentTask(), ensureValue() (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (15): AdminDashboard(), EMPTY_CONTACT, StudentDetail(), AuthContext, AuthProvider(), useAuth(), Login(), Register() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (20): initialFilesModalState, initialUploadModalState, initialPreviewState, statusFilters, typeFilters, statusTokens, requiredDocsService, taskService (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (23): documentsRouter, BUCKET(), computeS3Hash(), DbClient, deleteDocument(), DOWNLOAD_TTL(), finalizeUpload(), generateUploadUrl() (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (10): Navbar(), milestones, values, contactInfo, categories, faqs, tiers, highlights (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (24): NewTask, body, taskId, { taskIds }, { type, status, scope, limit, page }, { userId }, completeTask(), createTask() (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (11): buttonSizes, NotificationBell(), statusStyles, TasksPage(), NotificationContext, NotificationProvider(), SocketContext, SocketProvider() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (15): issueJwt(), provisionTwoFirmsWithData(), seedInFirm(), NewDocument, Firm, firms, NewFirm, Student (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (19): NewStudent, CreateStudentInput, CreateStudentSchema, StudentFilters, StudentFiltersSchema, StudentStageEnum, StudentStatusEnum, UpdateStudentInput (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (23): AddStudentNoteInput, CreateStudentTaskInput, DeleteDocumentInput, DeleteStudentTaskInput, GetDocumentByIdInput, GetDocumentByIdOutput, GetRequiredDocumentsInput, GetRequiredDocumentsOutput (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (10): milestones, promotionCards, guides, services, stories, Button, PageHero(), PageHeroProps (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (21): ACCESS_SECRET(), Admin, aiKeyBase, baseKey, DEFAULT_FIRM_ID(), email, env, firebaseAdmin (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (15): db, sql, teardownFirms(), TwoFirmFixture, EXEMPT_PREFIXES, Request, tenantContextMiddleware(), notificationsRouter (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (17): buildUserContent(), chatWithAssistant(), client, extractImportantFields(), fs, OpenAI, path, { chatWithAssistant } (+9 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (5): filterTabs, NotificationsPage(), useNotifications(), AdminLayout(), navItems

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (11): geistMono, geistSans, metadata, viewport, cn(), SiteFooter(), SiteFooterProps, SiteNavbar() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (17): AIJobContext, ANTHROPIC_MODELS, calcCostCents(), callAnthropic(), callOpenAI(), JobType, logJob(), LogJobParams (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (15): buildFallbackUniversities(), FALLBACK_UNIVERSITIES, generateUniversityListFromProfile(), OpenAI, { generateUniversityListFromProfile }, languageBandKeys, mergedPreferences, numericBandValues (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (12): aiRouter, current, documentId, profile, studentId, redisOpts(), startVerifyWorker(), VerifyJobData (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (12): Hero(), Pathway, pathways, processSteps, PromotionFilter, promotionFilters, trustHighlights, CollegeShowcase() (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (14): { authenticateToken, requireAdmin }, express, {
  getRecommendations,
  generateRecommendations,
  setRecommendationEnabled
}, router, ACCESS_SECRET(), Admin, authenticateToken(), jwt (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (13): id, { status = 'UNREAD', page, limit }, DbClient, formatNotification(), listForUser(), ListOptions, markAllRead(), markAsRead() (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (16): `backend/AI/ai-document-verify/verification.service.js`, `backend/AI/ai-file-extract/document-classifier.js`, `backend/AI/ai-file-extract/extract.service.js`, `backend/AI/ai-file-extract/field-priority.js`, `backend/AI/ai-recommendation/aiRecommendation.service.js`, `backend/AI/ai.service.js`, `backend/AI/assistant/context-manager.js`, `backend/AI/assistant/index.js` (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (10): siteConfig, SiteRoute, MapleGlowBackgroundProps, MapleLeaf, pathways, PointerState, stats, BaseProps (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (13): requireStudent(), { authenticateToken, requireStudent }, express, { handleUpload }, router, { upload }, fs, multer (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (12): FIELD_PRIORITY, prioritizeFields(), documentMetadata, documents, { extractProfileWithAI }, fs, path, { prioritizeFields } (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (14): Adding a new endpoint to the suite, code:bash (cp .env.example .env   # fill in secrets), code:typescript (firm_id: text('firm_id').notNull().references(() => firms.id), code:sql (ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;), code:typescript (const [recordA] = await seedInFirm(firmA.id, (tx) =>), code:typescript (import { myRouter } from '../modules/my-module/my.route';), code:typescript (describe('Cross-tenant isolation: GET /api/my-route', () => ), code:typescript (import { db } from '../../db/postgres'; // bypass RLS) (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (14): ai_verification field, code:block1 (1. POST /api/documents/upload-url  →  { uploadUrl, documentI), code:block2 (POST /api/documents/upload-url), code:json ({), code:block4 (PUT <uploadUrl>), code:block5 (POST /api/documents/:documentId/finalize), Documents API — Changes for Frontend (Prompts 18-19), Existing endpoints removed / superseded (+6 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (15): Backend: AI Prompts (verbatim), code:block10 (Student Profile JSON:\n${JSON.stringify(profile, null, 2)}\n), code:block11 (Your previous response was invalid.), code:block12 (You are an Immigration CRM AI Assistant.), code:block13 (CRITICAL ATTACHMENT POLICY - YOU MUST FOLLOW THIS:), code:block5 (You are an expert immigration document analyst.), code:block6 (You are an expert document classifier for an immigration CRM), code:block7 (You are an immigration compliance assistant who labels docum) (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (12): ensureTransporter(), { getEnv }, logger, nodemailer, sendEmail(), smtpConfig, notifyStudentAboutRequiredDoc(), { describe, it, expect, jest, beforeEach } (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (13): { APP_BASE_URL }, { generateAiKey }, generatedAiKey, { getAdminNotificationEmails }, nameParts, normalizedEmail, randomSuffix, recipientList (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (11): AiJob, aiJobs, NewAiJob, Anthropic, context, costCents, EXPECTED_HASHES, fakeCreate (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (13): deleteLocalFile(), deleteS3Object(), env, fs, getMimeType(), getPresignedUrl(), { getSignedUrl }, listStudentFiles() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (13): getEnv(), buildAttachmentPolicyMessage(), buildToolDefinitions(), extractAttachments(), { getEnv }, getOpenAIClient(), invokeTool, logger (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.16
Nodes (4): initialMessage, loadingWords, uploadTempFile(), mcpAPI

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (12): `backend/.env`, Backend: Environment Variables, code:bash (git init), code:block14 (Immigration-CRM/), File Tree (scanned), Frontend: Routes, Frontend: UI Library Usage Map, GIT STATUS (+4 more)

### Community 39 - "Community 39"
Cohesion: 0.27
Nodes (12): appendLog(), appendToAllLogs(), ensureLogsDirectory(), error(), errorLogPath, formatLine(), fs, info() (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.21
Nodes (11): extractMessage(), logger, { runWithAuthContext }, sendChatMessage(), { sendToMCP }, streamReply(), wait(), chatController (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (11): dotenv, env, envPath, path, app, chatRoutes, cors, express (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.23
Nodes (11): baseResult(), buildImagePayload(), client, { extractTextFromFile }, fs, normalizeStatus(), OpenAI, { pdfToImages } (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (8): api, token, notificationService, studentTaskService, defaultFilters, intakeOptions, modeOptions, UniversityRecommendation()

### Community 44 - "Community 44"
Cohesion: 0.2
Nodes (8): partnerBenefits, showcaseMetrics, College, CollegesExplorer(), Props, sortOptions, SectionHeading(), SectionHeadingProps

### Community 45 - "Community 45"
Cohesion: 0.23
Nodes (8): PromotionCard(), Props, College, colleges, collegeToPromotionCard(), PromotionCard, Marquee(), MarqueeProps

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (9): buildExtractSystemPrompt(), extractImportantFields(), extractProfileWithAI(), extractTextFromFile(), FileInput, pdfParse, { pdfToImages }, { fromPath } (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.2
Nodes (10): buildDocumentVerificationSummary(), createDefaultRequiredDocument(), createDocumentSlug(), formatRequiredDocument(), processRequiredDocumentUpload(), refreshDocumentVerificationSnapshot(), sanitizeForSlug(), getStudentDisplayName() (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (10): code:bash (# 1. Get student documents (should be empty or have old docs), code:bash (#!/bin/bash), code:bash (chmod +x test-document-tools.sh), Complete Integration Test Flow, Document Tools - Manual Testing Guide, Next Steps, Prerequisites, Quick Test Script (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (7): programTracks, Program, ProgramsExplorer(), Props, sortOptions, InteractiveGridPattern(), InteractiveGridPatternProps

### Community 50 - "Community 50"
Cohesion: 0.2
Nodes (9): {
  authenticateToken,
  requireAdmin,
  requireStudent,
}, ctrl, express, fs, multer, path, router, upload (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (8): axios, handleAssistantQuery(), document, express, { getPresignedUrl }, { handleAssistantQuery }, router, Student

### Community 54 - "Community 54"
Cohesion: 0.24
Nodes (5): derivePassportDetailsFromProfile(), mapKeysToLower(), normalizePassportDate(), PASSPORT_FIELD_KEYS, StudentProfile()

### Community 55 - "Community 55"
Cohesion: 0.2
Nodes (10): `/api/ai`, `/api/auth`, `/api/contact`, `/api/files`, `/api/notifications` (all routes require auth), `/api/recommendations` (all routes require auth), `/api/students`, `/api/tasks` (admin only — all routes behind `requireAdmin`) (+2 more)

### Community 56 - "Community 56"
Cohesion: 0.2
Nodes (10): Admin (`backend/models/Admin.js`), Backend: Models, code:block2 ({), code:block3 ({), code:block4 ({ name, country, program, degreeLevel, eligibilityReason,), File (`backend/models/File.js`), Notification (`backend/models/Notification.js`), Recommendation (`backend/models/Recommendation.js`) (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.2
Nodes (5): { MONGODB_URI }, mongoose, activeTransporter, nodemailer, {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  EMAIL_FROM,
}

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (8): admin, adminSchema, bcrypt, mongoose, Admin, { ADMIN_NOTIFICATIONS_EMAIL }, getAdminNotificationEmails(), parseList()

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (8): buildImagePayload(), buildVerifyUserPrompt(), normalizeStatus(), { pdfToImages }, safeJsonParse(), VALID_STATUSES, VerificationResult, verifyDocumentType()

### Community 60 - "Community 60"
Cohesion: 0.22
Nodes (6): mongoose, notificationSchema, Notification, pageNum, perPage, query

### Community 61 - "Community 61"
Cohesion: 0.36
Nodes (7): extractPassportData(), mapKeysToLower(), mergePassportDetails(), normalizePassportDate(), PASSPORT_FIELD_KEYS, Student, upsertStudent()

### Community 62 - "Community 62"
Cohesion: 0.22
Nodes (9): code:bash (# Create a test file first), code:bash (curl -X POST http://localhost:4000/api/students/{aiKey}/requ), code:json ({), Expected Result, Prerequisites, Purpose, Test Case 1: uploadDocument, Test Steps (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (6): tools, entries, fs, path, registry, toolModule

### Community 64 - "Community 64"
Cohesion: 0.31
Nodes (7): buildInviteEmail(), env, { getFirebaseAdmin }, { sendEmail }, sendStudentInviteEmail(), admin, getFirebaseAdmin()

### Community 65 - "Community 65"
Cohesion: 0.32
Nodes (7): OAIMessage, buildFallbackUniversities(), buildRecommendationUserPrompt(), FALLBACK_UNIVERSITIES, generateUniversityListFromProfile(), RecommendationResult, University

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (8): code:javascript (// In MCP server console or test script), code:bash (curl -X GET http://localhost:4000/api/students/{aiKey}/files), code:json ({), Expected Result, Purpose, Test Case 2: getStudentDocuments, Test Steps, Validation Checklist

### Community 67 - "Community 67"
Cohesion: 0.25
Nodes (8): code:bash (curl -X POST "http://localhost:4000/api/students/{aiKey}/req), code:json ({), Expected Result, Prerequisites, Purpose, Test Case 4: verifyDocument, Test Steps, Validation Checklist

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (4): Student, mongoose, student, studentSchema

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (6): express, multer, os, router, storage, upload

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (7): Check Backend Logs, Check MCP Server Logs, code:bash (# In mcp-server terminal, look for:), code:bash (# In backend terminal, look for:), code:javascript (console.log("[uploadDocument] Args:", { aiKey, docId, filePa), Enable Verbose Logging, Logging and Debugging

### Community 72 - "Community 72"
Cohesion: 0.29
Nodes (7): code:bash (curl -X DELETE "http://localhost:4000/api/students/{aiKey}/d), code:json ({), Expected Result, Purpose, Test Case 6: deleteDocument, Test Steps, Validation Checklist

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (7): code:bash (curl -X POST "http://localhost:4000/api/students/{aiKey}/doc), code:json ({), Expected Result, Purpose, Test Case 5: renameDocument, Test Steps, Validation Checklist

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (7): code:json ({), code:bash (curl -X GET "http://localhost:4000/api/students/{aiKey}/requ), Expected Result, Purpose, Test Case 3: getDocumentById, Test Steps, Validation Checklist

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (5): emailTemplates, mailOptions, nodemailer, results, transporter

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (5): { authenticateToken }, express, protectedRouter, router, { tenantContextMiddleware }

### Community 79 - "Community 79"
Cohesion: 0.33
Nodes (6): Admin Pages (`src/pages/admin/`), Components, Context / Hooks / Services, Frontend: Pages, Public Pages (`src/pages/`), Student Pages (`src/pages/student/`)

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (6): code:javascript (// Should fail), code:javascript (await uploadDocument({), code:javascript (await getStudentDocuments({ aiKey: "invalid-key-999" });), code:javascript (// Student token trying to verify), Error Testing, Test Invalid Arguments

### Community 81 - "Community 81"
Cohesion: 0.47
Nodes (5): formatMCPResponse(), logger, normalizeReply(), { runMCPChat }, sendToMCP()

### Community 82 - "Community 82"
Cohesion: 0.4
Nodes (4): { authenticateToken }, ctrl, express, router

### Community 83 - "Community 83"
Cohesion: 0.4
Nodes (4): { authenticateToken }, ctrl, express, router

### Community 84 - "Community 84"
Cohesion: 0.5
Nodes (4): main(), mongoSchema, MongoStudent, splitName()

### Community 85 - "Community 85"
Cohesion: 0.4
Nodes (5): Document Tools (`tools/documentTools.js`), Email Tools (`tools/emailTools.js`), MCP Server: Tools, Student Tools (`tools/studentTools.js`), Task Tools (`tools/taskTools.js`)

### Community 86 - "Community 86"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 87 - "Community 87"
Cohesion: 0.4
Nodes (5): 1. Get a Student's AI Key, 2. Get Required Document IDs, code:bash (# Login as admin and get a student record), code:bash (# Get student's required documents), Getting Test Data

### Community 88 - "Community 88"
Cohesion: 0.7
Nodes (4): enableRecommendation(), generateRecommendation(), getRecommendations(), withAuth()

### Community 89 - "Community 89"
Cohesion: 0.5
Nodes (3): clamp(), STEPS, StudentJourneyWorkflowPro()

### Community 90 - "Community 90"
Cohesion: 0.5
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 91 - "Community 91"
Cohesion: 0.5
Nodes (3): ctrl, express, router

## Knowledge Gaps
- **638 isolated node(s):** `StudentStatusEnum`, `StudentStageEnum`, `GetStudentByIdInput`, `SearchStudentsInput`, `GetStudentMissingDocumentsInput` (+633 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildRequiredDocFileName()` connect `Community 5` to `Community 1`, `Community 47`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **Why does `sendEmail()` connect `Community 32` to `Community 64`, `Community 1`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `sendStudentInviteEmail()` connect `Community 64` to `Community 32`, `Community 1`, `Community 14`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `StudentStatusEnum`, `StudentStageEnum`, `GetStudentByIdInput` to the rest of the system?**
  _638 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._