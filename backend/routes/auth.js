import express from 'express';
import bcrypt from 'bcrypt';
import { supabase } from '../supabase/client.js';

const router = express.Router();

// Regiater API 
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
// Register API 

// Login API
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
  
      // Login success
      res.status(200).json({
        message: 'Login successful',
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
  

// Login API

export default router;
