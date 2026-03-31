const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';

const initAdmin = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@osl.com';
    const adminPassword = 'Admin009@';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const admin = new User({
      username: 'admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing admin:', err);
    process.exit(1);
  }
};

initAdmin();
