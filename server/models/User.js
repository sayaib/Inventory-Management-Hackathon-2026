const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { ROLES } = require('../constants/roles');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  profile: {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    department: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' }
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.INVENTORY_MANAGER
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
