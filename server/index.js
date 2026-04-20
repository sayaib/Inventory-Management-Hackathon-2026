const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { ensureAdminUser, ensureDummyInventory } = require('./initAdmin');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
