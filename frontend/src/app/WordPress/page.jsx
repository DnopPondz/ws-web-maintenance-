"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import {
  fetchWordpressSites,
  createWordpressSite,
  updateWordpressSite,
  deleteWordpressSite,
} from "../lib/api";

let englishDateFormatter;

const getEnglishDateFormatter = () => {
  if (!englishDateFormatter) {
    englishDateFormatter = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    });
  }
  return englishDateFormatter;
};

const formatLastChecked = (value) => {
  if (!value) {
    return "-";
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return getEnglishDateFormatter().format(date);
  } catch (error) {
    return value;
  }
};

const parseJsonField = (value) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value) || typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  return null;
};

const cloneSites = (sites = []) =>
  sites.map((site) => ({
    ...site,
    id: site?.id != null ? String(site.id) : site?.id,
    theme: site.theme ? { ...site.theme } : { name: "", version: "" },
    plugins: Array.isArray(site.plugins)
      ? site.plugins.map((plugin) => ({ ...plugin }))
      : [],
  }));

const deriveSiteId = (site, index) => {
  const candidates = [site?.id, site?._id, site?.uuid];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return String(candidate);
    }
  }

  return String(index + 1);
};

const normaliseSites = (rawSites = []) =>
  rawSites.map((site, index) => {
    const parsedTheme = parseJsonField(site?.theme);
    const theme =
      parsedTheme && !Array.isArray(parsedTheme)
        ? {
            name: parsedTheme?.name || "N/A",
            version: parsedTheme?.version || "N/A",
          }
        : {
            name: site?.theme?.name || "N/A",
            version: site?.theme?.version || "N/A",
          };

    const parsedPlugins = parseJsonField(site?.plugins);
    const pluginsSource = Array.isArray(parsedPlugins)
      ? parsedPlugins
      : Array.isArray(site?.plugins)
        ? site.plugins
        : [];

    const formattedPlugins = pluginsSource.map((plugin, pluginIndex) => ({
      name: plugin?.name || `Plugin ${pluginIndex + 1}`,
      version: plugin?.version || "N/A",
    }));

    const lastChecked = site?.lastChecked || site?.last_checked || null;
    const maintenanceNotes =
      site?.maintenanceNotes ?? site?.maintenance_notes ?? "";

    const isConfirmedRaw =
      site?.isConfirmed ?? site?.is_confirmed ?? false;

    return {
      id: deriveSiteId(site, index),
      _id: site?._id ? String(site._id) : undefined,
      name: site?.name || "Unnamed Site",
      url: site?.url || "",
      logo: site?.logo || "https://via.placeholder.com/50",
      wordpressVersion:
        site?.wordpressVersion || site?.wordpress_version || "N/A",
      status: site?.status || "healthy",
      maintenanceNotes,
      theme,
      plugins: formattedPlugins,
      isConfirmed:
        typeof isConfirmedRaw === "string"
          ? isConfirmedRaw === "true" || isConfirmedRaw === "t"
          : Boolean(isConfirmedRaw),
      lastChecked,
    };
  });

const cloneSite = (site) => {
  if (!site) {
    return null;
  }

  return cloneSites([site])[0];
};

// NOTE: ปรับค่า WEEKLY_RESET_* เพื่อเปลี่ยนเวลาการรีเซ็ตสถานะเว็บไซต์ที่ยืนยันแล้ว
const WEEKLY_RESET_DAY = 1; // วันจันทร์ (0 = อาทิตย์, 1 = จันทร์, ...)
const WEEKLY_RESET_HOUR = 0; // ชั่วโมงที่ต้องการให้รีเซ็ต (24 ชั่วโมง)
const WEEKLY_RESET_MINUTE = 0; // นาทีที่ต้องการให้รีเซ็ต

const WpDashboard = () => {
  const [sites, setSites] = useState([]);
  const [expandedSites, setExpandedSites] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'edit', 'add', 'confirmed'
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasFetchedInitialSites, setHasFetchedInitialSites] = useState(false);
  const initialSitesRef = useRef([]);
  const sitesRef = useRef([]);
  const [siteMutations, setSiteMutations] = useState({});
  const [banner, setBanner] = useState(null);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [formStatus, setFormStatus] = useState({ type: null, message: "" });
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    site: null,
    isChecked: false,
    isDeleting: false,
    error: null,
  });
  const lastWeeklyResetKeyRef = useRef(null);

  const setSiteMutation = useCallback((siteId, patch) => {
    setSiteMutations((prev) => ({
      ...prev,
      [siteId]: {
        ...(prev[siteId] || {}),
        ...patch,
      },
    }));
  }, []);

  const showBanner = useCallback((message, type = 'info') => {
    setBanner({ message, type });
  }, []);

  const dismissBanner = useCallback(() => setBanner(null), []);

  const loadSites = useCallback(async ({ showLoader = true } = {}) => {
    const manageLoadingState = showLoader !== false;

    if (manageLoadingState) {
      setIsLoading(true);
    }

    setError(null);
    try {
      const apiSites = await fetchWordpressSites();
      const normalisedSites = normaliseSites(apiSites);
      initialSitesRef.current = cloneSites(normalisedSites);
      sitesRef.current = normalisedSites;
      setSites(normalisedSites);
      setHasFetchedInitialSites(true);
    } catch (err) {
      console.error('Failed to load WordPress sites:', err);
      const message = err?.message || '';
      const friendlyMessage = /collection|Mongo/i.test(message)
        ? `${message} Please verify the MongoDB configuration or create the missing collection`
        : message;
      setError(friendlyMessage || 'Unable to load website data');
      if (!initialSitesRef.current.length) {
        setSites([]);
      }
    } finally {
      if (manageLoadingState) {
        setIsLoading(false);
      }
    }
  }, []);

  const persistSite = useCallback(
    async (siteId, overrides = {}, options = {}) => {
      const { showLoader = false, skipReload = false, action = 'update' } = options;
      const targetSite = sitesRef.current.find((item) => item.id === siteId);

      if (!targetSite) {
        setSiteMutation(siteId, {
          status: 'error',
          error: 'The website to save could not be found',
          action,
        });
        return false;
      }

      const updateId = targetSite._id || siteId;

      if (!updateId) {
        setSiteMutation(siteId, {
          status: 'error',
          error: 'The website ID for the update was not found',
          action,
        });
        return false;
      }

      setSiteMutation(siteId, { status: 'saving', error: null, action });

      const payload = {
        ...targetSite,
        ...overrides,
      };

      try {
        await updateWordpressSite(updateId, payload);

        if (!skipReload) {
          await loadSites({ showLoader });
        }

        setSiteMutation(siteId, {
          status: 'success',
          error: null,
          timestamp: Date.now(),
          action,
        });

        return true;
      } catch (err) {
        console.error('Failed to persist WordPress site:', err);
        setSiteMutation(siteId, {
          status: 'error',
          error: err.message || 'Unable to save the website data',
          action,
        });

        if (!skipReload) {
          await loadSites({ showLoader });
        }

        throw err;
      }
    },
    [loadSites, setSiteMutation]
  );

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    sitesRef.current = sites;
  }, [sites]);


  const toggleSiteExpansion = (id) => {
    setExpandedSites(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };


  const openDeleteDialog = (site) => {
    setDeleteDialog({
      isOpen: true,
      site: cloneSite(site),
      isChecked: false,
      isDeleting: false,
      error: null,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      site: null,
      isChecked: false,
      isDeleting: false,
      error: null,
    });
  };

  const toggleDeleteConfirmation = () => {
    setDeleteDialog((prev) => ({
      ...prev,
      isChecked: !prev.isChecked,
      error: null,
    }));
  };

  const confirmDeleteSite = async () => {
    if (!deleteDialog.site?.id) {
      return;
    }

    const siteId = deleteDialog.site.id;
    const siteLabel = deleteDialog.site.name || 'Website';

    setDeleteDialog((prev) => ({
      ...prev,
      isDeleting: true,
      error: null,
    }));

    try {
      await deleteWordpressSite(siteId);

      setExpandedSites((prev) => {
        const next = { ...prev };
        delete next[siteId];
        return next;
      });

      setSiteMutations((prev) => {
        if (!prev || !prev[siteId]) {
          return prev;
        }
        const { [siteId]: _removed, ...rest } = prev;
        return rest;
      });

      await loadSites({ showLoader: false });

      showBanner(`Deleted website ${siteLabel} successfully`, 'success');
      closeDeleteDialog();
    } catch (err) {
      console.error('Failed to delete WordPress site:', err);
      setDeleteDialog((prev) => ({
        ...prev,
        isDeleting: false,
        error:
          err?.message || 'Unable to delete the website. Please try again.',
      }));
    }
  };

  

  const resetConfirmedSitesForNewWeek = useCallback(async () => {
    const confirmedSites = sitesRef.current.filter((site) => site.isConfirmed);

    if (!confirmedSites.length) {
      return;
    }

    try {
      for (const site of confirmedSites) {
        // ใช้ skipReload เพื่อให้โหลดข้อมูลใหม่เพียงครั้งเดียวหลังอัปเดตทั้งหมด
        await persistSite(
          site.id,
          { isConfirmed: false },
          { showLoader: false, skipReload: true, action: 'auto-reset' }
        );
      }

      await loadSites({ showLoader: false });
      showBanner('Reset confirmed websites for the new maintenance cycle successfully', 'info');
    } catch (error) {
      console.error('Failed to reset confirmed WordPress sites:', error);
      showBanner(error?.message || 'Unable to reset the website status', 'error');
    }
  }, [loadSites, persistSite, showBanner]);

  useEffect(() => {
    if (!hasFetchedInitialSites) {
      return;
    }

    const checkAndReset = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (
        dayOfWeek === WEEKLY_RESET_DAY &&
        hours === WEEKLY_RESET_HOUR &&
        minutes === WEEKLY_RESET_MINUTE
      ) {
        const resetKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

        if (lastWeeklyResetKeyRef.current !== resetKey) {
          lastWeeklyResetKeyRef.current = resetKey;
          resetConfirmedSitesForNewWeek();
        }
      } else {
        lastWeeklyResetKeyRef.current = null;
      }
    };

    const interval = setInterval(checkAndReset, 60000);
    checkAndReset();

    return () => clearInterval(interval);
  }, [hasFetchedInitialSites, resetConfirmedSitesForNewWeek]);

  

  const toggleDropdown = (id, type) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [`${id}-${type}`]: !prev[`${id}-${type}`],
    }));
  };

  const updateMaintenanceNotes = (id, notes) => {
    setSites((prev) => {
      const updatedSites = prev.map((site) =>
        site.id === id ? { ...site, maintenanceNotes: notes } : site
      );
      sitesRef.current = updatedSites;
      return updatedSites;
    });
    setSiteMutation(id, { status: 'dirty', error: null, action: 'notes' });
  };

  const confirmUpdate = (siteId) => {
    const confirmationTime = new Date().toISOString();

    persistSite(siteId, { isConfirmed: true, lastChecked: confirmationTime }, { showLoader: false, action: 'confirm' })
      .then(() => {
        showBanner('Update confirmed successfully!', 'success');
        setCurrentPage('confirmed');
      })
      .catch((err) => {
        showBanner(err.message || 'Unable to confirm the update', 'error');
      });
  };

  const handleSaveMaintenanceNotes = (siteId) => {
    const siteName = sitesRef.current.find((item) => item.id === siteId)?.name || 'Website';

    persistSite(siteId, {}, { showLoader: false, action: 'notes' })
      .then(() => {
        showBanner(`Saved notes for ${siteName} successfully`, 'success');
      })
      .catch((err) => {
        showBanner(
          err.message || `Unable to save notes for ${siteName}`,
          'error'
        );
      });
  };

  const goToAddPage = () => {
    setEditingSite(null);
    setFormData({
      name: '',
      url: '',
      logo: 'https://via.placeholder.com/50',
      wordpressVersion: '6.3',
      status: 'healthy',
      maintenanceNotes: '',
      theme: { name: '', version: '' },
      plugins: [],
      isConfirmed: false
    });
    setFormStatus({ type: null, message: "" });
    setCurrentPage('add');
  };

  const goToEditPage = (site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      url: site.url,
      logo: site.logo,
      wordpressVersion: site.wordpressVersion,
      status: site.status,
      maintenanceNotes: site.maintenanceNotes,
      theme: { ...site.theme },
      plugins: site.plugins.map(p => ({ ...p })),
      isConfirmed: site.isConfirmed
    });
    setFormStatus({ type: null, message: "" });
    setCurrentPage('edit');
  };

  const goBackToDashboard = () => {
    setCurrentPage('dashboard');
    setEditingSite(null);
    setFormData({});
    setFormStatus({ type: null, message: "" });
  };

  const goToConfirmedPage = () => {
    setCurrentPage('confirmed');
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleThemeChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value
      }
    }));
  };

  const handlePluginChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      plugins: prev.plugins.map((plugin, i) =>
        i === index ? { ...plugin, [field]: value } : plugin
      )
    }));
  };

  const addPlugin = () => {
    setFormData(prev => ({
      ...prev,
      plugins: [...prev.plugins, { name: "", version: "" }]
    }));
  };

  const removePlugin = (index) => {
    setFormData(prev => ({
      ...prev,
      plugins: prev.plugins.filter((_, i) => i !== index)
    }));
  };

  // ปรับปรุงการ validation ในฟังก์ชัน saveChanges
  const saveChanges = async () => {
    if (!formData.name || !formData.url) {
      setFormStatus({ type: 'error', message: 'Please enter the website name and URL' });
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      setFormStatus({ type: 'error', message: 'Please provide a valid URL (e.g. https://example.com)' });
      return;
    }

    const sanitisedTheme = {
      name: formData.theme?.name || '',
      version: formData.theme?.version || '',
    };

    const sanitisedPlugins = Array.isArray(formData.plugins)
      ? formData.plugins.map((plugin) => ({
          name: plugin?.name || '',
          version: plugin?.version || '',
        }))
      : [];

    const basePayload = {
      name: formData.name,
      url: formData.url,
      logo: formData.logo || 'https://via.placeholder.com/50',
      wordpressVersion: formData.wordpressVersion || '',
      status: formData.status || 'healthy',
      maintenanceNotes: formData.maintenanceNotes || '',
      theme: sanitisedTheme,
      plugins: sanitisedPlugins,
      isConfirmed: Boolean(formData.isConfirmed),
    };

    const siteLabel = formData.name || editingSite?.name || 'Website';

    setFormStatus({ type: null, message: '' });
    setIsSavingChanges(true);

    try {
      if (currentPage === 'add') {
        const payload = {
          ...basePayload,
          lastChecked: new Date().toISOString(),
        };

        await createWordpressSite(payload);
        await loadSites({ showLoader: false });
        showBanner(`Added website ${siteLabel} successfully`, 'success');
        goBackToDashboard();
      } else if (editingSite) {
        const payload = {
          ...basePayload,
          lastChecked: editingSite.lastChecked || null,
        };

        await updateWordpressSite(editingSite.id, payload);
        await loadSites({ showLoader: false });
        showBanner(`Saved changes for ${siteLabel} successfully`, 'success');
        goBackToDashboard();
      }
    } catch (err) {
      console.error('Failed to save WordPress site:', err);
      const message = err?.message || '';
      const friendlyMessage = /collection|Mongo/i.test(message)
        ? `${message} Please verify the MongoDB configuration or the collection permissions`
        : message;
      setFormStatus({
        type: 'error',
        message: friendlyMessage || 'Unable to save the data. Please try again.',
      });
    } finally {
      setIsSavingChanges(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const showInitialLoader = isLoading && !hasFetchedInitialSites;

  if (error && !hasFetchedInitialSites) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">An error occurred while fetching data</h1>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={loadSites}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (showInitialLoader) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center text-gray-600">
          Loading WordPress website data...
        </div>
      </div>
    );
  }

  // Filter sites based on search term
  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get sites for current page
  const getCurrentPageSites = () => {
    if (currentPage === 'confirmed') {
      return filteredSites.filter(site => site.isConfirmed);
    }
    return filteredSites.filter(site => !site.isConfirmed);
  };

  // Add/Edit Page Component
  if ((currentPage === 'edit' && editingSite) || currentPage === 'add') {
    const isEditing = currentPage === 'edit';
    const pageTitle = isEditing ? 'Edit website details' : 'Add new website';
    const pageIcon = isEditing ? '✏️' : '➕';
    const saveButtonText = isEditing ? '💾 Save changes' : '➕ Add website';
    
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">
                {pageIcon} {pageTitle}
              </h1>
              <button
                onClick={goBackToDashboard}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                ← Back to dashboard
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {formStatus.type && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  formStatus.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}
              >
                {formStatus.message}
              </div>
            )}
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name || ''}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.url || ''}
                  onChange={(e) => handleFormChange('url', e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.logo || ''}
                  onChange={(e) => handleFormChange('logo', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WordPress Version
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.wordpressVersion || ''}
                  onChange={(e) => handleFormChange('wordpressVersion', e.target.value)}
                />
              </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.status || ''}
                onChange={(e) => handleFormChange('status', e.target.value)}
              >
                <option value="healthy">Healthy (Normal)</option>
                <option value="warning">Warning (Alert)</option>
                <option value="error">Error (Issue)</option>
              </select>
            </div>

            {/* Theme Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🎨 Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.theme?.name || ''}
                    onChange={(e) => handleThemeChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.theme?.version || ''}
                    onChange={(e) => handleThemeChange('version', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Plugins */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">🔌 Plugins</h3>
                <button
                  onClick={addPlugin}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  + Add plugin
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.plugins?.map((plugin, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Plugin name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={plugin.name}
                        onChange={(e) => handlePluginChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="text"
                        placeholder="Version"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={plugin.version}
                        onChange={(e) => handlePluginChange(index, 'version', e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => removePlugin(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Notes */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Maintenance details
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                placeholder="Add details such as updating plugins, removing old files, improving performance, etc."
                value={formData.maintenanceNotes || ''}
                onChange={(e) => handleFormChange('maintenanceNotes', e.target.value)}
              />
            </div>

            {/* Save Buttons */}
            <div className="border-t pt-6 flex gap-3">
              <button
                type="button"
                onClick={saveChanges}
                disabled={isSavingChanges}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingChanges ? 'Saving...' : saveButtonText}
              </button>
              <button
                type="button"
                onClick={goBackToDashboard}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPageSites = getCurrentPageSites();
  const pageTitle = currentPage === 'confirmed' ? 'Confirmed websites' : 'WordPress Maintenance Dashboard';
  const pageIcon = currentPage === 'confirmed' ? '✅' : '🚀';

  // Dashboard and Confirmed Pages
  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center mb-6">
        {pageIcon} {pageTitle}
      </h1>

      {banner && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : banner.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <span>{banner.message}</span>
          <button
            type="button"
            onClick={dismissBanner}
            className="text-xs font-medium underline hover:opacity-80"
          >
            Close
          </button>
        </div>
      )}

      {hasFetchedInitialSites && isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-center text-sm">
          Refreshing the latest data...
        </div>
      )}

      {hasFetchedInitialSites && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          <div className="font-semibold mb-1">Unable to refresh the latest data</div>
          <p className="text-sm mb-3">{error}</p>
          <button
            onClick={loadSites}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              currentPage === 'dashboard' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🏠 Dashboard ({sites.filter(s => !s.isConfirmed).length})
          </button>
          <button
            onClick={goToConfirmedPage}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              currentPage === 'confirmed' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ✅ Confirmed ({sites.filter(s => s.isConfirmed).length})
          </button>
        </div>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search websites... (name or URL)"
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={loadSites}
            disabled={isLoading}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLoading
                ? 'bg-blue-100 text-blue-300 cursor-not-allowed'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            🔄 Refresh data
          </button>
          <div className="text-sm text-gray-600">
            {currentPageSites.length} websites | Click to view details
          </div>
          {currentPage === 'dashboard' && (
            <button
              onClick={goToAddPage}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
            >
              ➕ Add new website
            </button>
          )}
        </div>
      </div>

      {/* Sites List */}
      {currentPageSites.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">
            {searchTerm ? '🔍' : currentPage === 'confirmed' ? '✅' : '📭'}
          </div>
          <div className="text-xl font-medium text-gray-600 mb-2">
            {searchTerm 
              ? 'No websites match your search' 
              : currentPage === 'confirmed' 
                ? 'No confirmed websites yet' 
                : 'No websites in the system yet'
            }
          </div>
          <div className="text-gray-500">
            {searchTerm 
              ? 'Try a different search term or check the spelling' 
              : currentPage === 'confirmed' 
                ? 'Confirmed website updates will appear here' 
                : 'Start by adding the first website'
            }
          </div>
        </div>
      ) : (
        currentPageSites.map((site) => {
          const mutation = siteMutations[site.id] || {};
          const isSavingSite = mutation.status === 'saving';
          const isConfirmSaving = mutation.action === 'confirm' && isSavingSite;
          const isNotesSaving = mutation.action === 'notes' && isSavingSite;
          const saveError = mutation.status === 'error' ? mutation.error : null;
          const hasUnsavedChanges = mutation.status === 'dirty';
          const lastSavedLabel =
            mutation.action === 'notes' && mutation.status === 'success' && mutation.timestamp
              ? new Date(mutation.timestamp).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

          return (
            <div
              key={site.id}
              className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-xl"
            >
            {/* Header - Always Visible */}
            <div 
              className="p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => toggleSiteExpansion(site.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={site.logo}
                    alt={site.name}
                    className="w-12 h-12 object-cover rounded-lg border shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/50";
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-gray-800">
                        {site.name}
                      </div>
                      {site.isConfirmed && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200">
                          ✅ Confirmed
                        </span>
                      )}
                    </div>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {site.url}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(site.status)}`}>
                    {getStatusIcon(site.status)} {site.status.toUpperCase()}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>WP {site.wordpressVersion}</div>
                    <div>{formatLastChecked(site.lastChecked)}</div>
                  </div>
                  <div className="text-2xl text-gray-400 transition-transform duration-500 ease-in-out" 
                       style={{ transform: expandedSites[site.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              expandedSites[site.id] ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-4 border-t border-gray-200 bg-white">
                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                  {!site.isConfirmed && (
                    <button
                      type="button"
                      onClick={() => confirmUpdate(site.id)}
                      disabled={isConfirmSaving}
                      className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isConfirmSaving ? 'Confirming...' : '✅ Confirm update'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToEditPage(site);
                    }}
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(site);
                    }}
                    disabled={deleteDialog.isDeleting && deleteDialog.site?.id === site.id}
                    className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    🗑️ Delete website
                  </button>
                </div>

                {/* Theme and Plugins Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Theme Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown(site.id, "theme")}
                      className="w-full text-left bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                    >
                      <div className="font-medium text-gray-800">🎨 Theme</div>
                      <div className="text-sm text-gray-600">
                        {site.theme.name} (v{site.theme.version})
                      </div>
                    </button>
                    {openDropdowns[`${site.id}-theme`] && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-full p-3">
                        <div className="text-sm">
                          <div className="font-medium">{site.theme.name}</div>
                          <div className="text-gray-600">Version: {site.theme.version}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Plugin Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown(site.id, "plugins")}
                      className="w-full text-left bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                    >
                      <div className="font-medium text-gray-800">🔌 Plugins</div>
                      <div className="text-sm text-gray-600">
                        {site.plugins.length} plugins
                      </div>
                    </button>
                    {openDropdowns[`${site.id}-plugins`] && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 w-full">
                        <div className="p-3 space-y-2">
                          {site.plugins.map((plugin, i) => (
                            <div key={i} className="text-sm border-b border-gray-100 pb-2 last:border-b-0">
                              <div className="font-medium">{plugin.name}</div>
                              <div className="text-gray-600">v{plugin.version}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Maintenance Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 Maintenance details
                  </label>
                  <textarea
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all resize-none"
                    rows={3}
                    placeholder="Add details such as updating plugins, removing old files, improving performance, etc."
                    value={site.maintenanceNotes}
                    onChange={(e) => updateMaintenanceNotes(site.id, e.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveMaintenanceNotes(site.id)}
                      disabled={isNotesSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isNotesSaving ? 'Saving...' : '💾 Save notes'}
                    </button>
                    {hasUnsavedChanges && (
                      <span className="text-xs text-amber-600">There are unsaved changes</span>
                    )}
                    {saveError && (
                      <span className="text-xs text-red-600">{saveError}</span>
                    )}
                    {!hasUnsavedChanges && !saveError && lastSavedLabel && (
                      <span className="text-xs text-green-600">Last saved {lastSavedLabel}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          );
        })
      )}

      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!deleteDialog.isDeleting) {
                closeDeleteDialog();
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-5 bg-red-50 border-b border-red-100 flex items-start gap-3">
              <div className="text-3xl">🗑️</div>
              <div>
                <h2 className="text-xl font-semibold text-red-700 mb-1">Confirm website deletion</h2>
                <p className="text-sm text-red-600">
                  Deleting the website <span className="font-semibold">{deleteDialog.site?.name}</span> cannot be undone
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deleteDialog.isDeleting}
                className="ml-auto text-red-500 hover:text-red-700 disabled:opacity-50"
                aria-label="Close delete confirmation dialog"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700">
                URL: <a href={deleteDialog.site?.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{deleteDialog.site?.url}</a>
              </div>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded"
                  checked={deleteDialog.isChecked}
                  onChange={toggleDeleteConfirmation}
                  disabled={deleteDialog.isDeleting}
                />
                <span>
                  I understand and confirm that this website will be removed permanently from the system
                </span>
              </label>
              {deleteDialog.error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  {deleteDialog.error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deleteDialog.isDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSite}
                disabled={!deleteDialog.isChecked || deleteDialog.isDeleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleteDialog.isDeleting ? 'Deleting...' : 'Confirm deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WpDashboard;
