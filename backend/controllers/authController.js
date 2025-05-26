import db from '../db/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function login(req, res) {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ส่ง token ผ่าน cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // เปลี่ยนเป็น true ถ้าใช้ HTTPS
      sameSite: 'Lax',
      maxAge: 3600000 // 1 ชั่วโมง
    });

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

export const register = async (req, res) => {
  const { email, password, role = 'user' } = req.body;

  try {
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [
      email,
      hashedPassword,
      role,
    ]);

    res.json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export function logout(req, res) {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
}
