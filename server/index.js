/**
 * ============================================================
 * AI Powered Energy Consumption Optimizer — Express Server
 * ============================================================
 * Stack: Node.js + Express + MongoDB (Mongoose) + JWT Auth
 *
 * Routes:
 *   POST   /api/auth/register   → Register new user
 *   POST   /api/auth/login      → Login & get JWT
 *   GET    /api/energy/weather  → Real-time weather (OpenWeatherMap)
 *   GET    /api/energy/logs     → Last 7 days energy logs
 *   POST   /api/energy/logs     → Add/update today's log
 *   GET    /api/energy/dashboard→ Aggregated dashboard stats
 * ============================================================
 */

require('dotenv').config(); // Load .env variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const energyRoutes = require('./routes/energy');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow any localhost origin (handles port 5173, 5174, 5175, etc.)
    if (!origin || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json()); // Parse JSON request bodies

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);       // Authentication (login/register)
app.use('/api/energy', energyRoutes);   // Energy data & weather

// ── Root health check ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '⚡ Energy Optimizer API is running' });
});

// ── Connect to MongoDB & Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Handle port already in use — show a clear message instead of crashing
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   Fix: Open PowerShell and run:`);
        console.error(`   $processId = (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess; Stop-Process -Id $processId -Force`);
        console.error(`   Then run "npm start" again.\n`);
      } else {
        console.error('Server error:', err.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
