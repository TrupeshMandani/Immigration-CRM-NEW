const { sendToMCP } = require("../services/mcp.service");
const { runWithAuthContext } = require("../utils/authContext");
const logger = require("../config/logger");

const extractMessage = (body = {}) => {
  if (body && typeof body.message === "string") {
    return body.message.trim();
  }
  return "";
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const streamReply = async (req, res, reply = "", meta = {}) => {
  const text =
    typeof reply === "string" ? reply : JSON.stringify(reply ?? "No response");
  const notifications = Array.isArray(meta.notifications)
    ? meta.notifications
    : [];

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  logger.info({
    scope: "mcp-stream",
    event: "start",
    tokenCount: text.length,
  });

  for (const token of text) {
    if (aborted) {
      return;
    }
    res.write(`${JSON.stringify({ token })}\n`);
    res.flush?.();
    // small delay to mimic natural typing cadence
    // ensures front-end receives incremental chunks
    // without overwhelming the UI thread
    // eslint-disable-next-line no-await-in-loop
    await wait(4);
  }

  if (!aborted && notifications.length > 0) {
    notifications.forEach((notification) => {
      res.write(`${JSON.stringify({ notification })}\n`);
      res.flush?.();
    });
  }

  if (!aborted) {
    res.write(`${JSON.stringify({ done: true })}\n`);
    res.end();
    logger.info({
      scope: "mcp-stream",
      event: "complete",
      tokenCount: text.length,
    });
  }
};

const sendChatMessage = async (req, res) => {
  const message = extractMessage(req.body);
  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  try {
    const authHeader = req.headers.authorization || null;
    logger.info({
      scope: "mcp-chat",
      event: "incoming",
      hasAuth: Boolean(authHeader),
      messagePreview: message.slice(0, 160),
    });
    const { reply, notifications } = await runWithAuthContext(
      authHeader,
      () => sendToMCP(message)
    );
    logger.info({
      scope: "mcp-chat",
      event: "reply-received",
      length: typeof reply === "string" ? reply.length : null,
    });
    await streamReply(req, res, reply, { notifications });
    return undefined;
  } catch (error) {
    console.error("Chat error:", error);
    logger.error({
      scope: "mcp-chat",
      event: "error",
      message: error.message,
    });
    if (!res.headersSent) {
      return res.status(500).json({ error: "Chat processing failed" });
    }
    try {
      res.write(`${JSON.stringify({ error: "Chat processing failed" })}\n`);
      res.end();
    } catch (_) {
      /* ignore */
    }
    return undefined;
  }
};

module.exports = {
  sendChatMessage,
};
