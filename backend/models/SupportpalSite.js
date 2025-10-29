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

const changeDetailSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    previous: {
      type: String,
      default: '',
      trim: true,
    },
    current: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

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
    lastChangeSummary: {
      type: String,
      default: '',
      trim: true,
    },
    lastChangeDetails: {
      type: [changeDetailSchema],
      default: [],
    },
    lastChangeDetectedAt: {
      type: Date,
      default: null,
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
        if (ret.lastChangeDetectedAt instanceof Date) {
          ret.lastChangeDetectedAt = ret.lastChangeDetectedAt.toISOString();
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
        if (ret.lastChangeDetectedAt instanceof Date) {
          ret.lastChangeDetectedAt = ret.lastChangeDetectedAt.toISOString();
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
