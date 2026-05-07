const express = require("express");
const cors = require("cors");
const { getEnv } = require("./config/env");
const logger = require("./config/logger");
const chatRoutes = require("./routes/chat.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", chatRoutes);

const PORT = Number(getEnv("PORT", 3002));

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`MCP server listening on port ${PORT}`);
  });
}

module.exports = app;
