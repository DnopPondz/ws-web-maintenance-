import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://localhost:27017';
const DEFAULT_DB_NAME = 'ws_maintenance';

const MONGO_URI = process.env.MONGO_URI || DEFAULT_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || DEFAULT_DB_NAME;

let cachedConnectionPromise = null;

export function getMongoDbName() {
  return MONGO_DB_NAME;
}

export async function connectMongo() {
  if (!cachedConnectionPromise) {
    cachedConnectionPromise = mongoose
      .connect(MONGO_URI, {
        dbName: MONGO_DB_NAME,
      })
      .then((connection) => {
        return connection;
      });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });
  }

  return cachedConnectionPromise;
}

export default connectMongo;
