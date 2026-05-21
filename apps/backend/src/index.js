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

// Stripe webhook requires the raw request body for signature verification.
// express.raw() must be registered BEFORE express.json() consumes the stream.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));

// routes (we’ll add upload next)
app.use('/api', require('./routes'));

// health
app.get('/health', async (req, res) => {
  let postgresStatus = 'error';
  try {
    const { sql } = require('./db/postgres');
    await sql`SELECT 1`;
    postgresStatus = 'ok';
  } catch (_) {}

  let redisStatus = 'error';
  try {
    const IORedis = require('ioredis');
    const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true, connectTimeout: 2000 });
    await redis.ping();
    redis.disconnect();
    redisStatus = 'ok';
  } catch (_) {}

  res.json({ postgres: postgresStatus, redis: redisStatus, uptime: process.uptime() });
});

// global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});

// BullMQ workers — skipped in test environments (no live Redis needed).
// Pre-check Redis so a missing Redis instance degrades gracefully instead of crashing.
if (process.env.NODE_ENV !== 'test') {
  const IORedis = require('ioredis');
  const redisProbe = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    connectTimeout: 3000,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null, // don't retry the probe
  });
  redisProbe.connect()
    .then(() => {
      redisProbe.disconnect();
      const { startHashingWorker } = require('./modules/documents/documents.worker');
      startHashingWorker();
      const { startVerifyWorker } = require('./modules/ai/ai.worker');
      startVerifyWorker();
      console.log('[workers] Redis OK — document hashing + AI verify workers started');
    })
    .catch((err) => {
      console.warn('[workers] Redis unavailable — async workers disabled. Start Redis to enable AI verification and document hashing.', err.message);
    });
}


const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
