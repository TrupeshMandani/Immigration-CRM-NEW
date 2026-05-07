const axios = require("axios");
const { BACKEND_URL, BACKEND_SERVICE_TOKEN } = require("../config/backend");
const logger = require("../config/logger");
const { getAuthHeader } = require("./authContext");

const httpClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

httpClient.interceptors.request.use(
  (config) => {
    const authHeader = getAuthHeader() || (BACKEND_SERVICE_TOKEN ? `Bearer ${BACKEND_SERVICE_TOKEN}` : null);
    if (authHeader) {
      config.headers = config.headers || {};
      config.headers.Authorization = authHeader;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const getRequestLabel = (config = {}) => {
  const method = typeof config.method === "string" ? config.method.toUpperCase() : "UNKNOWN";
  const url = config.url || "unknown-url";
  return `${method} ${url}`;
};

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const label = getRequestLabel(error.config);
    logger.error(`[HTTP] ${label} -> ${error.message}`);
    return Promise.reject(error);
  }
);

module.exports = httpClient;
