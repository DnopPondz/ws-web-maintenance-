const DEFAULT_URI = 'mongodb://localhost:27017/ws_maintenance';
const DEFAULT_DB_NAME = 'ws_maintenance';

let resolvedConfig = null;

function sanitizeMongoUri(rawUri) {
  if (!rawUri) {
    return DEFAULT_URI;
  }

  let trimmed = rawUri.trim();
  const prefix = 'MONGO_URI=';
  const upperPrefix = prefix.toUpperCase();

  while (trimmed.toUpperCase().startsWith(upperPrefix)) {
    trimmed = trimmed.slice(prefix.length).trimStart();
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function extractDbName(uri) {
  if (!uri) {
    return '';
  }

  const withoutParams = uri.split('?')[0];
  const pathMatch = withoutParams.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/(.+)$/i);

  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  return '';
}

function resolveMongoConfig() {
  if (!resolvedConfig) {
    const sanitizedUri = sanitizeMongoUri(process.env.MONGO_URI) || DEFAULT_URI;
    const envDbName = (process.env.MONGO_DB_NAME || '').trim();
    const dbNameFromUri = extractDbName(sanitizedUri);

    resolvedConfig = {
      uri: sanitizedUri,
      dbName: envDbName || dbNameFromUri || DEFAULT_DB_NAME,
    };
  }

  return resolvedConfig;
}

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
  return resolveMongoConfig().dbName;
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
      const { uri, dbName } = resolveMongoConfig();

      const connectionPromise = mongoose
        .connect(uri, {
          dbName,
        })
        .catch((error) => {
          if (error.name === 'MongooseServerSelectionError') {
            console.error(
              `Unable to connect to MongoDB using URI "${uri}". ` +
                'Ensure the database is running and the credentials are correct.'
            );
          } else if (error.name === 'MongoParseError') {
            console.error(
              `The configured MongoDB URI "${uri}" is invalid. ` +
                'Double-check that it starts with "mongodb://" or "mongodb+srv://".'
            );
          }
          throw error;
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
