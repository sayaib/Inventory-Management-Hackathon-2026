const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { recordAuditLog } = require('../utils/recordAuditLog');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

// Register (Public)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    let requester = null;
    const bearer = req.header('Authorization')?.split(' ')[1];
    if (bearer) {
      try {
        requester = jwt.verify(bearer, JWT_SECRET);
      } catch (e) {
        requester = null;
      }
    }

    // Restrict registration of Admin role
    if (role === ROLES.ADMIN) {
      return res.status(403).json({ message: 'Cannot register as Admin' });
    }
    if (role !== undefined && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const newUser = new User({ 
      username, 
      email, 
      password, 
      role: role || ROLES.INVENTORY_MANAGER 
    });
    await newUser.save();

    const actor = requester
      ? { userId: requester.id, username: requester.username || '', email: requester.email || '', role: requester.role || '' }
      : { userId: newUser._id, username: newUser.username, email: newUser.email, role: newUser.role };

    await recordAuditLog({
      req,
      actor,
      action: requester ? 'USER_CREATE' : 'AUTH_REGISTER',
      entityType: 'User',
      entityId: newUser._id,
      details: {
        createdUser: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      }
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (!Object.values(ROLES).includes(user.role)) {
      return res.status(403).json({ message: 'Access denied. Role is disabled.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    await recordAuditLog({
      req,
      actor: { userId: user._id, username: user.username, email: user.email, role: user.role },
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: user._id,
      details: { email: user.email }
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile || {}
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Get Current User (Protected)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

const PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'department',
  'jobTitle',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'country',
  'avatarUrl',
  'bio'
];

const pickProfileFields = (body) => {
  const nextProfile = {};
  for (const key of PROFILE_FIELDS) {
    if (body[key] !== undefined) nextProfile[key] = body[key];
  }
  return nextProfile;
};

// Read Profile (Protected)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile || {}
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

// Create Profile (Protected)
router.post('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.body?.email !== undefined) {
      return res.status(400).json({ message: 'Email cannot be updated via profile' });
    }
    if (req.body?.role !== undefined) {
      return res.status(400).json({ message: 'Role cannot be updated via profile' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body?.username !== undefined) {
      const existing = await User.findOne({ username: req.body.username, _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ message: 'Username already in use' });
      user.username = req.body.username;
    }

    const incomingProfile = pickProfileFields(req.body || {});
    user.profile = { ...(user.profile?.toObject?.() || user.profile || {}), ...incomingProfile };
    await user.save();

    const safeUser = await User.findById(user._id).select('-password');

    await recordAuditLog({
      req,
      action: 'PROFILE_CREATE',
      entityType: 'User',
      entityId: user._id,
      details: { updates: { username: req.body?.username, ...incomingProfile } }
    });

    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create profile', error: error.message });
  }
});

// Update Profile (Protected)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.body?.email !== undefined) {
      return res.status(400).json({ message: 'Email cannot be updated via profile' });
    }
    if (req.body?.role !== undefined) {
      return res.status(400).json({ message: 'Role cannot be updated via profile' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body?.username !== undefined) {
      const existing = await User.findOne({ username: req.body.username, _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ message: 'Username already in use' });
      user.username = req.body.username;
    }

    const incomingProfile = pickProfileFields(req.body || {});
    user.profile = { ...(user.profile?.toObject?.() || user.profile || {}), ...incomingProfile };
    await user.save();

    const safeUser = await User.findById(user._id).select('-password');

    await recordAuditLog({
      req,
      action: 'PROFILE_UPDATE',
      entityType: 'User',
      entityId: user._id,
      details: { updates: { username: req.body?.username, ...incomingProfile } }
    });

    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// Delete Profile Data (Protected) - clears profile fields (keeps email, role, username)
router.delete('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cleared = {};
    for (const key of PROFILE_FIELDS) cleared[key] = '';
    user.profile = cleared;
    await user.save();

    const safeUser = await User.findById(user._id).select('-password');

    await recordAuditLog({
      req,
      action: 'PROFILE_CLEAR',
      entityType: 'User',
      entityId: user._id,
      details: {}
    });

    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete profile data', error: error.message });
  }
});

// Get All Users (Admin Only)
router.get('/users', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Update User (Admin Only)
router.put('/users/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, password } = req.body || {};

    if (role === ROLES.ADMIN) {
      return res.status(403).json({ message: 'Cannot assign Admin role' });
    }
    if (role !== undefined && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updates = {};

    if (username !== undefined) {
      const existing = await User.findOne({ username, _id: { $ne: id } });
      if (existing) return res.status(400).json({ message: 'Username already in use' });
      updates.username = username;
      user.username = username;
    }

    if (email !== undefined) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
      updates.email = email;
      user.email = email;
    }

    if (role !== undefined) {
      updates.role = role;
      user.role = role;
    }

    if (password !== undefined && String(password).trim().length > 0) {
      updates.passwordReset = true;
      user.password = password;
    }

    await user.save();
    const safeUser = await User.findById(id).select('-password');

    await recordAuditLog({
      req,
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: id,
      details: { updates }
    });

    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

// Delete User (Admin Only)
router.delete('/users/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.user?.id) === String(id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === ROLES.ADMIN) {
      return res.status(403).json({ message: 'Cannot delete Admin user' });
    }

    await User.deleteOne({ _id: id });

    await recordAuditLog({
      req,
      action: 'USER_DELETE',
      entityType: 'User',
      entityId: id,
      details: {
        deletedUser: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

module.exports = router;
