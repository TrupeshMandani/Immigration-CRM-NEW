const { pdfToImages } = require("./pdf-to-images");
const { extractImportantFields } = require("../ai.service");
const { classifyDocument } = require("./document-classifier");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");

async function extractTextFromFile(filePath, mimeType) {
  if (mimeType === "application/pdf") {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text || "";
  }
  if (mimeType.includes("word") || filePath.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value || "";
  }
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

async function extractProfileWithAI(files) {
  console.log("🔍 extractProfileWithAI called with", files.length, "files");
  
  const results = [];

  for (const f of files) {
    let text = await extractTextFromFile(f.path, f.mimetype);
    let images = [];

    // If text is too short or it's a PDF/Image, try vision
    if (!text || text.trim().length < 50 || f.mimetype.startsWith("image/")) {
        if (f.mimetype === "application/pdf") {
            console.log("Vision mode: converting full PDF to images...");
            images = await pdfToImages(f.path);
        } else if (f.mimetype.startsWith("image/")) {
            const base64 = fs.readFileSync(f.path).toString("base64");
            images.push(`data:${f.mimetype};base64,${base64}`);
        }
    }

    // 1. Classify Document
    const docType = await classifyDocument({ text, images });
    console.log(`📄 Classified document as: ${docType}`);

    // 2. Define Schema based on Doc Type
    let schemaDescription = "";
    if (docType === "Passport") {
        schemaDescription = "{ Name, DateOfBirth, PassportNumber, ExpiryDate, Nationality, IssuingCountry }";
    } else if (docType === "Resume / CV") {
        schemaDescription = "{ FullName, Email, Phone, Skills: [], Experience: [{ Title, Company, StartDate, EndDate }], Education: [{ Degree, Institution, Year }] }";
    }

    // 3. Extract Data
    const data = await extractImportantFields({ text, images, schemaDescription });
    
    results.push({
        fileName: f.originalname || f.path,
        docType,
        data
    });
  }

  // Merge results into a single profile if needed, or return array
  // For now, we'll merge them into a single object for backward compatibility
  // but ideally we should return the structured array.
  // Let's merge for now to keep frontend happy.
  const mergedProfile = results.reduce((acc, curr) => ({ ...acc, ...curr.data }), {});
  
  // Add metadata about documents found
  mergedProfile.documentsFound = results.map(r => ({ type: r.docType, fileName: r.fileName }));

  console.log("🔍 Final merged profile:", mergedProfile);
  return mergedProfile;
}

module.exports = { extractProfileWithAI, extractTextFromFile };
