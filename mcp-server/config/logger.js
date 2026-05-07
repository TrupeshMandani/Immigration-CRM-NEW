const fs = require("fs");
const path = require("path");

const logsDir = path.resolve(__dirname, "..", "logs");
const toolLogPath = path.join(logsDir, "tool-calls.log");
const errorLogPath = path.join(logsDir, "errors.log");

const ensureLogsDirectory = () => {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
};

const appendLog = (filePath, line) => {
  try {
    ensureLogsDirectory();
    fs.appendFileSync(filePath, `${line}\n`, "utf8");
  } catch (logError) {
    console.error("Failed to write log entry", logError);
  }
};

const appendToAllLogs = (line) => {
  appendLog(toolLogPath, line);
  appendLog(errorLogPath, line);
};

const formatLine = (level, message) => {
  const timestamp = new Date().toISOString();
  const payload = typeof message === "string" ? message : JSON.stringify(message);
  return `[${timestamp}] ${level.toUpperCase()} ${payload}`;
};

const info = (message) => {
  const line = formatLine("info", message);
  console.log(line);
  appendToAllLogs(line);
};

const error = (message) => {
  const line = formatLine("error", message);
  console.error(line);
  appendToAllLogs(line);
};

const toolCall = (toolName, args = {}) => {
  const serializedArgs = (() => {
    try {
      return JSON.stringify(args);
    } catch (serializationError) {
      return `Could not serialize args: ${serializationError.message}`;
    }
  })();
  const line = formatLine("tool", `${toolName} ${serializedArgs}`);
  console.log(line);
  appendToAllLogs(line);
};

module.exports = {
  info,
  error,
  toolCall,
};
