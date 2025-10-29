const DEFAULT_URI = 'mongodb://localhost:27017';
const DEFAULT_DB_NAME = 'ws_maintenance';

const MONGO_URI = process.env.MONGO_URI || DEFAULT_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || DEFAULT_DB_NAME;

let mongooseInstancePromise = null;
let cachedConnectionPromise = null;

function createMissingMongooseError(originalError) {
  const helpMessage =
    'Mongoose could not be loaded. Please run "npm install" inside the backend directory to install backend dependencies.';
  const error = new Error(helpMessage);
  error.cause = originalError;
  error.code = 'MONGOOSE_NOT_INSTALLED';
  return error;
}

export function getMongoDbName() {
  return MONGO_DB_NAME;
}

export async function getMongoose() {
  if (!mongooseInstancePromise) {
    mongooseInstancePromise = import('mongoose')
      .then((mod) => {
        const mongoose = mod.default ?? mod;
        if (!mongoose || typeof mongoose.connect !== 'function') {
          throw new Error('Invalid mongoose export.');
        }
        return mongoose;
      })
      .catch((error) => {
        throw createMissingMongooseError(error);
      });
  }

  return mongooseInstancePromise;
}

export async function connectMongo() {
  if (!cachedConnectionPromise) {
    cachedConnectionPromise = getMongoose().then((mongoose) => {
      const connectionPromise = mongoose.connect(MONGO_URI, {
        dbName: MONGO_DB_NAME,
      });

      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });

      return connectionPromise;
    });
  }

  return cachedConnectionPromise;
}

export default connectMongo;
