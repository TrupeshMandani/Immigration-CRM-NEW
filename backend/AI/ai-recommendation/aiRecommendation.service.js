const OpenAI = require("openai"); // npm i openai@^4

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

const FALLBACK_UNIVERSITIES = [
  {
    name: "Global Institute of Applied Sciences",
    country: "Canada",
    program: "Applied Sciences",
    degreeLevel: "Masters",
    eligibilityReason: "Strong academic profile and interest in applied sciences",
    tuitionFee: 24000,
    aiScore: 0.68,
    website: "https://www.studyincanada.com",
  },
  {
    name: "International School of Business & Technology",
    country: "United States",
    program: "Business & Technology Management",
    degreeLevel: "Masters",
    eligibilityReason: "Matches business and technology focus with available budget range",
    tuitionFee: 28500,
    aiScore: 0.65,
    website: "https://www.studyintheusa.com",
  },
  {
    name: "Metropolitan College of Innovation",
    country: "United Kingdom",
    program: "Innovation and Entrepreneurship",
    degreeLevel: "Diploma",
    eligibilityReason: "Suitable for students exploring entrepreneurial pathways",
    tuitionFee: 18000,
    aiScore: 0.62,
    website: "https://www.studyuk.britishcouncil.org",
  },
];

function buildFallbackUniversities(profile) {
  const country =
    profile.countryPreference || profile.country || profile.nationality || "Canada";
  const field =
    profile.fieldOfStudy || profile.program || profile.degree || profile.major || "International Studies";
  const degree = profile.degreeLevel || "Masters";

  return FALLBACK_UNIVERSITIES.map((item, index) => ({
    ...item,
    name: index === 0 ? `${country} Institute of ${field}` : item.name,
    country: index === 0 ? country : item.country,
    program: index === 0 ? `${field} ${degree}` : item.program,
    degreeLevel: degree,
    eligibilityReason:
      index === 0
        ? `Recommended based on your interest in ${field} and preference for ${country}.`
        : item.eligibilityReason,
  }));
}

/**
 * input: { englishScore, languageTestType, gpa, fieldOfStudy, degreeLevel, budget, countryPreference, workExpYears, backlogs, notes }
 * returns: { universities: [{ name, country, program, degreeLevel, eligibilityReason, tuitionFee, aiScore, website }], source: string }
 */
async function generateUniversityListFromProfile(profile) {
  if (!profile || Object.keys(profile).length === 0) {
    return { universities: [], source: "fallback" };
  }

  if (!client) {
    console.warn("⚠️ OPENAI_API_KEY not set. Returning fallback list.");
    return {
      universities: buildFallbackUniversities(profile),
      source: "fallback",
    };
  }

  // 🧠 Strict schema-enforced system prompt
  const systemPrompt = `
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
`;

  const userPrompt = `Student Profile JSON:\n${JSON.stringify(profile, null, 2)}\n
Constraints:
- Provide 5–10 university options.
- Higher aiScore for closer matches to GPA, IELTS/TOEFL/PTE, and budget.
- Include real universities where possible.
- TuitionFee is yearly (in CAD or equivalent).
- Keep explanations short and factual.`;

  // 🧩 Helper to call the model safely
  async function callOpenAI(messages) {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages,
        response_format: { type: "json_object" },
      });
      return completion.choices?.[0]?.message?.content || "{}";
    } catch (err) {
      console.error("❌ OpenAI call failed:", err);
      return "{}";
    }
  }

  let raw = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  let parsed = [];
  try {
    const maybe = JSON.parse(raw);

    // ✅ Only accept "universities" key; otherwise retry
    if (Array.isArray(maybe.universities)) {
      parsed = maybe.universities;
    } else {
      console.warn("⚠️ Model ignored schema. Retrying with explicit correction...");
      const retryPrompt = systemPrompt + `
Your previous response was invalid. 
You must return a JSON object containing only one key: "universities" (array). 
Retry now.`;

      raw = await callOpenAI([
        { role: "system", content: retryPrompt },
        { role: "user", content: userPrompt },
      ]);

      const retryParsed = JSON.parse(raw);
      parsed = Array.isArray(retryParsed.universities)
        ? retryParsed.universities
        : [];
    }
  } catch (err) {
    console.warn("⚠️ JSON parse failed, using fallback.", err);
    parsed = [];
  }

  if (!parsed.length) {
    console.warn("⚠️ AI returned an empty list, using fallback suggestions.");
    return {
      universities: buildFallbackUniversities(profile),
      source: "fallback",
    };
  }

  const normalized = parsed.map((x) => ({
    name: x.name || "",
    country: x.country || "",
    program: x.program || "",
    degreeLevel: x.degreeLevel || "",
    eligibilityReason: x.eligibilityReason || "",
    tuitionFee: Number.isFinite(x.tuitionFee) ? x.tuitionFee : null,
    aiScore:
      typeof x.aiScore === "number"
        ? Math.min(Math.max(x.aiScore, 0), 1)
        : 0,
    website: x.website || "",
  }));

  return { universities: normalized, source: "openai" };
}

module.exports = { generateUniversityListFromProfile };
