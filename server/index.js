const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { ensureAdminUser, ensureDummyInventory } = require('./initAdmin');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

const corsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));

// Basic Route
app.get('/', (req, res) => {
  res.send('Inventory Management API is running...');
});

// Import Routes
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const projectRoutes = require('./routes/projects');
const auditLogRoutes = require('./routes/auditLogs');
const predictionRoutes = require('./routes/predictions');
const settingsRoutes = require('./routes/settings');
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, req, res, next) => {
  const status = Number(err?.statusCode || err?.status || 500);
  const safeStatus = Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;
  const message = safeStatus >= 500 ? 'Internal server error' : String(err?.message || 'Request failed');
  res.status(safeStatus).json({ message });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    await ensureAdminUser();
    await ensureDummyInventory();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Server startup completed without an active MongoDB connection');
  });

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
