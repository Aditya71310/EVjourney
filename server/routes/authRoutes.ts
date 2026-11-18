import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, signToken, type AuthRequest } from '../middleware/auth.ts';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  type PlainUser,
} from '../services/dataService.ts';

const router = Router();

function sanitizeUser(user: PlainUser) {
  const { password: _pw, ...safe } = user;
  return safe;
}

router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body || {};

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters long.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = String(username)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      return res
        .status(400)
        .json({ message: 'Username must contain at least 3 alphanumeric characters.' });
    }

    const existingEmail = await findUserByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const existingUsername = await findUserByUsername(cleanUsername);
    if (existingUsername) {
      return res.status(409).json({ message: 'This username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await createUser({
      name: String(name).trim(),
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      avatar: '',
      bio: '',
      city: '',
      country: '',
      coverScene: 'sunset',
      theme: 'dark',
      onboardingCompleted: false,
    });

    const token = signToken(user._id);
    return res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[Auth Register]', err);
    return res.status(500).json({ message: 'Unable to create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await findUserByEmail(String(email));
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[Auth Login]', err);
    return res.status(500).json({ message: 'Unable to sign in.' });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[Auth Me]', err);
    return res.status(500).json({ message: 'Failed to retrieve current user.' });
  }
});

export default router;
