const { getEnv } = require("./env");

const BACKEND_URL = getEnv("BACKEND_URL", "http://localhost:5000/api");
const BACKEND_SERVICE_TOKEN = getEnv("BACKEND_SERVICE_TOKEN");

module.exports = {
  BACKEND_URL,
  BACKEND_SERVICE_TOKEN,
};
