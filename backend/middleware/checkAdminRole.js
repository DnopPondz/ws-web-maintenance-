import jwt from 'jsonwebtoken';

export function checkAdminRole(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ใช้ secret เดียวกับ backend
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admins only' });
    }

    req.user = decoded; // ส่งข้อมูลผู้ใช้ไปยัง endpoint ถัดไป
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
