import express from 'express';

import { getMongoose } from '../database/mongo.js';
import { checkAdminRole } from '../middleware/checkAdminRole.js';
import WordpressSite from '../models/WordpressSite.js';

const mongoose = await getMongoose();

const router = express.Router();

const parseMaybeJson = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return fallback;
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

const normaliseString = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value).trim();
};

const normalisePluginList = (plugins = []) => {
  if (!Array.isArray(plugins)) {
    return [];
  }

  return plugins.map((plugin, index) => {
    const name = normaliseString(plugin?.name);
    const fallbackName = name || `Plugin ${index + 1}`;

    return {
      name: fallbackName,
      version: normaliseString(plugin?.version),
    };
  });
};

const formatNameAndVersion = (name, version) => {
  const normalisedName = normaliseString(name);
  const normalisedVersion = normaliseString(version);

  if (normalisedName && normalisedVersion) {
    return `${normalisedName} ${normalisedVersion}`;
  }

  if (normalisedVersion) {
    return normalisedVersion;
  }

  return normalisedName;
};

const buildSummaryFromDetails = (details = []) =>
  details
    .map(({ label, previous, current }) => {
      const prev = normaliseString(previous);
      const curr = normaliseString(current);

      if (!prev && !curr) {
        return label;
      }

      if (!prev) {
        return `${label} ${curr}`.trim();
      }

      if (!curr) {
        return `${label} ${prev}`.trim();
      }

      if (prev === curr) {
        return `${label} ${curr}`.trim();
      }

      return `${label} ${prev} → ${curr}`.trim();
    })
    .filter(Boolean)
    .join('; ');

const deriveWordpressChanges = (previousSite, nextSite) => {
  const details = [];

  const previousVersion = normaliseString(previousSite?.wordpressVersion);
  const nextVersion = normaliseString(
    nextSite?.wordpressVersion ?? previousSite?.wordpressVersion
  );

  if (previousVersion || nextVersion) {
    if (previousVersion !== nextVersion) {
      details.push({
        field: 'wordpressVersion',
        label: 'WordPress core',
        previous: previousVersion,
        current: nextVersion,
      });
    }
  }

  const previousTheme = previousSite?.theme || {};
  const nextTheme = nextSite?.theme ?? previousTheme;
  const previousThemeLabel = formatNameAndVersion(
    previousTheme?.name,
    previousTheme?.version
  );
  const nextThemeLabel = formatNameAndVersion(
    nextTheme?.name ?? previousTheme?.name,
    nextTheme?.version ?? previousTheme?.version
  );

  if (previousThemeLabel !== nextThemeLabel) {
    if (previousThemeLabel || nextThemeLabel) {
      details.push({
        field: 'theme',
        label: 'Theme',
        previous: previousThemeLabel,
        current: nextThemeLabel,
      });
    }
  }

  const previousPlugins = normalisePluginList(previousSite?.plugins);
  const nextPlugins = normalisePluginList(nextSite?.plugins);
  const previousPluginMap = new Map(
    previousPlugins.map((plugin) => [plugin.name, plugin])
  );
  const nextPluginMap = new Map(nextPlugins.map((plugin) => [plugin.name, plugin]));
  const pluginNames = new Set([
    ...Array.from(previousPluginMap.keys()),
    ...Array.from(nextPluginMap.keys()),
  ]);

  for (const name of pluginNames) {
    const previousPlugin = previousPluginMap.get(name);
    const nextPlugin = nextPluginMap.get(name);

    if (!previousPlugin && !nextPlugin) {
      continue;
    }

    if (!previousPlugin && nextPlugin) {
      if (nextPlugin.version) {
        details.push({
          field: `plugin:${name}`,
          label: `Plugin: ${name}`,
          previous: '',
          current: nextPlugin.version,
        });
      }
      continue;
    }

    if (previousPlugin && !nextPlugin) {
      // Skip removed plugins for now.
      continue;
    }

    const previousVersionValue = normaliseString(previousPlugin?.version);
    const nextVersionValue = normaliseString(
      nextPlugin?.version ?? previousPlugin?.version
    );

    if (previousVersionValue !== nextVersionValue) {
      details.push({
        field: `plugin:${name}`,
        label: `Plugin: ${name}`,
        previous: previousVersionValue,
        current: nextVersionValue,
      });
    }
  }

  return {
    details,
    summary: buildSummaryFromDetails(details),
  };
};

const prepareSitePayload = (payload, { fallbackLastChecked = true } = {}) => {
  const themeCandidate = parseMaybeJson(payload.theme, payload.theme);
  const pluginsCandidate = parseMaybeJson(payload.plugins, payload.plugins);

  const theme =
    themeCandidate && typeof themeCandidate === 'object' && !Array.isArray(themeCandidate)
      ? {
          name: themeCandidate?.name || '',
          version: themeCandidate?.version || '',
        }
      : {
          name: payload?.theme?.name || '',
          version: payload?.theme?.version || '',
        };

  const pluginsSource = Array.isArray(pluginsCandidate)
    ? pluginsCandidate
    : Array.isArray(payload?.plugins)
      ? payload.plugins
      : [];

  const plugins = pluginsSource.map((plugin) => ({
    name: plugin?.name || '',
    version: plugin?.version || '',
  }));

  const lastCheckedCandidate =
    payload.lastChecked ?? payload.last_checked ?? payload.last_checked_at ?? null;

  const parsedLastChecked = parseDateInput(lastCheckedCandidate);

  return {
    name: payload.name,
    url: payload.url,
    logo: payload.logo,
    wordpressVersion: payload.wordpressVersion ?? payload.wordpress_version ?? null,
    status: payload.status,
    theme,
    plugins,
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
    maintenanceNotes: plain.maintenanceNotes ?? '',
    plugins: Array.isArray(plain.plugins) ? plain.plugins : [],
    theme:
      plain.theme && typeof plain.theme === 'object'
        ? {
            name: plain.theme.name || '',
            version: plain.theme.version || '',
          }
        : { name: '', version: '' },
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
        theme: req.body.theme ?? { name: '', version: '' },
        plugins: Array.isArray(req.body.plugins) ? req.body.plugins : [],
      },
      { fallbackLastChecked: true }
    );

    const insertPayload = stripUndefined(sitePayload);

    const site = await WordpressSite.create(insertPayload);

    res.status(201).json({
      message: 'Site created successfully',
      data: [formatSiteResponse(site)],
    });
  } catch (err) {
    console.error('Insert error:', err);
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
});

router.get('/site', async (req, res) => {
  try {
    const sites = await WordpressSite.find().sort({ createdAt: 1 });

    res.status(200).json({ data: sites.map(formatSiteResponse) });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
});

router.put('/edit/:id', checkAdminRole, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid site id' });
  }

  try {
    const existingSite = await WordpressSite.findById(id);

    if (!existingSite) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const sitePayload = prepareSitePayload(
      {
        ...req.body,
      },
      { fallbackLastChecked: false }
    );

    const updatePayload = stripUndefined(sitePayload);

    const { details, summary } = deriveWordpressChanges(
      existingSite.toObject({ depopulate: true }),
      updatePayload
    );

    if (details.length > 0) {
      updatePayload.lastChangeDetails = details;
      updatePayload.lastChangeSummary = summary;
      updatePayload.lastChangeDetectedAt = new Date();
    }

    const site = await WordpressSite.findByIdAndUpdate(id, updatePayload, {
      new: true,
    });

    res.status(200).json({
      message: 'Site updated successfully',
      data: [formatSiteResponse(site)],
    });
  } catch (err) {
    console.error('Update error:', err);
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
    const site = await WordpressSite.findByIdAndDelete(id);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.status(200).json({
      message: `Site ID ${id} deleted successfully`,
      data: [formatSiteResponse(site)],
    });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
});

export default router;
