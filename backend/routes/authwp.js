import express from 'express';
import { supabase } from '../supabase/client.js';
import { checkAdminRole } from '../middleware/checkAdminRole.js'

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
    const { data, error } = await supabase.from('wordpress_sites').insert([
      {
        name,
        url,
        logo,
        wordpress_version: wordpressVersion,
        status,
        theme,
        plugins,
        maintenance_notes: maintenanceNotes,
        is_confirmed: isConfirmed,
        last_checked: lastChecked ?? new Date().toISOString()
      }
    ]);

    if (error) {
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
      .from('wordpress_sites')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
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
    const { data, error } = await supabase
      .from('wordpress_sites')
      .update({
        name,
        url,
        logo,
        wordpress_version: wordpressVersion,
        status,
        theme,
        plugins,
        maintenance_notes: maintenanceNotes,
        is_confirmed: isConfirmed,
        last_checked: lastChecked,
      })
      .eq('id', id)
      .select();

    if (error) {
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
      .from('wordpress_sites')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
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
