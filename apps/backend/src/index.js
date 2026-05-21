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

async function startupChecks() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│       Immigration CRM — Boot Check      │');
  console.log('└─────────────────────────────────────────┘\n');

  // ── Postgres ──────────────────────────────────────────────────────────────
  try {
    const { sql } = require('./db/postgres');
    await sql`SELECT 1`;
    console.log('  ✅  Postgres         connected  (port 5433)');
  } catch (err) {
    console.log('  ❌  Postgres         NOT connected —', err.message);
    console.log('      → Run: docker compose -f docker-compose.dev.yml up -d');
  }

  // ── Redis + Workers ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    const IORedis = require('ioredis');
    const redisProbe = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });

    try {
      await redisProbe.connect();
      redisProbe.disconnect();
      console.log('  ✅  Redis            connected  (port 6379)');

      const { startHashingWorker } = require('./modules/documents/documents.worker');
      startHashingWorker();
      console.log('  ✅  Worker           document hashing started');

      const { startVerifyWorker } = require('./modules/ai/ai.worker');
      startVerifyWorker();
      console.log('  ✅  Worker           AI verify started');
    } catch (err) {
      console.log('  ❌  Redis            NOT connected —', err.message);
      console.log('      → Run: docker compose -f docker-compose.dev.yml up -d');
      console.log('  ⚠️   Worker           document hashing DISABLED (no Redis)');
      console.log('  ⚠️   Worker           AI verify DISABLED (no Redis)');
    }
  }

  // ── Socket.IO ─────────────────────────────────────────────────────────────
  console.log('  ✅  Socket.IO        real-time events active');

  // ── API Routes ────────────────────────────────────────────────────────────
  console.log('  ✅  API Routes       /api/* mounted');

  console.log('\n─────────────────────────────────────────────');
  console.log(`  🚀  Server ready →  http://localhost:${PORT}`);
  console.log('─────────────────────────────────────────────\n');
}

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => startupChecks());
