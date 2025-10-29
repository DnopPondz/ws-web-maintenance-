import { getMongoose } from '../database/mongo.js';

const mongoose = await getMongoose();

const SUPPORTPAL_COLLECTION =
  process.env.MONGO_SUPPORTPAL_COLLECTION || 'supportpal_sites';

const defaultVersions = {
  nginx: '',
  php: '',
  mariadb: '',
  supportpal: '',
};

const supportpalSiteSchema = new mongoose.Schema(
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
    status: {
      type: String,
      default: 'healthy',
    },
    versions: {
      type: Map,
      of: String,
      default: () => ({ ...defaultVersions }),
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
    minimize: false,
    collection: SUPPORTPAL_COLLECTION,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        if (ret.lastChecked instanceof Date) {
          ret.lastChecked = ret.lastChecked.toISOString();
        }
        if (ret.versions instanceof Map) {
          ret.versions = Object.fromEntries(ret.versions.entries());
        }
        ret.versions = { ...defaultVersions, ...(ret.versions || {}) };
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
        if (ret.versions instanceof Map) {
          ret.versions = Object.fromEntries(ret.versions.entries());
        }
        ret.versions = { ...defaultVersions, ...(ret.versions || {}) };
        delete ret._id;
        return ret;
      },
    },
  }
);

supportpalSiteSchema.methods.getVersionsObject = function getVersionsObject() {
  const source = this.versions instanceof Map
    ? Object.fromEntries(this.versions.entries())
    : this.versions || {};

  return { ...defaultVersions, ...source };
};

const SupportpalSite =
  mongoose.models.SupportpalSite ||
  mongoose.model('SupportpalSite', supportpalSiteSchema, SUPPORTPAL_COLLECTION);

export default SupportpalSite;
