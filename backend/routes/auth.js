import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; // เพิ่ม JWT
import { supabase } from '../supabase/client.js';

const router = express.Router();

// JWT Secret - ในการใช้งานจริงควรเก็บใน .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

// Register API
router.post('/register', async (req, res) => {
  const { username, password, firstname, lastname, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Check if username exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate ID (like '001', '002', etc.)
    const { data: users } = await supabase.from('users').select('id');
    const newId = String((users?.length || 0) + 1).padStart(3, '0');

    // Insert user
    const { error } = await supabase.from('users').insert([{
      id: newId,
      username,
      password: hashedPassword,
      firstname,
      lastname,
      role: role || 'user',
    }]);

    if (error) throw error;

    res.status(201).json({ message: 'User registered', id: newId });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

// Login API with JWT
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Fetch user by username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // สร้าง JWT Token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role
    };

    // สร้าง Access Token (หมดอายุใน 1 ชั่วโมง)
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { 
      expiresIn: '1h' 
    });

    // สร้าง Refresh Token (หมดอายุใน 7 วัน)
    const refreshToken = jwt.sign(
      { id: user.id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Login success with tokens
    res.status(200).json({
      message: 'Login successful',
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

// Middleware สำหรับตรวจสอบ JWT Token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        message: 'Invalid or expired token.',
        error: err.message 
      });
    }
    
    req.user = decoded; // เก็บข้อมูล user ใน request
    next();
  });
};

// API สำหรับ Refresh Token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required.' });
  }

  jwt.verify(refreshToken, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        message: 'Invalid or expired refresh token.' 
      });
    }

    try {
      // ดึงข้อมูล user ล่าสุดจากฐานข้อมูล
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // สร้าง Access Token ใหม่
      const tokenPayload = {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role
      };

      const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { 
        expiresIn: '1h' 
      });

      res.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        user: {
          id: user.id,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error.message);
      res.status(500).json({ message: 'Token refresh failed.' });
    }
  });
});

router.get('/users', authenticateToken, async (req, res) => {
  try {
    // ตรวจสอบเฉพาะ admin (เอาออกได้ถ้าไม่จำกัดสิทธิ์)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, firstname, lastname, email, status, role'); // เพิ่ม email

    if (error) throw error;

    res.status(200).json({ users });
  } catch (err) {
    console.error('Fetch users error:', err.message);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});




// API สำหรับ Logout (ทำลาย token ใน client-side)
router.post('/logout', authenticateToken, (req, res) => {
  // ใน JWT เราไม่สามารถทำลาย token ได้จริงๆ 
  // ต้องให้ client ลบ token ออกจาก storage
  res.json({
    message: 'Logout successful. Please remove tokens from client storage.'
  });
});

export default router;