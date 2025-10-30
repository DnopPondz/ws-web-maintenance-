import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';
const ALLOWED_ROLES = new Set(['admin', 'user']);
const ALLOWED_STATUSES = new Set(['active', 'suspended']);

const normalizeRole = (value) => {
  if (typeof value !== 'string') {
    return 'user';
  }

  const normalized = value.trim().toLowerCase();
  return ALLOWED_ROLES.has(normalized) ? normalized : 'user';
};

const normalizeStatus = (value) => {
  if (typeof value !== 'string') {
    return 'active';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'inactive') {
    return 'suspended';
  }

  return ALLOWED_STATUSES.has(normalized) ? normalized : 'active';
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        message: 'Invalid or expired token.',
        error: err.message,
      });
    }

    req.user = decoded;
    next();
  });
};

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  if (typeof user.toJSON === 'function') {
    return user.toJSON();
  }

  const { _id, password, sequence, ...rest } = user;
  return {
    ...rest,
    id: User.formatId(sequence),
  };
};

const toSequence = (id) => {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

// Register API
router.post('/register', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  const { username, email, password, firstname, lastname, role, status } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }

    const lastUser = await User.findOne().sort({ sequence: -1 }).lean();
    const nextSequence = (lastUser?.sequence || 0) + 1;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      sequence: nextSequence,
      username,
      email,
      password: hashedPassword,
      firstname: firstname || '',
      lastname: lastname || '',
      role: normalizeRole(role),
      status: normalizeStatus(status),
    });

    res.status(201).json({ message: 'User registered successfully', id: user.toJSON().id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

// edit user data
router.put('/edit', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  const { id, username, email, firstname, lastname, role, status, password } = req.body;

  const sequence = toSequence(id);
  if (!sequence) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const updatePayload = {};

  if (username !== undefined) {
    updatePayload.username = username;
  }

  if (email !== undefined) {
    updatePayload.email = email;
  }

  if (firstname !== undefined) {
    updatePayload.firstname = firstname;
  }

  if (lastname !== undefined) {
    updatePayload.lastname = lastname;
  }

  if (role !== undefined) {
    updatePayload.role = normalizeRole(role);
  }

  if (status !== undefined) {
    updatePayload.status = normalizeStatus(status);
  }

  if (password && typeof password === 'string' && password.trim()) {
    updatePayload.password = await bcrypt.hash(password, 10);
  }

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ message: 'No data provided to update.' });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { sequence },
      updatePayload,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
});

// Login API with JWT
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    if (normalizeStatus(user.status) !== 'active') {
      return res.status(403).json({ message: 'User account is suspended.' });
    }

    const userId = User.formatId(user.sequence);

    const tokenPayload = {
      id: userId,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '1h',
    });

    const refreshToken = jwt.sign(
      { id: userId, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: tokenPayload,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

// DELETE User
router.delete('/del/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ message: 'You do not have permission to delete this user.' });
  }

  const sequence = toSequence(id);
  if (!sequence) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  try {
    const deletedUser = await User.findOneAndDelete({ sequence });

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: `User ${id} deleted successfully.` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user.', error: err.message });
  }
});

// API endpoint for refreshing tokens
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required.' });
  }

  jwt.verify(refreshToken, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        message: 'Invalid or expired refresh token.',
      });
    }

    try {
      const sequence = toSequence(decoded.id);
      if (!sequence) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const user = await User.findOne({ sequence });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const tokenPayload = {
        id: User.formatId(user.sequence),
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
      };

      const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: '1h',
      });

      res.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        user: tokenPayload,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ message: 'Token refresh failed.' });
    }
  });
});

router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const users = await User.find({}, {
      sequence: 1,
      username: 1,
      firstname: 1,
      lastname: 1,
      email: 1,
      status: 1,
      role: 1,
    }).sort({ sequence: 1 });

    res.status(200).json({ users: users.map(sanitizeUser) });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    message: 'Logout successful. Please remove tokens from client storage.',
  });
});

export default router;
