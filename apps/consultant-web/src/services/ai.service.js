const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/**
 * Sends a message to the AI Assistant.
 * @param {string} message - The user's message
 * @param {string} studentId - Optional student ID for context
 * @returns {Promise<string>} - The AI's response
 */
/**
 * Sends a message to the AI Assistant and streams the response.
 * @param {string} message - The user's message
 * @param {string} studentId - Optional student ID for context
 * @param {function} onChunk - Callback for each chunk of text
 * @param {object} options - Optional callbacks (e.g., { onNotification })
 * @returns {Promise<void>}
 */
export const chatWithAI = async (
  message,
  studentId = null,
  onChunk,
  options = {}
) => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ message, studentId }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const notify =
      typeof options.onNotification === "function"
        ? options.onNotification
        : null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.token && typeof onChunk === "function") {
            onChunk(json.token);
          }
          if (json.notification && notify) {
            notify(json.notification);
          }
          if (json.error) {
            console.error("Stream error:", json.error);
          }
        } catch {
          // Ignore parse errors for partial chunks
        }
      }
    }
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw error;
  }
};

/**
 * Uploads a file to the temporary storage.
 * @param {File} file - The file object to upload
 * @returns {Promise<object>} - The uploaded file details { tempPath, originalName, mimetype }
 */
export const uploadTempFile = async (file) => {
  try {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/files/temp-upload`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("File upload failed");
    }

    const data = await response.json();
    return data.file;
  } catch (error) {
    console.error("Temp Upload Error:", error);
    throw error;
  }
};
