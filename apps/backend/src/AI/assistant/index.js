const axios = require("axios");

/**
 * Handles a natural language query by forwarding it to the MCP server.
 * @param {string} query - The user's question
 * @param {string} studentId - The ID of the student context (unused for now as MCP handles context)
 * @param {string} authHeader - The authorization header from the request
 * @param {object} res - The express response object
 * @returns {Promise<void>}
 */
async function handleAssistantQuery(query, studentId, authHeader, res) {
  try {
    const mcpUrl = process.env.MCP_SERVER_URL || "http://localhost:3002/api/chat";

    const response = await axios.post(
      mcpUrl,
      { message: query },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        responseType: "stream",
      }
    );

    response.data.pipe(res);

    return new Promise((resolve, reject) => {
      response.data.on("end", resolve);
      response.data.on("error", reject);
    });
  } catch (error) {
    console.error("Assistant Query Error:", error.message);
    if (error.response) {
        console.error("MCP Response Data:", error.response.data);
    }
    if (!res.headersSent) {
        res.write(JSON.stringify({ error: "I'm sorry, I encountered an error while communicating with the AI agent." }));
        res.end();
    }
  }
}

module.exports = { handleAssistantQuery };
