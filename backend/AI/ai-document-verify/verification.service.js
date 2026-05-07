const fs = require("fs");
const OpenAI = require("openai");
const { extractTextFromFile } = require("../ai-file-extract/extract.service");
const { pdfToImages } = require("../ai-file-extract/pdf-to-images");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VERIFICATION_MODEL =
  process.env.OPENAI_VERIFICATION_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4o-mini";

const VALID_STATUSES = new Set(["pending", "verified", "failed"]);

const normalizeStatus = (status) => {
  if (!status) return "pending";
  const lower = String(status).toLowerCase();
  if (VALID_STATUSES.has(lower)) {
    return lower;
  }
  if (lower === "pass") return "verified";
  if (lower === "fail") return "failed";
  return "pending";
};

const baseResult = () => ({
  status: "pending",
  confidence: 0,
  detectedType: "",
  reason: "Waiting for AI verification",
  model: VERIFICATION_MODEL,
  checkedAt: new Date(),
});

const safeJsonParse = (raw) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end >= start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (_) {
        return {};
      }
    }
    return {};
  }
};

async function buildImagePayload(filePath, mimeType) {
  if (!mimeType) return [];
  if (mimeType === "application/pdf") {
    return pdfToImages(filePath);
  }
  if (mimeType.startsWith("image/")) {
    const base64 = fs.readFileSync(filePath).toString("base64");
    return [`data:${mimeType};base64,${base64}`];
  }
  return [];
}

async function verifyDocumentType({ expectedType, filePath, mimeType }) {
  if (!filePath) {
    throw new Error("File path is required for verification.");
  }

  const result = baseResult();
  result.expectedType = expectedType || "Document";

  if (!process.env.OPENAI_API_KEY) {
    result.reason = "OpenAI credentials missing; manual verification required.";
    return result;
  }

  try {
    const extractedText = await extractTextFromFile(filePath, mimeType);
    const trimmedText = (extractedText || "").trim().slice(0, 6000);
    const includeImages = !trimmedText || trimmedText.length < 200;
    const images = includeImages ? await buildImagePayload(filePath, mimeType) : [];

    const userContent = [
      {
        type: "text",
        text: `You must determine if the provided document is a "${expectedType}".
Respond with JSON: {"status":"verified|failed|pending","detectedType":"string","confidence":0-1,"reason":"string"}.
Mark as:
- "verified" only if you are sure it matches the expected type.
- "failed" if it clearly is a different document.
- "pending" if the content is unreadable, incomplete, or uncertain.`,
      },
    ];

    if (trimmedText) {
      userContent.push({
        type: "text",
        text: `Extracted text:\n${trimmedText}`,
      });
    }

    images.forEach((imageUrl) => {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
    });

    const response = await client.chat.completions.create({
      model: VERIFICATION_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an immigration compliance assistant who labels documents with high precision.",
        },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    const payload = safeJsonParse(response.choices?.[0]?.message?.content || "{}");
    result.status = normalizeStatus(payload.status);
    result.confidence = Number(payload.confidence) || 0;
    result.detectedType = payload.detectedType || "";
    result.reason =
      payload.reason ||
      (result.status === "verified"
        ? "AI verified document type."
        : "AI could not confirm the document.");
    result.checkedAt = new Date();

    return result;
  } catch (error) {
    console.error("AI verification failed:", error.message);
    result.reason = "AI verification unavailable. Manual review required.";
    return result;
  }
}

module.exports = { verifyDocumentType };
