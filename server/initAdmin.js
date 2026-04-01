const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const { ROLES } = require('./constants/roles');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';

const initAdmin = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@osl.com';
    const adminPassword = 'Admin009@';
    const salesHeadEmail = 'saleshead@osl.com';
    const salesHeadPassword = 'SalesHead009@';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new User({
        username: 'admin',
        email: adminEmail,
        password: adminPassword,
        role: ROLES.ADMIN
      });
      await admin.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    const existingSalesHead = await User.findOne({ email: salesHeadEmail });
    if (!existingSalesHead) {
      const salesHead = new User({
        username: 'saleshead',
        email: salesHeadEmail,
        password: salesHeadPassword,
        role: ROLES.SALES_HEAD
      });
      await salesHead.save();
      console.log('Sales Head user created successfully');
    } else {
      console.log('Sales Head user already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error initializing admin:', err);
    process.exit(1);
  }
};

initAdmin();
