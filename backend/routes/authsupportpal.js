import express from 'express';

import { getMongoose } from '../database/mongo.js';
import { checkAdminRole } from '../middleware/checkAdminRole.js';
import SupportpalSite from '../models/SupportpalSite.js';

const mongoose = await getMongoose();

const router = express.Router();

const DEFAULT_VERSIONS = {
  nginx: '',
  php: '',
  mariadb: '',
  supportpal: '',
};

const parseMaybeJson = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return null;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value === 'true' || value === '1' || value === 't';
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return fallback;
};

const parseDateInput = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeVersions = (rawVersions) => {
  const candidate = parseMaybeJson(rawVersions) ?? rawVersions;
  const base = { ...DEFAULT_VERSIONS };

  if (candidate && typeof candidate === 'object') {
    for (const [key, value] of Object.entries(candidate)) {
      if (value === undefined || value === null) {
        continue;
      }
      base[key] = typeof value === 'string' ? value : String(value);
    }
  }

  return base;
};

const prepareSitePayload = (payload, { fallbackLastChecked = true } = {}) => {
  const versions = normalizeVersions(payload.versions);
  const lastCheckedCandidate =
    payload.lastChecked ?? payload.last_checked ?? payload.last_checked_at ?? null;

  const parsedLastChecked = parseDateInput(lastCheckedCandidate);

  return {
    name: payload.name,
    url: payload.url,
    logo: payload.logo,
    status: payload.status,
    versions,
    maintenanceNotes: payload.maintenanceNotes ?? payload.maintenance_notes ?? undefined,
    isConfirmed: toBoolean(payload.isConfirmed ?? payload.is_confirmed, false),
    lastChecked: parsedLastChecked ?? (fallbackLastChecked ? new Date() : undefined),
  };
};

const stripUndefined = (payload) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const formatSiteResponse = (site) => {
  if (!site) {
    return null;
  }

  const plain = typeof site.toJSON === 'function' ? site.toJSON() : site;

  return {
    ...plain,
    versions: { ...DEFAULT_VERSIONS, ...(plain.versions || {}) },
    maintenanceNotes: plain.maintenanceNotes ?? '',
    lastChecked: plain.lastChecked || null,
  };
};

router.post('/create', checkAdminRole, async (req, res) => {
  const { name, url } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Missing required fields: name or url' });
  }

  try {
    const sitePayload = prepareSitePayload(
      {
        ...req.body,
        versions: req.body.versions ?? DEFAULT_VERSIONS,
      },
      { fallbackLastChecked: true }
    );

    const insertPayload = stripUndefined(sitePayload);

    const site = await SupportpalSite.create(insertPayload);

    res.status(201).json({
      message: 'Site created successfully',
      data: [formatSiteResponse(site)],
    });
  } catch (err) {
    console.error('Insert SupportPal site error:', err);
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
});

router.get('/site', async (req, res) => {
  try {
    const sites = await SupportpalSite.find().sort({ createdAt: 1 });

    res.status(200).json({ data: sites.map(formatSiteResponse) });
  } catch (err) {
    console.error('Fetch SupportPal sites error:', err);
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
});

router.put('/edit/:id', checkAdminRole, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid site id' });
  }

  try {
    const sitePayload = prepareSitePayload(
      {
        ...req.body,
      },
      { fallbackLastChecked: false }
    );

    const updatePayload = stripUndefined(sitePayload);

    const site = await SupportpalSite.findByIdAndUpdate(id, updatePayload, { new: true });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.status(200).json({
      message: 'Site updated successfully',
      data: [formatSiteResponse(site)],
    });
  } catch (err) {
    console.error('Update SupportPal site error:', err);
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
});

router.delete('/del/:id', checkAdminRole, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid site id' });
  }

  try {
    const site = await SupportpalSite.findByIdAndDelete(id);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.status(200).json({
      message: `Site ID ${id} deleted successfully`,
      data: [formatSiteResponse(site)],
    });
  } catch (err) {
    console.error('Delete SupportPal site error:', err);
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
});

export default router;
