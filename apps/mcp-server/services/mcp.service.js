const { runMCPChat } = require("../mcp/chatProcessor");
const logger = require("../config/logger");

const normalizeReply = (result) => {
  if (result === undefined || result === null) {
    return "I couldn’t generate a response.";
  }
  if (typeof result === "string") {
    return result;
  }
  if (typeof result === "object") {
    if (typeof result.reply === "string") {
      return result.reply;
    }
    if (typeof result.message === "string") {
      return result.message;
    }
    try {
      return JSON.stringify(result);
    } catch {
      return String(result);
    }
  }
  return String(result);
};

const formatMCPResponse = (result) => {
  if (result && typeof result === "object") {
    return {
      reply: typeof result.reply === "string" ? result.reply : normalizeReply(result),
      notifications: Array.isArray(result.notifications)
        ? result.notifications
        : [],
    };
  }
  return {
    reply: normalizeReply(result),
    notifications: [],
  };
};

const sendToMCP = async (message) => {
  try {
    logger.info({
      scope: "mcp-service",
      event: "forward",
      messagePreview: typeof message === "string" ? message.slice(0, 160) : "",
    });
    const response = await runMCPChat(message);
    const formatted = formatMCPResponse(response);
    logger.info({
      scope: "mcp-service",
      event: "response",
      notifications: formatted.notifications.length,
    });
    return formatted;
  } catch (error) {
    logger.error(`[MCP] Processing failed: ${error.message}`);
    throw new Error("MCP processing failed");
  }
};

module.exports = {
  sendToMCP,
};
