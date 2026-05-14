require('dotenv').config();
const { tsReady } = require('./lib/typescript-canary');
console.log(tsReady('Immigration CRM'));
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { PORT } = require('./config/env');

const http = require('http');
const { initSocket } = require('./socket');

const app = express();

// middlewares
app.use(cors({ origin: process.env.APP_BASE_URL || 'http://localhost:5173', credentials: true }));
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// routes (we’ll add upload next)
app.use('/api', require('./routes'));

// health
app.get('/health', async (req, res) => {
  const start = process.uptime();

  // Mongo check
  let mongoStatus = 'error';
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      mongoStatus = 'ok';
    }
  } catch (_) {}

  // Postgres check
  let postgresStatus = 'error';
  try {
    const { sql } = require('./db/postgres');
    await sql`SELECT 1`;
    postgresStatus = 'ok';
  } catch (_) {}

  res.json({ mongo: mongoStatus, postgres: postgresStatus, uptime: process.uptime() });
});

// global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});

// MongoDb connection
const connectDB = require('./config/db');
connectDB();

// BullMQ workers — skipped in test environments (no live Redis needed).
if (process.env.NODE_ENV !== 'test') {
  const { startHashingWorker } = require('./modules/documents/documents.worker');
  startHashingWorker();

  const { startVerifyWorker } = require('./modules/ai/ai.worker');
  startVerifyWorker();
}


const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
