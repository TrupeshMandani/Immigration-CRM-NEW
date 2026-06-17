# Document Tools - Manual Testing Guide

This guide provides step-by-step instructions to manually test each document tool to ensure it's working correctly.

## Prerequisites

Before testing, ensure:
1. ✅ Backend server is running (`npm run dev` in `/backend`)
2. ✅ MCP server is running (`npm run dev` in `/mcp-server`)
3. ✅ You have a valid applicant account with an `aiKey`
4. ✅ You have authentication token (Bearer token)

## Getting Test Data

### 1. Get a Applicant's AI Key
```bash
# Login as admin and get a applicant record
curl -X GET http://localhost:4000/api/applicants \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Note the student's aiKey from response
# Example: "1732182123456-abc123def"
```

### 2. Get Required Document IDs
```bash
# Get student's required documents
curl -X GET http://localhost:4000/api/applicants/{aiKey}/required-documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# Note the document IDs from response
# Example: "passport-doc-id", "ielts-doc-id"
```

---

## Test Case 1: uploadDocument

### Purpose
Verify file upload for a student's required document

### Prerequisites
- Sample PDF file (create a test file: `test-passport.pdf`)
- Applicant's `aiKey`
- Required document `docId`

### Test Steps

**Via AI Assistant UI:**
1. Open AI Assistant chat
2. Say: *"Upload the file /path/to/test-passport.pdf for applicant KEY-123's passport requirement DOC-456"*
3. AI should call `uploadDocument` tool
4. Verify response shows success

**Via MCP Server Direct Call:**
```bash
# Create a test file first
echo "Test Passport Content" > /tmp/test-passport.pdf

# The MCP server will call this internally
# You test by asking AI Assistant to upload
```

**Via cURL (Backend Direct - for debugging):**
```bash
curl -X POST http://localhost:4000/api/applicants/{aiKey}/required-documents/{docId}/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/test-passport.pdf"
```

### Expected Result
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "file": {
      "id": "file-xyz-123",
      "name": "test-passport.pdf",
      "size": 12345,
      "uploadedAt": "2025-11-21T08:30:00Z",
      "key": "applicant-key/required-docs/passport/test-passport.pdf"
    }
  }
}
```

### Validation Checklist
- [ ] File appears in student's document list
- [ ] File size matches original
- [ ] Correct document type association
- [ ] Timestamp is recent
- [ ] No error messages in logs

---

## Test Case 2: getApplicantDocuments

### Purpose
Retrieve all documents for a applicant with presigned URLs

### Test Steps

**Via AI Assistant UI:**
1. Ask: *"Show me all documents for applicant KEY-123"*
2. AI calls `getApplicantDocuments` tool
3. Verify list of documents is returned

**Via MCP Server Direct Call:**
```javascript
// In MCP server console or test script
const result = await getApplicantDocuments({
  aiKey: "applicant-key-123"
});
console.log(result);
```

**Via cURL (Backend Direct):**
```bash
curl -X GET http://localhost:4000/api/applicants/{aiKey}/files \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Expected Result
```json
{
  "success": true,
  "files": [
    {
      "key": "applicant-123/passport.pdf",
      "bucket": "immigration-crm-bucket",
      "name": "passport.pdf",
      "mimeType": "application/pdf",
      "size": 245678,
      "uploadedAt": "2025-11-21T08:00:00Z",
      "url": "https://s3.amazonaws.com/presigned-url..."
    },
    {
      "key": "applicant-123/ielts.pdf",
      "name": "ielts.pdf",
      "url": "https://s3.amazonaws.com/presigned-url..."
    }
  ],
  "totalFiles": 2
}
```

### Validation Checklist
- [ ] All applicant documents are listed
- [ ] Each file has a valid presigned URL
- [ ] File metadata (name, size, date) is accurate
- [ ] `totalFiles` count matches array length
- [ ] URLs are accessible (test by visiting one)

---

## Test Case 3: getDocumentById

### Purpose
Retrieve a specific document with presigned URL

### Test Steps

**Via AI Assistant UI:**
1. Ask: *"Get the presigned URL for file FILE-123 in document DOC-456 for applicant KEY-789"*
2. AI calls `getDocumentById` tool
3. Verify URL is returned

**Via cURL (Backend Direct):**
```bash
curl -X GET "http://localhost:4000/api/applicants/{aiKey}/required-documents/{docId}/files/{fileId}/url" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Expected Result
```json
{
  "success": true,
  "url": "https://s3.amazonaws.com/bucket/path?X-Amz-Algorithm=...",
  "data": {
    "url": "https://s3.amazonaws.com/...",
    "expiresIn": 3600
  }
}
```

### Validation Checklist
- [ ] Presigned URL is returned
- [ ] URL is valid (copy-paste into browser)
- [ ] File downloads correctly
- [ ] URL expires after expected time (default 1 hour)

---

## Test Case 4: verifyDocument

### Purpose
Mark a document as verified by admin

### Prerequisites
- Admin authentication token
- Applicant's `aiKey`
- Document `docId` and `fileId`

### Test Steps

**Via AI Assistant UI (as Admin):**
1. Ask: *"Verify file FILE-123 in document DOC-456 for applicant KEY-789 as approved with note 'Passport verified'"*
2. AI calls `verifyDocument` tool
3. Verify success response

**Via cURL (Backend Direct):**
```bash
curl -X POST "http://localhost:4000/api/applicants/{aiKey}/required-documents/{docId}/files/{fileId}/verify" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verified": true,
    "notes": "Passport verified - all details match"
  }'
```

### Expected Result
```json
{
  "success": true,
  "message": "Document verification completed",
  "data": {
    "verified": true,
    "verifiedBy": "admin-user-id",
    "verifiedAt": "2025-11-21T08:45:00Z",
    "notes": "Passport verified - all details match"
  }
}
```

### Validation Checklist
- [ ] Document marked as verified in database
- [ ] Verification timestamp is recorded
- [ ] Admin user ID is recorded
- [ ] Notes are saved correctly
- [ ] Student can see verification status
- [ ] Only admin can verify (test with applicant token - should fail)

---

## Test Case 5: renameDocument

### Purpose
Rename an existing document

### Test Steps

**Via AI Assistant UI:**
1. Ask: *"Rename document DOC-123 for applicant KEY-456 to 'passport-updated.pdf'"*
2. AI calls `renameDocument` tool
3. Verify document name changes

**Via cURL (Backend Direct):**
```bash
curl -X POST "http://localhost:4000/api/applicants/{aiKey}/documents/{documentId}/rename" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newName": "passport-updated.pdf"
  }'
```

### Expected Result
```json
{
  "success": true,
  "message": "Document renamed successfully",
  "data": {
    "documentId": "doc-123",
    "oldName": "passport.pdf",
    "newName": "passport-updated.pdf",
    "updatedAt": "2025-11-21T09:00:00Z"
  }
}
```

### Validation Checklist
- [ ] Document name updated in database
- [ ] New name appears in file list
- [ ] File is still accessible with new name
- [ ] Old name no longer appears
- [ ] Presigned URL reflects new name

---

## Test Case 6: deleteDocument

### Purpose
Delete a document from student's files

### Test Steps

**Via AI Assistant UI:**
1. Ask: *"Delete document DOC-123 for applicant KEY-456"*
2. AI calls `deleteDocument` tool
3. Verify document is removed

**Via cURL (Backend Direct):**
```bash
curl -X DELETE "http://localhost:4000/api/applicants/{aiKey}/documents/{documentId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Expected Result
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "data": {
    "documentId": "doc-123",
    "deletedAt": "2025-11-21T09:15:00Z"
  }
}
```

### Validation Checklist
- [ ] Document removed from database
- [ ] Document not in file list
- [ ] S3 file deleted (if applicable)
- [ ] Cannot retrieve deleted document
- [ ] Verification tasks resolved

---

## Error Testing

### Test Invalid Arguments

**1. Missing Required Arguments**
```javascript
// Should fail
await uploadDocument({ aiKey: "test" }); 
// Expected: "Missing required arguments: aiKey, docId, and filePath are required"

await getApplicantDocuments({}); 
// Expected: "Missing required argument: aiKey"
```

**2. Non-existent File Upload**
```javascript
await uploadDocument({
  aiKey: "test",
  docId: "doc-1",
  filePath: "/fake/path/file.pdf"
});
// Expected: "File not found: /fake/path/file.pdf"
```

**3. Invalid Applicant Key**
```javascript
await getApplicantDocuments({ aiKey: "invalid-key-999" });
// Expected: HTTP 404 or "Applicant not found"
```

**4. Unauthorized Access (Applicant trying admin operation)**
```javascript
// Student token trying to verify
await verifyDocument({
  aiKey: "applicant-123",
  docId: "doc-1",
  fileId: "file-1"
});
// Expected: HTTP 403 Forbidden
```

---

## Complete Integration Test Flow

Test all tools in sequence:

```bash
# 1. Get applicant documents (should be empty or have old docs)
"Show all documents for applicant ABC-123"

# 2. Upload a new document
"Upload /tmp/test-passport.pdf for applicant ABC-123's passport requirement"

# 3. Verify document appears in list
"Show all documents for applicant ABC-123"
# Should see the new file

# 4. Get specific document URL
"Get the URL for the passport file for applicant ABC-123"

# 5. Rename the document
"Rename the passport document to 'passport-final.pdf' for applicant ABC-123"

# 6. Verify document (as admin)
"Verify the passport document for applicant ABC-123 as approved"

# 7. Check verification status
"Show all documents for applicant ABC-123"
# Should show verified: true

# 8. Delete document
"Delete the passport document for applicant ABC-123"

# 9. Verify deletion
"Show all documents for applicant ABC-123"
# Should not show the deleted file
```

---

## Logging and Debugging

### Check MCP Server Logs
```bash
# In mcp-server terminal, look for:
[DEBUG] Loaded tools: [..., uploadDocument, ...]
[INFO] Document uploaded successfully for applicant-123/passport-req
[ERROR] uploadDocument failed: File not found
```

### Check Backend Logs
```bash
# In backend terminal, look for:
📁 Fetching files for applicant ABC-123: 3 documents found
[required-docs:upload] { aiKey: 'ABC-123', docId: 'passport', ... }
```

### Enable Verbose Logging
In `mcp-server/tools/documentTools.js`, add:
```javascript
console.log("[uploadDocument] Args:", { aiKey, docId, filePath });
console.log("[uploadDocument] Response:", response.data);
```

---

## Quick Test Script

Save as `test-document-tools.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:4000"
TOKEN="YOUR_AUTH_TOKEN"
AI_KEY="YOUR_APPLICANT_KEY"
DOC_ID="YOUR_DOC_ID"

# Test 1: Get all documents
echo "Test 1: Getting all documents..."
curl -X GET "$BASE_URL/api/applicants/$AI_KEY/files" \
  -H "Authorization: Bearer $TOKEN"

# Test 2: Upload document
echo -e "\n\nTest 2: Uploading document..."
echo "Test content" > /tmp/test-doc.pdf
curl -X POST "$BASE_URL/api/applicants/$AI_KEY/required-documents/$DOC_ID/files" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-doc.pdf"

# Test 3: Get documents again (should see new file)
echo -e "\n\nTest 3: Getting all documents again..."
curl -X GET "$BASE_URL/api/applicants/$AI_KEY/files" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nAll tests completed!"
```

Run with:
```bash
chmod +x test-document-tools.sh
./test-document-tools.sh
```

---

## Success Criteria

All tools pass when:
- ✅ No errors in console logs
- ✅ All responses return `{ success: true }`
- ✅ File operations reflected in database
- ✅ S3 operations complete successfully
- ✅ Presigned URLs are valid and accessible
- ✅ Error handling works for invalid inputs
- ✅ Authentication/authorization enforced

---

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "File not found" | Wrong file path | Use absolute path to file |
| "Applicant not found" | Invalid aiKey | Check applicant record in DB |
| "401 Unauthorized" | Missing/invalid token | Verify authentication token |
| "403 Forbidden" | Insufficient permissions | Use admin token for verify |
| "Network error" | Backend not running | Start backend server |
| Tools not loaded | Tool syntax error | Run `node -c tools/documentTools.js` |

---

## Next Steps

After all tests pass:
1. Test with AI Assistant UI for real-world usage
2. Verify with multiple applicants
3. Test with large files (5MB+)
4. Test concurrent uploads
5. Monitor S3 storage usage
