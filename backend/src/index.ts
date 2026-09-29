import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import statementsRoutes from './routes/statements.routes';
import transactionsRoutes from './routes/transactions.routes';
import dashboardRoutes from './routes/dashboard.routes';
import walletRoutes from './routes/wallet.routes';
import budgetRoutes from './routes/budget.routes';
import savingsRoutes from './routes/savings.routes';
import loansRoutes from './routes/loans.routes';
import reportsRoutes from './routes/reports.routes';
import rulesRoutes from './routes/rules.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS — supports multiple origins via comma-separated CORS_ORIGIN env var ─────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// ── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'FINOVA API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/statements', statementsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/rules', rulesRoutes);

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Start Server ─────────────────────────────────────────────────────────────
// Bind explicitly to 0.0.0.0 so Render (and other PaaS) can route external
// traffic to this process. Falls back gracefully when running locally.
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🚀 FINOVA API running on http://0.0.0.0:${PORT}`);
  console.log(`   Health:      http://0.0.0.0:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS origins: ${allowedOrigins.join(', ')}\n`);
});

export default app;
