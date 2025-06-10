// backend/index.js
import express from 'express';
import authRoutes from './routes/auth.js';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000', // ✅ Frontend origin
  credentials: true
}));

app.use(express.json());
app.use('/api', authRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});