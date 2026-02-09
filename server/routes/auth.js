import express from 'express';
import User from '../models/User.js';
import { createAuditLog } from '../middleware/index.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await createAuditLog(user.userId, 'LOGIN', `User ${user.name} logged in`);

    // Return user without password
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (userId) {
      await createAuditLog(userId, 'LOGOUT', 'User logged out');
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
