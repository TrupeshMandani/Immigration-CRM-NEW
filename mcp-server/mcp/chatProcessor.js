const OpenAI = require("openai");
const invokeTool = require("./toolInvoker");
const tools = require("../tools/_toolRegistry");
const { getEnv } = require("../config/env");
const logger = require("../config/logger");

const model = getEnv("OPENAI_MODEL", "gpt-4.1");

const getOpenAIClient = () => {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
};

const buildToolDefinitions = () => {
  return Object.entries(tools)
    .filter(([name, t]) => t && typeof t.run === "function")
    .map(([name, t]) => ({
      type: "function",
      function: {
        name,
        description: t.description || "",
        parameters: t.args || {
          type: "object",
          properties: {},
        },
      },
    }));
};

const parseContent = (content) => {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (content?.text) return content.text;
  return "";
};

const SYSTEM_PROMPT = `You are an Immigration CRM AI Assistant.

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
`;

const ATTACHMENT_REGEX =
  /\[System:\s*User attached file:\s*(.+?)\s*\(Path:\s*(.+?)\)\]/gi;

const extractAttachments = (text = "") => {
  const matches = [];
  let result;
  while ((result = ATTACHMENT_REGEX.exec(text)) !== null) {
    const [, rawName, rawPath] = result;
    matches.push({
      name: (rawName || "").trim(),
      path: (rawPath || "").trim().replace(/\)\]?$/, ""),
    });
  }
  return matches;
};

const buildAttachmentPolicyMessage = (attachments = []) => {
  if (!attachments.length) return "";
  const list = attachments
    .map(
      (file, index) =>
        `${index + 1}. ${file.name || "Unnamed file"} (Path: ${file.path})`
    )
    .join("\n");
  return `CRITICAL ATTACHMENT POLICY - YOU MUST FOLLOW THIS:
- The user has attached ${attachments.length} file(s) that MUST be uploaded using the 'uploadDocument' tool.
- YOU CANNOT RESPOND WITH TEXT ONLY - you MUST call tools.
- Step 1: If you don't know the student's aiKey, call 'searchStudents' with the student name from the user's message.
- Step 2: Extract the document type from the user's message (e.g., "Passport", "IELTS", "Resume").
- Step 3: Call 'uploadDocument' with:
  * aiKey: from search results or user message
  * documentType: the document type (e.g., "Passport")
  * filePath: the exact path from the attachment list below
- DO NOT write a response until 'uploadDocument' has been called.
- Provided files:
${list}
- Use the exact filePath shown above for each file.`;
};

const runMCPChat = async (userMessage) => {
  if (!userMessage) throw new Error("A user message is required.");

  const openai = getOpenAIClient();
  const toolDefs = buildToolDefinitions();
  const attachments = extractAttachments(userMessage);
  const requiresUpload = attachments.length > 0;
  const attachmentPolicy = buildAttachmentPolicyMessage(attachments);
  const baseMessages = [{ role: "system", content: SYSTEM_PROMPT }];
  if (attachmentPolicy) {
    baseMessages.push({ role: "system", content: attachmentPolicy });
  }
  baseMessages.push({ role: "user", content: userMessage });
  logger.info({
    scope: "mcp-processor",
    event: "start",
    model,
    messagePreview: userMessage.slice(0, 200),
    availableTools: toolDefs.length,
  });

  const notifications = [];
  const recordNotification = (toolName, result) => {
    if (
      result &&
      typeof result === "object" &&
      result.notification &&
      typeof result.notification.message === "string"
    ) {
      notifications.push({
        tool: toolName,
        type: result.notification.type || "info",
        message: result.notification.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const executeCompletion = async (messages, forceTool = null) => {
    const config = {
      model,
      messages,
      tools: toolDefs,
      tool_choice: forceTool || "auto",
    };
    return openai.chat.completions.create(config);
  };

  const didCallUpload = (assistantMessage) =>
    Array.isArray(assistantMessage?.tool_calls)
      ? assistantMessage.tool_calls.some(
          (call) => call.function?.name === "uploadDocument"
        )
      : false;

  try {
    // First attempt: allow search tools if needed
    let initial = await executeCompletion(baseMessages);
    let message = initial.choices[0].message;
    let hasUploadCall = didCallUpload(message);

    // If no tool calls at all and upload is required, force tool usage
    if (requiresUpload && (!message.tool_calls || message.tool_calls.length === 0)) {
      logger.info({
        scope: "mcp-processor",
        event: "retry-forced-tool",
        reason: "no-tool-calls-with-attachments",
      });
      // Force tool usage by requiring a function call
      const retryMessages = [
        ...baseMessages.slice(0, -1),
        {
          role: "system",
          content:
            "CRITICAL: You MUST call at least one tool. If you need the student's aiKey, call 'searchStudents' first. Then you MUST call 'uploadDocument' with the aiKey, documentType (e.g., 'Passport'), and filePath from the attachment. Do not respond with text only.",
        },
        baseMessages[baseMessages.length - 1],
      ];
      initial = await executeCompletion(retryMessages, "required");
      message = initial.choices[0].message;
      hasUploadCall = didCallUpload(message);
      
      if (!message.tool_calls || message.tool_calls.length === 0) {
        throw new Error(
          "Attached files detected, but the assistant did not call any tools."
        );
      }
    }

    // If upload is required but not called yet, allow one round of search tools
    if (requiresUpload && !hasUploadCall && message.tool_calls?.length > 0) {
      // Allow search tools to run first, then check again
      logger.info({
        scope: "mcp-processor",
        event: "allowing-search-tools",
        toolCalls: message.tool_calls.map((t) => t.function?.name),
      });
    } else if (requiresUpload && !hasUploadCall) {
      throw new Error(
        "Attached files detected, but uploadDocument was not invoked."
      );
    }

    // If no tools and no upload required, return text
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: parseContent(message.content), notifications };
    }

    // Handle tools
    const toolMessages = [];

    for (const call of message.tool_calls) {
      const toolName = call.function.name;
      const args = JSON.parse(call.function.arguments);
      logger.info({
        scope: "mcp-processor",
        event: "tool-call",
        toolName,
        argsPreview: args,
      });
      const result = await invokeTool(toolName, args);
      recordNotification(toolName, result);
      logger.info({
        scope: "mcp-processor",
        event: "tool-result",
        toolName,
        status: "ok",
      });

      toolMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    // SECOND COMPLETION
    const followUpMessages = [...baseMessages, message, ...toolMessages];
    let followUp;
    
    // If upload is still required but not done, force it in follow-up
    if (requiresUpload && !hasUploadCall) {
      logger.info({
        scope: "mcp-processor",
        event: "forcing-upload-in-followup",
      });
      followUpMessages.splice(1, 0, {
        role: "system",
        content:
          "URGENT: You have attached files that MUST be uploaded. Call 'uploadDocument' now with the aiKey (from previous search results), documentType (e.g., 'Passport'), and filePath. Do not respond with text until uploadDocument is called.",
      });
    }
    
    try {
      followUp = await executeCompletion(
        followUpMessages,
        requiresUpload && !hasUploadCall ? "required" : null
      );
    } catch (followUpError) {
      if (requiresUpload && !hasUploadCall) {
        // Last resort: force uploadDocument specifically
        logger.info({
          scope: "mcp-processor",
          event: "last-resort-upload-force",
        });
        const forceUploadMessages = [
          ...baseMessages,
          {
            role: "system",
            content:
              "You MUST call 'uploadDocument' immediately. Use the aiKey from search results, documentType from user request (e.g., 'Passport'), and filePath from attachments.",
          },
          message,
          ...toolMessages,
        ];
        followUp = await executeCompletion(forceUploadMessages, {
          type: "function",
          function: { name: "uploadDocument" },
        });
      } else {
        throw followUpError;
      }
    }

    const finalMessage = followUp.choices[0].message;
    
    // If follow-up has tool calls (including uploadDocument), execute them
    if (finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
      const followUpHasUpload = didCallUpload(finalMessage);
      if (requiresUpload && !hasUploadCall && !followUpHasUpload) {
        throw new Error(
          "Attached files require uploadDocument, but it was never invoked after multiple attempts."
        );
      }
      
      // Execute follow-up tool calls
      const followUpToolMessages = [];
      for (const call of finalMessage.tool_calls) {
        const toolName = call.function.name;
        const args = JSON.parse(call.function.arguments);
        logger.info({
          scope: "mcp-processor",
          event: "tool-call",
          toolName,
          argsPreview: args,
          phase: "followup",
        });
        const result = await invokeTool(toolName, args);
        recordNotification(toolName, result);
        logger.info({
          scope: "mcp-processor",
          event: "tool-result",
          toolName,
          status: "ok",
          phase: "followup",
        });
        followUpToolMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      
      // Get final response after tool execution
      const finalCompletion = await executeCompletion([
        ...followUpMessages,
        finalMessage,
        ...followUpToolMessages,
      ]);
      const parsed = parseContent(finalCompletion.choices[0].message.content);
      logger.info({
        scope: "mcp-processor",
        event: "complete",
        usedTools: toolMessages.length + followUpToolMessages.length,
        responsePreview: parsed.slice(0, 200),
      });
      return { reply: parsed, notifications };
    }
    
    // Final check: if upload was required but still not called, error
    if (requiresUpload && !hasUploadCall && !didCallUpload(finalMessage)) {
      throw new Error(
        "Attached files require uploadDocument, but the assistant responded with text instead."
      );
    }
    
    const parsed = parseContent(finalMessage.content);
    logger.info({
      scope: "mcp-processor",
      event: "complete",
      usedTools: toolMessages.length,
      responsePreview: parsed.slice(0, 200),
    });
    return { reply: parsed, notifications };
  } catch (err) {
    logger.error(`[Chat] FAILED: ${err.message}`);
    throw err;
  }
};

module.exports = { runMCPChat };
