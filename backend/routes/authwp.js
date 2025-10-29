import express from 'express';
import { supabase } from '../supabase/client.js';
import { checkAdminRole } from '../middleware/checkAdminRole.js';

const WP_TABLE = process.env.SUPABASE_WP_TABLE || 'wordpress_sites';

const respondTableMissing = (res) =>
  res.status(500).json({
    error: `Supabase table "${WP_TABLE}" not found. Create it or set SUPABASE_WP_TABLE to the correct table name.`,
  });

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

const prepareSitePayload = (payload, { fallbackLastChecked = true } = {}) => {
  const themeCandidate = parseMaybeJson(payload.theme, payload.theme);
  const pluginsCandidate = parseMaybeJson(payload.plugins, payload.plugins);

  const theme =
    themeCandidate && typeof themeCandidate === 'object' && !Array.isArray(themeCandidate)
      ? themeCandidate
      : undefined;

  const plugins = Array.isArray(pluginsCandidate) ? pluginsCandidate : undefined;

  return {
    name: payload.name,
    url: payload.url,
    logo: payload.logo,
    wordpress_version: payload.wordpressVersion ?? payload.wordpress_version ?? null,
    status: payload.status,
    theme,
    plugins,
    maintenance_notes: payload.maintenanceNotes ?? payload.maintenance_notes ?? undefined,
    is_confirmed: toBoolean(payload.isConfirmed ?? payload.is_confirmed, false),
    last_checked:
      payload.lastChecked ??
      payload.last_checked ??
      (fallbackLastChecked ? new Date().toISOString() : undefined),
  };
};

const stripUndefined = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

const router = express.Router();

router.post('/create', checkAdminRole, async (req, res) => {
  const {
    name,
    url,
    logo,
    wordpressVersion,
    status,
    theme,
    plugins,
    maintenanceNotes,
    isConfirmed = false,
    lastChecked
  } = req.body;

  // Validate
  if (!name || !url) {
    return res.status(400).json({ error: "Missing required fields: name or url" });
  }

  try {
    const sitePayload = prepareSitePayload(
      {
        ...req.body,
        theme: theme ?? { name: '', version: '' },
        plugins: Array.isArray(plugins) ? plugins : [],
        isConfirmed,
        lastChecked,
      },
      { fallbackLastChecked: true }
    );

    const insertPayload = stripUndefined(sitePayload);

    const { data, error } = await supabase.from(WP_TABLE).insert([insertPayload]).select();

    if (error) {
      if (error.code === '42P01') {
        return respondTableMissing(res);
      }
      console.error("Insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Site updated successfully',
      data,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

router.get('/site', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(WP_TABLE)
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return respondTableMissing(res);
      }
      console.error("Fetch error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ data });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// EDIT WordPress site by ID
router.put('/edit/:id', checkAdminRole, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    url,
    logo,
    wordpressVersion,
    status,
    theme,
    plugins,
    maintenanceNotes,
    isConfirmed,
    lastChecked,
  } = req.body;

  try {
    const sitePayload = prepareSitePayload(
      {
        ...req.body,
        isConfirmed,
        lastChecked,
      },
      { fallbackLastChecked: false }
    );

    const updatePayload = stripUndefined(sitePayload);

    const { data, error } = await supabase
      .from(WP_TABLE)
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) {
      if (error.code === '42P01') {
        return respondTableMissing(res);
      }
      console.error("Update error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }

    res.status(200).json({
      message: 'Site updated successfully',
      data,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// DELETE WordPress site by ID
router.delete('/del/:id', checkAdminRole, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from(WP_TABLE)
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      if (error.code === '42P01') {
        return respondTableMissing(res);
      }
      console.error("Delete error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }

    res.status(200).json({
      message: `Site ID ${id} deleted successfully`,
      data,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
