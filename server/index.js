const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

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
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/projects', projectRoutes);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Continuing without MongoDB for demo purposes (using in-memory store if needed)');
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
