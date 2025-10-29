import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import authWp from './routes/authwp.js';
import connectMongo from './database/mongo.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use('/api', authRoutes);
app.use('/api/wp', authWp);

async function start() {
  try {
    await connectMongo();
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  } catch (error) {
    if (error?.code === 'MONGOOSE_NOT_INSTALLED') {
      console.error(error.message);
    } else {
      console.error('Failed to start server:', error);
    }
    process.exit(1);
  }
}

start();
