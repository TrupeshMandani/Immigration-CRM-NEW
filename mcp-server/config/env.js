const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

const getEnv = (key, defaultValue = undefined) => {
  const value = process.env[key];
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  return value;
};

const env = Object.freeze({ ...process.env });

module.exports = {
  env,
  getEnv,
};
