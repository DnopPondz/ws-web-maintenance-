import { getMongoose } from '../database/mongo.js';

const mongoose = await getMongoose();

const USERS_COLLECTION = process.env.MONGO_USERS_COLLECTION || 'users';

const formatSequenceAsId = (sequence) => String(sequence).padStart(3, '0');

const userSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstname: {
      type: String,
      default: '',
    },
    lastname: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      default: 'user',
    },
    status: {
      type: String,
      default: 'active',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: USERS_COLLECTION,
    toJSON: {
      versionKey: false,
      transform: (_, ret) => {
        ret.id = formatSequenceAsId(ret.sequence);
        delete ret._id;
        delete ret.sequence;
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      versionKey: false,
      transform: (_, ret) => {
        ret.id = formatSequenceAsId(ret.sequence);
        delete ret._id;
        delete ret.sequence;
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.statics.formatId = formatSequenceAsId;

const User = mongoose.models.User || mongoose.model('User', userSchema, USERS_COLLECTION);

export default User;
