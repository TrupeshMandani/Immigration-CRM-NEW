require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/student_records",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

  // Remove Google Drive variables:
  // GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
  // GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  // DRIVE_PARENT_FOLDER_ID: process.env.DRIVE_PARENT_FOLDER_ID,

  // Add S3 variables:
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  S3_PRESIGNED_URL_EXPIRY:
    parseInt(process.env.S3_PRESIGNED_URL_EXPIRY) || 3600,

  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRY: process.env.JWT_EXPIRY || "7d",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.SMTP_USER,
  APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:5173",
  ADMIN_NOTIFICATIONS_EMAIL:
    process.env.ADMIN_NOTIFICATIONS_EMAIL || process.env.SMTP_USER,
};
