const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { recordAuditLog } = require('../utils/recordAuditLog');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const HIDDEN_USER_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL);
const isHiddenUserEmail = (email) => Boolean(HIDDEN_USER_EMAIL) && normalizeEmail(email) === HIDDEN_USER_EMAIL;
const ADMIN_DEFAULT_DEPARTMENT = 'All Departments';

const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');
const normalizeDepartment = (value) => (typeof value === 'string' ? value.trim() : '');
const withRoleDepartmentDefaults = (role, profile) => {
  const nextProfile = { ...(profile || {}) };
  const normalizedDepartment = normalizeDepartment(nextProfile.department);
  if (role === ROLES.ADMIN && !normalizedDepartment) {
    nextProfile.department = ADMIN_DEFAULT_DEPARTMENT;
  } else if (nextProfile.department !== undefined) {
    nextProfile.department = normalizedDepartment;
  }
  return nextProfile;
};

// Register (Public)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, department } = req.body;
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

    if (role === ROLES.ADMIN && requester?.role !== ROLES.ADMIN) {
      return res.status(403).json({ message: 'Cannot register as Admin' });
    }
    if (role !== undefined && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const parsedDepartment = normalizeDepartment(department);

    const newUser = new User({
      username,
      email,
      password,
      role: role || ROLES.INVENTORY_MANAGER
    });
    const departmentToPersist = parsedDepartment || (newUser.role === ROLES.ADMIN ? ADMIN_DEFAULT_DEPARTMENT : '');
    if (departmentToPersist) {
      newUser.profile = { ...(newUser.profile?.toObject?.() || newUser.profile || {}), department: departmentToPersist };
    }
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
          role: newUser.role,
          department: newUser.profile?.department || ''
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
    const user = await User.findOne({ email }).select('-profile.avatarImage.data');
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
        profile: sanitizeProfileForRole(user.role, user.profile)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

const sanitizeProfile = (profile) => {
  const raw = profile?.toObject?.() || profile || {};
  const { avatarImage, avatarUrl, ...rest } = raw;
  return {
    ...rest,
    avatarUpdatedAt: avatarImage?.updatedAt || null
  };
};

const sanitizeProfileForRole = (role, profile) => withRoleDepartmentDefaults(role, sanitizeProfile(profile));

const sanitizeUser = (user) => {
  const raw = user?.toObject?.() || user || {};
  const { password, profile, ...rest } = raw;
  return {
    ...rest,
    profile: sanitizeProfileForRole(rest.role, profile)
  };
};

// Get Current User (Protected)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -profile.avatarImage.data');
    res.json(sanitizeUser(user));
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
    const user = await User.findById(req.user.id).select('-password -profile.avatarImage.data');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: sanitizeProfileForRole(user.role, user.profile)
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
    user.profile = withRoleDepartmentDefaults(user.role, {
      ...(user.profile?.toObject?.() || user.profile || {}),
      ...incomingProfile
    });
    await user.save();

    const safeUser = await User.findById(user._id).select('-password -profile.avatarImage.data');

    await recordAuditLog({
      req,
      action: 'PROFILE_CREATE',
      entityType: 'User',
      entityId: user._id,
      details: { updates: { username: req.body?.username, ...incomingProfile } }
    });

    res.status(201).json(sanitizeUser(safeUser));
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
    user.profile = withRoleDepartmentDefaults(user.role, {
      ...(user.profile?.toObject?.() || user.profile || {}),
      ...incomingProfile
    });
    await user.save();

    const safeUser = await User.findById(user._id).select('-password -profile.avatarImage.data');

    await recordAuditLog({
      req,
      action: 'PROFILE_UPDATE',
      entityType: 'User',
      entityId: user._id,
      details: { updates: { username: req.body?.username, ...incomingProfile } }
    });

    res.json(sanitizeUser(safeUser));
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
    user.profile = withRoleDepartmentDefaults(user.role, { ...cleared, avatarImage: undefined });
    await user.save();

    const safeUser = await User.findById(user._id).select('-password -profile.avatarImage.data');

    await recordAuditLog({
      req,
      action: 'PROFILE_CLEAR',
      entityType: 'User',
      entityId: user._id,
      details: {}
    });

    res.json(sanitizeUser(safeUser));
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete profile data', error: error.message });
  }
});

router.put('/profile/avatar', authMiddleware, async (req, res) => {
  try {
    const { imageDataUrl } = req.body || {};
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return res.status(400).json({ message: 'imageDataUrl is required' });
    }

    const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    const contentType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const maxBytes = 300 * 1024;
    if (buffer.length > maxBytes) {
      return res.status(400).json({ message: 'Image too large (max 300KB)' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updatedAt = new Date();
    user.profile = user.profile || {};
    user.profile.avatarImage = {
      data: buffer,
      contentType,
      size: buffer.length,
      updatedAt
    };
    await user.save();

    await recordAuditLog({
      req,
      action: 'PROFILE_AVATAR_UPDATE',
      entityType: 'User',
      entityId: user._id,
      details: { size: buffer.length, contentType }
    });

    res.json({ avatarUpdatedAt: updatedAt });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile image', error: error.message });
  }
});

router.delete('/profile/avatar', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profile = user.profile || {};
    user.profile.avatarImage = undefined;
    await user.save();

    await recordAuditLog({
      req,
      action: 'PROFILE_AVATAR_DELETE',
      entityType: 'User',
      entityId: user._id,
      details: {}
    });

    res.json({ message: 'Profile image removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove profile image', error: error.message });
  }
});

router.get('/users/:id/avatar', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('email profile.avatarImage');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (isHiddenUserEmail(user.email)) {
      return res.status(404).json({ message: 'User not found' });
    }

    const avatar = user.profile?.avatarImage;
    if (!avatar?.data || !avatar?.contentType) {
      return res.status(404).json({ message: 'Profile image not found' });
    }

    const updatedAtMs = avatar.updatedAt ? new Date(avatar.updatedAt).getTime() : 0;
    const size = typeof avatar.size === 'number' ? avatar.size : avatar.data.length;
    const etag = `W/"${user._id}-${updatedAtMs}-${size}"`;

    if (req.headers['if-none-match'] === etag) {
      res.status(304);
      res.setHeader('ETag', etag);
      return res.end();
    }

    const requestedVersion = req.query?.v ? Number(req.query.v) : null;
    const isVersionedRequest = requestedVersion && updatedAtMs && requestedVersion === updatedAtMs;

    res.setHeader('Content-Type', avatar.contentType);
    res.setHeader('ETag', etag);
    res.setHeader(
      'Cache-Control',
      isVersionedRequest ? 'private, max-age=31536000, immutable' : 'private, max-age=0, must-revalidate'
    );
    res.setHeader('Content-Length', String(size));
    res.send(avatar.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile image', error: error.message });
  }
});

// Get All Users (Admin Only)
router.get('/users', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const usersQuery = HIDDEN_USER_EMAIL ? { email: { $ne: HIDDEN_USER_EMAIL } } : {};
    const users = await User.find(usersQuery).select('-password -profile.avatarImage.data');
    res.json(users.map((u) => sanitizeUser(u)));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Update User (Admin Only)
router.put('/users/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, password, department } = req.body || {};

    if (role !== undefined && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (isHiddenUserEmail(user.email)) {
      return res.status(403).json({ message: 'This user cannot be modified' });
    }

    const updates = {};
    const isDemotingAdmin = user.role === ROLES.ADMIN && role !== undefined && role !== ROLES.ADMIN;
    if (isDemotingAdmin) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot remove the last Admin' });
      }
    }

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

    if (department !== undefined) {
      const parsedDepartment = normalizeDepartment(department);
      updates.department = parsedDepartment;
      user.profile = { ...(user.profile?.toObject?.() || user.profile || {}), department: parsedDepartment };
    }

    const existingDepartment = normalizeDepartment(user.profile?.department);
    if (user.role === ROLES.ADMIN && !existingDepartment) {
      updates.department = ADMIN_DEFAULT_DEPARTMENT;
      user.profile = { ...(user.profile?.toObject?.() || user.profile || {}), department: ADMIN_DEFAULT_DEPARTMENT };
    }

    await user.save();
    const safeUser = await User.findById(id).select('-password -profile.avatarImage.data');

    await recordAuditLog({
      req,
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: id,
      details: { updates }
    });

    res.json(sanitizeUser(safeUser));
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

    const user = await User.findById(id).select('-password -profile.avatarImage.data');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (isHiddenUserEmail(user.email)) {
      return res.status(403).json({ message: 'This user cannot be deleted' });
    }

    if (user.role === ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last Admin' });
      }

      const password = String(req.body?.password || '');
      if (!password.trim()) {
        return res.status(400).json({ message: 'Password is required to delete an Admin user' });
      }

      const actor = await User.findById(req.user.id);
      if (!actor) return res.status(401).json({ message: 'Unauthorized' });
      const ok = await actor.comparePassword(password);
      if (!ok) {
        return res.status(400).json({ message: 'Invalid password' });
      }
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
