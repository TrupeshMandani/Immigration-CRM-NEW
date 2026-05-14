require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // PostgreSQL (Drizzle ORM)
  DATABASE_URL: process.env.DATABASE_URL,

  // Multi-tenancy
  DEFAULT_FIRM_ID: process.env.DEFAULT_FIRM_ID || "",

  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

  // AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  S3_PRESIGNED_URL_EXPIRY: parseInt(process.env.S3_PRESIGNED_URL_EXPIRY) || 3600,

  // JWT — access tokens 15m, refresh tokens 7d
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_SECRET: process.env.JWT_SECRET, // legacy fallback for old tokens
  JWT_EXPIRY: process.env.JWT_EXPIRY || "7d",

  // AI providers
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

  // MCP agent server
  MCP_SERVER_URL: process.env.MCP_SERVER_URL || "http://localhost:3002/api/chat",

  // Email / SMTP
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.SMTP_USER,
  ADMIN_NOTIFICATIONS_EMAIL: process.env.ADMIN_NOTIFICATIONS_EMAIL || process.env.SMTP_USER,

  // Firebase
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_DYNAMIC_LINK_DOMAIN: process.env.FIREBASE_DYNAMIC_LINK_DOMAIN, // optional

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_CONNECT_CLIENT_ID: process.env.STRIPE_CONNECT_CLIENT_ID,

  APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:5173",
};
