const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Helper: build one user message with text + (optionally) images.
 */
function buildUserContent({ text, images = [] }) {
  const content = [];
  if (text && text.trim().length) {
    content.push({ type: "text", text });
  }
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: img },
    });
  }
  return content;
}

/**
 * Ask the model to produce STRICT JSON of important fields.
 * Uses OpenAI's JSON mode for reliability.
 */
async function extractImportantFields({ text, images = [], schemaDescription = "" }) {
  const system = `You are an expert immigration document analyst.
Your task is to extract key information from the provided document text and/or images.
Return a valid JSON object.
${schemaDescription ? `Follow this structure: ${schemaDescription}` : "Extract important fields like Name, DateOfBirth, PassportNumber, ExpiryDate, etc."}
- Do NOT include explanations.
- Use ISO dates (YYYY-MM-DD) where possible.
- If a field is missing or unclear, omit it or use null.`;

  const userContent = buildUserContent({ text, images });

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent extraction
    });

    const raw = response.choices[0].message.content;
    if (!raw) throw new Error("No content returned from OpenAI");
    
    return JSON.parse(raw);
  } catch (error) {
    console.error("AI Extraction Error:", error);
    // Return empty object or rethrow depending on strategy. 
    // For now, returning empty object to prevent crash, but logging error.
    return {}; 
  }
}

/**
 * Generic chat completion for the assistant
 */
async function chatWithAssistant({ messages, model = "gpt-4o-mini" }) {
    try {
        const response = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || model,
            messages: messages,
            temperature: 0.7,
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("AI Chat Error:", error);
        throw error;
    }
}

module.exports = { extractImportantFields, chatWithAssistant };
