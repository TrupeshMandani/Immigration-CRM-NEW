const MCP_API_URL = "http://localhost:3002/api/chat";

export const mcpAPI = {
  streamMessage: async (message, { signal } = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(MCP_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
      signal,
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(errorPayload || "Chat request failed");
    }

    return response;
  },
};

export default mcpAPI;
