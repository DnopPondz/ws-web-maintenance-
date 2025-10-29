import { getMongoose } from '../database/mongo.js';

const mongoose = await getMongoose();

const WP_COLLECTION = process.env.MONGO_WP_COLLECTION || 'wordpress_sites';

const pluginSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
    },
    version: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const wordpressSiteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    logo: {
      type: String,
      default: '',
    },
    wordpressVersion: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: 'healthy',
    },
    theme: {
      name: {
        type: String,
        default: '',
      },
      version: {
        type: String,
        default: '',
      },
    },
    plugins: {
      type: [pluginSchema],
      default: [],
    },
    maintenanceNotes: {
      type: String,
      default: '',
    },
    isConfirmed: {
      type: Boolean,
      default: false,
    },
    lastChecked: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: WP_COLLECTION,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        if (ret.lastChecked instanceof Date) {
          ret.lastChecked = ret.lastChecked.toISOString();
        }
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        if (ret.lastChecked instanceof Date) {
          ret.lastChecked = ret.lastChecked.toISOString();
        }
        delete ret._id;
        return ret;
      },
    },
  }
);

const WordpressSite =
  mongoose.models.WordpressSite ||
  mongoose.model('WordpressSite', wordpressSiteSchema, WP_COLLECTION);

export default WordpressSite;
