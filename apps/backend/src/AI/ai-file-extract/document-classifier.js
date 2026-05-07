const { chatWithAssistant } = require("../ai.service");

/**
 * Classifies the document type based on text content or image description.
 * @param {string} text - The text content of the document
 * @param {Array} images - Array of image URLs (base64)
 * @returns {Promise<string>} - The document type (e.g., "Passport", "Resume", "Application Form", "Unknown")
 */
async function classifyDocument({ text, images = [] }) {
  const system = `You are an expert document classifier for an immigration CRM.
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

Return ONLY the category name.`;

  const content = [];
  if (text && text.trim().length) {
    content.push({ type: "text", text: text.substring(0, 2000) }); // Send first 2000 chars for classification
  }
  // If images provided, send the first one for classification context
  if (images.length > 0) {
    content.push({
      type: "image_url",
      image_url: { url: images[0] },
    });
  }

  try {
    const response = await chatWithAssistant({
      messages: [
        { role: "system", content: system },
        { role: "user", content: content },
      ],
      model: "gpt-4o-mini",
    });
    return response.trim();
  } catch (error) {
    console.error("Document Classification Error:", error);
    return "Unknown";
  }
}

module.exports = { classifyDocument };
