const mongoose = require('mongoose');
const dotenv = require('dotenv');

const User = require('./models/User');
const { ROLES } = require('./constants/roles');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';

const toBaseUsername = (email) => {
  const localPart = (email || '').split('@')[0] || 'admin';
  const sanitized = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return sanitized || 'admin';
};

const getAvailableUsername = async (baseUsername) => {
  let username = baseUsername;
  let suffix = 1;

  while (await User.exists({ username })) {
    username = `${baseUsername}${suffix}`;
    suffix += 1;
  }

  return username;
};

const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('Skipping admin initialization because ADMIN_EMAIL or ADMIN_PASSWORD is missing');
    return null;
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log(`Admin user already exists for ${adminEmail}`);
    return existingAdmin;
  }

  const baseUsername = process.env.ADMIN_USERNAME || toBaseUsername(adminEmail);
  const username = await getAvailableUsername(baseUsername);

  const admin = new User({
    username,
    email: adminEmail,
    password: adminPassword,
    role: ROLES.ADMIN
  });

  await admin.save();
  console.log(`Admin user created successfully for ${adminEmail}`);
  return admin;
};

const run = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    }

    await ensureAdminUser();
    process.exit(0);
  } catch (err) {
    console.error('Error initializing admin:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}

module.exports = { ensureAdminUser };
