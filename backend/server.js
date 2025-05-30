import express from 'express';
import authRoutes from './routes/auth.js';

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());
app.use('/api', authRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
