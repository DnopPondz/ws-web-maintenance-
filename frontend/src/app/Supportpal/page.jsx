"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import {
  fetchSupportpalSites,
  createSupportpalSite,
  updateSupportpalSite,
  deleteSupportpalSite,
} from "../lib/api";
import PageContainer from "../components/PageContainer";

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

const DEFAULT_VERSIONS = {
  nginx: "",
  php: "",
  mariadb: "",
  supportpal: "",
};

const parseVersions = (value) => {
  if (!value) {
    return { ...DEFAULT_VERSIONS };
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parseVersions(parsed);
    } catch (error) {
      return { ...DEFAULT_VERSIONS };
    }
  }

  if (value instanceof Map) {
    return parseVersions(Object.fromEntries(value.entries()));
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce(
      (acc, [key, rawValue]) => {
        if (rawValue === undefined || rawValue === null) {
          return acc;
        }
        acc[key] = typeof rawValue === "string" ? rawValue : String(rawValue);
        return acc;
      },
      { ...DEFAULT_VERSIONS }
    );
  }

  return { ...DEFAULT_VERSIONS };
};

const sanitiseVersions = (value) => parseVersions(value);

const cloneSites = (sites = []) =>
  sites.map((site) => ({
    ...site,
    id: site?.id != null ? String(site.id) : site?.id,
    versions: sanitiseVersions(site.versions),
  }));

const deriveSiteId = (site, index) => {
  const candidates = [site?.id, site?._id, site?.uuid];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return String(candidate);
    }
  }

  return String(index + 1);
};

const normaliseSites = (rawSites = []) =>
  rawSites.map((site, index) => {
    const versions = sanitiseVersions(site?.versions);
    const lastChecked = site?.lastChecked || site?.last_checked || null;
    const maintenanceNotes =
      site?.maintenanceNotes ?? site?.maintenance_notes ?? "";
    const isConfirmedRaw =
      site?.isConfirmed ?? site?.is_confirmed ?? false;

    return {
      id: deriveSiteId(site, index),
      _id: site?._id ? String(site._id) : undefined,
      name: site?.name || "Unnamed Server",
      url: site?.url || "",
      logo: site?.logo || "https://via.placeholder.com/50",
      status: site?.status || "healthy",
      versions,
      maintenanceNotes,
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

// NOTE: ปรับค่า MONTHLY_RESET_* เพื่อกำหนดเวลาการรีเซ็ตสถานะการยืนยันสำหรับ SupportPal
const MONTHLY_RESET_DAY = 1; // วันที่ต้องการรีเซ็ต (1 = วันที่ 1 ของเดือน)
const MONTHLY_RESET_HOUR = 0; // ชั่วโมงที่ต้องการให้รีเซ็ต (24 ชั่วโมง)
const MONTHLY_RESET_MINUTE = 0; // นาทีที่ต้องการให้รีเซ็ต

const SpDashboard = () => {
  const [sites, setSites] = useState([]);
  const [expandedSites, setExpandedSites] = useState({});
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
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
  const lastMonthlyResetKeyRef = useRef(null);

  const setSiteMutation = useCallback((siteId, patch) => {
    setSiteMutations((prev) => ({
      ...prev,
      [siteId]: {
        ...(prev[siteId] || {}),
        ...patch,
      },
    }));
  }, []);

  const showBanner = useCallback((message, type = "info") => {
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
      const apiSites = await fetchSupportpalSites();
      const normalisedSites = normaliseSites(apiSites);
      initialSitesRef.current = cloneSites(normalisedSites);
      sitesRef.current = normalisedSites;
      setSites(normalisedSites);
      setHasFetchedInitialSites(true);
    } catch (err) {
      console.error("Failed to load SupportPal sites:", err);
      const message = err?.message || "";
      const friendlyMessage = /collection|Mongo/i.test(message)
        ? `${message} Please verify the MongoDB configuration or create the SupportPal collection`
        : message;
      setError(friendlyMessage || "Unable to load server data");
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
      const { showLoader = false, skipReload = false, action = "update" } = options;
      const targetSite = sitesRef.current.find((item) => item.id === siteId);

      if (!targetSite) {
        setSiteMutation(siteId, {
          status: "error",
          error: "The server to save could not be found",
          action,
        });
        return false;
      }

      setSiteMutation(siteId, { status: "saving", error: null, action });

      const payload = {
        ...targetSite,
        ...overrides,
      };

      try {
        await updateSupportpalSite(siteId, payload);

        if (!skipReload) {
          await loadSites({ showLoader });
        }

        setSiteMutation(siteId, {
          status: "success",
          error: null,
          timestamp: Date.now(),
          action,
        });

        return true;
      } catch (err) {
        console.error("Failed to persist SupportPal site:", err);
        setSiteMutation(siteId, {
          status: "error",
          error: err.message || "Unable to save the server data",
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

  const resetToMainPage = useCallback(() => {
    setSites(cloneSites(initialSitesRef.current));
    setExpandedSites({});
    setCurrentPage("dashboard");
    setEditingSite(null);
    setFormData({});
    setSearchTerm("");
    setSiteMutations({});
    setFormStatus({ type: null, message: "" });
    setBanner(null);
    console.log("System reset completed - back to main page");
  }, []);

  useEffect(() => {
    if (!hasFetchedInitialSites) {
      return;
    }

    const checkAndReset = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (dayOfWeek === 1 && hours === 0 && minutes === 0) {
        resetToMainPage();
      }
    };

    const interval = setInterval(checkAndReset, 60000);

    return () => clearInterval(interval);
  }, [resetToMainPage, hasFetchedInitialSites]);

  const toggleSiteExpansion = (id) => {
    setExpandedSites((prev) => ({
      ...prev,
      [id]: !prev[id],
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

    if (!deleteDialog.isChecked) {
      setDeleteDialog((prev) => ({
        ...prev,
        error: "Please tick the checkbox to confirm the deletion",
      }));
      return;
    }

    setDeleteDialog((prev) => ({
      ...prev,
      isDeleting: true,
      error: null,
    }));

    try {
      await deleteSupportpalSite(deleteDialog.site.id);
      await loadSites({ showLoader: false });
      showBanner(`Deleted server ${deleteDialog.site.name} successfully`, "success");
      closeDeleteDialog();
    } catch (err) {
      console.error("Failed to delete SupportPal site:", err);
      setDeleteDialog((prev) => ({
        ...prev,
        isDeleting: false,
        error: err.message || "Unable to delete the server",
      }));
    }
  };

  const updateMaintenanceNotes = (id, notes) => {
    setSites((prev) => {
      const updatedSites = prev.map((site) =>
        site.id === id ? { ...site, maintenanceNotes: notes } : site
      );
      sitesRef.current = updatedSites;
      return updatedSites;
    });
    setSiteMutation(id, { status: "dirty", error: null, action: "notes" });
  };

  const confirmUpdate = (siteId) => {
    const confirmationTime = new Date().toISOString();

    persistSite(
      siteId,
      { isConfirmed: true, lastChecked: confirmationTime },
      { showLoader: false, action: "confirm" }
    )
      .then(() => {
        showBanner("Update confirmed successfully!", "success");
        setCurrentPage("confirmed");
      })
      .catch((err) => {
        showBanner(err.message || "Unable to confirm the update", "error");
      });
  };

  const handleSaveMaintenanceNotes = (siteId) => {
    const siteName =
      sitesRef.current.find((item) => item.id === siteId)?.name || "Server";

    persistSite(siteId, {}, { showLoader: false, action: "notes" })
      .then(() => {
        showBanner(`Saved notes for ${siteName} successfully`, "success");
      })
      .catch((err) => {
        showBanner(
          err.message || `Unable to save notes for ${siteName}`,
          "error"
        );
      });
  };

  const resetConfirmedSitesForNewMonth = useCallback(async () => {
    const confirmedSites = sitesRef.current.filter((site) => site.isConfirmed);

    if (!confirmedSites.length) {
      return;
    }

    try {
      for (const site of confirmedSites) {
        await persistSite(
          site.id,
          { isConfirmed: false },
          { showLoader: false, skipReload: true, action: "auto-reset" }
        );
      }

      await loadSites({ showLoader: false });
      showBanner(
        "Reset confirmed entries for the new monthly maintenance cycle",
        "info"
      );
    } catch (error) {
      console.error("Failed to reset confirmed SupportPal sites:", error);
      showBanner(error?.message || "Unable to reset the server status", "error");
    }
  }, [loadSites, persistSite, showBanner]);

  useEffect(() => {
    if (!hasFetchedInitialSites) {
      return;
    }

    const checkAndReset = () => {
      const now = new Date();
      const date = now.getDate();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (
        date === MONTHLY_RESET_DAY &&
        hours === MONTHLY_RESET_HOUR &&
        minutes === MONTHLY_RESET_MINUTE
      ) {
        const resetKey = `${now.getFullYear()}-${now.getMonth()}-${date}`;

        if (lastMonthlyResetKeyRef.current !== resetKey) {
          lastMonthlyResetKeyRef.current = resetKey;
          resetConfirmedSitesForNewMonth();
        }
      } else {
        lastMonthlyResetKeyRef.current = null;
      }
    };

    const interval = setInterval(checkAndReset, 60000);
    checkAndReset();

    return () => clearInterval(interval);
  }, [hasFetchedInitialSites, resetConfirmedSitesForNewMonth]);

  const goToAddPage = () => {
    setEditingSite(null);
    setFormData({
      name: "",
      url: "",
      logo: "https://via.placeholder.com/50",
      versions: { ...DEFAULT_VERSIONS },
      status: "healthy",
      maintenanceNotes: "",
      isConfirmed: false,
    });
    setFormStatus({ type: null, message: "" });
    setCurrentPage("add");
  };

  const goToEditPage = (site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      url: site.url,
      logo: site.logo,
      versions: { ...sanitiseVersions(site.versions) },
      status: site.status,
      maintenanceNotes: site.maintenanceNotes,
      isConfirmed: site.isConfirmed,
    });
    setFormStatus({ type: null, message: "" });
    setCurrentPage("edit");
  };

  const goBackToDashboard = () => {
    setCurrentPage("dashboard");
    setEditingSite(null);
    setFormData({});
    setFormStatus({ type: null, message: "" });
  };

  const goToConfirmedPage = () => {
    setCurrentPage("confirmed");
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVersionChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      versions: {
        ...prev.versions,
        [field]: value,
      },
    }));
  };

  const saveChanges = async () => {
    if (!formData.name || !formData.url) {
      setFormStatus({ type: "error", message: "Please enter the server name and URL" });
      return;
    }

    try {
      new URL(formData.url);
    } catch (error) {
      setFormStatus({
        type: "error",
        message: "Please provide a valid URL (e.g. https://support.example.com)",
      });
      return;
    }

    const sanitisedVersions = sanitiseVersions(formData.versions);

    const basePayload = {
      name: formData.name,
      url: formData.url,
      logo: formData.logo || "https://via.placeholder.com/50",
      status: formData.status || "healthy",
      versions: sanitisedVersions,
      maintenanceNotes: formData.maintenanceNotes || "",
      isConfirmed: Boolean(formData.isConfirmed),
    };

    const siteLabel = formData.name || editingSite?.name || "Server";

    setFormStatus({ type: null, message: "" });
    setIsSavingChanges(true);

    try {
      if (currentPage === "add") {
        const payload = {
          ...basePayload,
          lastChecked: new Date().toISOString(),
        };

        await createSupportpalSite(payload);
        await loadSites({ showLoader: false });
        showBanner(`Added server ${siteLabel} successfully`, "success");
        goBackToDashboard();
      } else if (editingSite) {
        const payload = {
          ...basePayload,
          lastChecked: editingSite.lastChecked || null,
        };

        await updateSupportpalSite(editingSite.id, payload);
        await loadSites({ showLoader: false });
        showBanner(`Saved changes for ${siteLabel} successfully`, "success");
        goBackToDashboard();
      }
    } catch (err) {
      console.error("Failed to save SupportPal site:", err);
      const message = err?.message || "";
      const friendlyMessage = /collection|Mongo/i.test(message)
        ? `${message} Please verify the MongoDB configuration or the collection permissions`
        : message;
      setFormStatus({
        type: "error",
        message:
          friendlyMessage || "Unable to save the data. Please try again.",
      });
    } finally {
      setIsSavingChanges(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "healthy":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "❓";
    }
  };

  const showInitialLoader = isLoading && !hasFetchedInitialSites;

  if (error && !hasFetchedInitialSites) {
    return (
      <PageContainer
        meta="SupportPal platform"
        title="Unable to load SupportPal servers"
        description="There was a problem reaching the SupportPal API. Refresh to retry the request."
        maxWidth="max-w-3xl"
      >
        <div className="rounded-3xl border border-red-200 bg-red-50/90 p-6 text-center text-red-700 shadow-sm">
          <h2 className="text-lg font-semibold">An error occurred while fetching data</h2>
          <p className="mt-3 text-sm leading-relaxed">{error}</p>
          <button
            onClick={loadSites}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </PageContainer>
    );
  }

  if (showInitialLoader) {
    return (
      <PageContainer
        meta="SupportPal platform"
        title="Loading SupportPal data"
        description="Fetching the latest server list so you can confirm updates."
        maxWidth="max-w-4xl"
      >
        <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-center text-slate-600 shadow-sm">
          Loading SupportPal server data...
        </div>
      </PageContainer>
    );
  }

  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentPageSites = () => {
    if (currentPage === "confirmed") {
      return filteredSites.filter((site) => site.isConfirmed);
    }
    return filteredSites.filter((site) => !site.isConfirmed);
  };

  if ((currentPage === "edit" && editingSite) || currentPage === "add") {
    const isEditing = currentPage === "edit";
    const pageTitle = isEditing ? "Edit server details" : "Add new server";
    const pageIcon = isEditing ? "✏️" : "➕";
    const saveButtonText = isEditing ? "💾 Save changes" : "➕ Add server";

    return (
      <PageContainer
        meta="SupportPal platform"
        title={`${pageIcon} ${pageTitle}`}
        description="Provide the latest SupportPal server details, including version updates and maintenance notes."
        maxWidth="max-w-4xl"
        actions={(
          <button
            onClick={goBackToDashboard}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[#316fb7] shadow-sm transition hover:bg-[#316fb7]/10"
          >
            ← Back to dashboard
          </button>
        )}
      >
        <div className="rounded-3xl border border-white/60 bg-white/80 shadow-lg overflow-hidden">
          <div className="bg-[#316fb7]/10 px-6 py-4 border-b border-[#316fb7]/20">
            <p className="text-sm font-medium text-[#244f8a]">
              Keep server records and monthly confirmations aligned.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {formStatus.type && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  formStatus.type === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                {formStatus.message}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name || ""}
                  onChange={(e) => handleFormChange("name", e.target.value)}
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
                  value={formData.url || ""}
                  onChange={(e) => handleFormChange("url", e.target.value)}
                  placeholder="https://support.example.com"
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
                  value={formData.logo || ""}
                  onChange={(e) => handleFormChange("logo", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.status || ""}
                  onChange={(e) => handleFormChange("status", e.target.value)}
                >
                  <option value="healthy">Healthy (Normal)</option>
                  <option value="warning">Warning (Alert)</option>
                  <option value="error">Error (Issue)</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🖥️ System versions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🌐 Nginx Version
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.versions?.nginx || ""}
                    onChange={(e) => handleVersionChange("nginx", e.target.value)}
                    placeholder="1.22.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🐘 PHP Version
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.versions?.php || ""}
                    onChange={(e) => handleVersionChange("php", e.target.value)}
                    placeholder="8.1.27"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🗄️ MariaDB Version
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.versions?.mariadb || ""}
                    onChange={(e) => handleVersionChange("mariadb", e.target.value)}
                    placeholder="10.11.6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎫 SupportPal Version
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.versions?.supportpal || ""}
                    onChange={(e) => handleVersionChange("supportpal", e.target.value)}
                    placeholder="3.3.2"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Maintenance details
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                placeholder="Add details such as updating SupportPal, improving the database, updating PHP/Nginx, clearing cache, etc."
                value={formData.maintenanceNotes || ""}
                onChange={(e) => handleFormChange("maintenanceNotes", e.target.value)}
              />
            </div>

            <div className="border-t pt-6 flex gap-3">
              <button
                onClick={saveChanges}
                disabled={isSavingChanges}
                className={`px-6 py-3 rounded-lg font-medium transition-colors text-white ${
                  isSavingChanges
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSavingChanges ? "Saving..." : saveButtonText}
              </button>
              <button
                onClick={goBackToDashboard}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  const currentPageSites = getCurrentPageSites();
  const pageTitle =
    currentPage === "confirmed" ? "Confirmed servers" : "SupportPal Maintenance Dashboard";
  const pageIcon = currentPage === "confirmed" ? "✅" : "🎫";
  const totalSites = sites.length;
  const confirmedCount = sites.filter((site) => site.isConfirmed).length;
  const pendingCount = Math.max(totalSites - confirmedCount, 0);

  return (
    <PageContainer
      meta="SupportPal platform"
      title={`${pageIcon} ${pageTitle}`}
      description="Manage SupportPal infrastructure with the same visual language as the rest of the suite. Confirm updates, document maintenance notes, and stay ready for the monthly reset."
      actions={(
        <>
          <div className="rounded-full bg-white/80 px-5 py-2 text-sm font-medium text-slate-600 shadow-sm">
            {totalSites} tracked • {confirmedCount} confirmed • {pendingCount} pending
          </div>
          <button
            onClick={() => loadSites({ showLoader: true })}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-[#316fb7] bg-white/80 px-5 py-2 text-sm font-semibold text-[#316fb7] shadow-sm transition hover:bg-[#316fb7]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Refreshing..." : "Refresh data"}
          </button>
          {currentPage === "dashboard" && (
            <button
              onClick={goToAddPage}
              className="inline-flex items-center gap-2 rounded-full bg-[#316fb7] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#244f8a]"
            >
              ➕ Add server
            </button>
          )}
        </>
      )}
      maxWidth="max-w-6xl"
    >
      {banner && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-700"
              : banner.type === "error"
                ? "border-red-200 bg-red-50/90 text-red-700"
                : "border-blue-200 bg-blue-50/90 text-[#245c94]"
          }`}
        >
          <span>{banner.message}</span>
          <button onClick={dismissBanner} className="text-xs font-semibold text-current underline hover:opacity-80">
            Close
          </button>
        </div>
      )}

      {error && hasFetchedInitialSites && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-5 text-sm text-red-700 shadow-sm">
          <div className="font-semibold">An error occurred while loading data</div>
          <p className="mt-2 leading-relaxed">{error}</p>
          <button
            onClick={() => loadSites({ showLoader: true })}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700"
          >
            Reload
          </button>
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-white/70 p-1 shadow-inner">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className={`px-5 py-2 text-sm font-semibold transition ${
              currentPage === "dashboard"
                ? "rounded-full bg-[#316fb7] text-white shadow"
                : "rounded-full text-slate-600 hover:text-[#244f8a]"
            }`}
          >
            🏠 Dashboard ({pendingCount})
          </button>
          <button
            onClick={goToConfirmedPage}
            className={`px-5 py-2 text-sm font-semibold transition ${
              currentPage === "confirmed"
                ? "rounded-full bg-emerald-500 text-white shadow"
                : "rounded-full text-slate-600 hover:text-[#244f8a]"
            }`}
          >
            ✅ Confirmed ({confirmedCount})
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <input
            type="text"
            placeholder="Search servers by name or URL"
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 pl-11 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#316fb7] focus:ring-2 focus:ring-[#316fb7]/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-lg">🔍</div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100/80 px-4 py-2">
            {currentPageSites.length} servers listed
          </span>
        </div>
      </div>

      {currentPageSites.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-sm">
          <div className="text-6xl mb-4">
            {searchTerm ? "🔍" : currentPage === "confirmed" ? "✅" : "🖥️"}
          </div>
          <div className="text-xl font-medium text-gray-600 mb-2">
            {searchTerm
              ? "No servers match your search"
              : currentPage === "confirmed"
                ? "No confirmed servers yet"
                : "No servers in the system yet"}
          </div>
          <div className="text-gray-500">
            {searchTerm
              ? "Try a different search term or check the spelling"
              : currentPage === "confirmed"
                ? "Confirmed server updates will appear here"
                : "Start by adding the first server"}
          </div>
        </div>
      ) : (
        currentPageSites.map((site) => {
          const mutation = siteMutations[site.id] || {};
          const isSavingSite = mutation.status === "saving";
          const isConfirmSaving = mutation.action === "confirm" && isSavingSite;
          const isNotesSaving = mutation.action === "notes" && isSavingSite;
          const saveError = mutation.status === "error" ? mutation.error : null;
          const hasUnsavedChanges = mutation.status === "dirty";
          const lastSavedLabel =
            mutation.action === "notes" && mutation.status === "success" && mutation.timestamp
              ? new Date(mutation.timestamp).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;

          return (
            <div
              key={site.id}
              className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-xl"
            >
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
                        <div className="text-lg font-semibold text-gray-800">{site.name}</div>
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
                      <div>SP {site.versions.supportpal || "-"}</div>
                      <div>{formatLastChecked(site.lastChecked)}</div>
                    </div>
                    <div
                      className="text-2xl text-gray-400 transition-transform duration-500 ease-in-out"
                      style={{ transform: expandedSites[site.id] ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  expandedSites[site.id] ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {!site.isConfirmed && (
                      <button
                        onClick={() => confirmUpdate(site.id)}
                        disabled={isConfirmSaving}
                        className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                          isConfirmSaving
                            ? "bg-green-300 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {isConfirmSaving ? "Confirming..." : "✅ Confirm update"}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToEditPage(site);
                      }}
                      className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(site);
                      }}
                      disabled={deleteDialog.isDeleting && deleteDialog.site?.id === site.id}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        deleteDialog.isDeleting && deleteDialog.site?.id === site.id
                          ? "bg-red-200 text-red-400 border-red-200 cursor-not-allowed"
                          : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      🗑️ Delete server
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">🌐 NGINX</div>
                      <div className="font-semibold text-gray-800">{site.versions.nginx || "-"}</div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">🐘 PHP</div>
                      <div className="font-semibold text-gray-800">{site.versions.php || "-"}</div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">🗄️ MariaDB</div>
                      <div className="font-semibold text-gray-800">{site.versions.mariadb || "-"}</div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">🎫 SupportPal</div>
                      <div className="font-semibold text-gray-800">{site.versions.supportpal || "-"}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      📝 Maintenance details
                    </label>
                    <textarea
                      className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all resize-none"
                      rows={3}
                      placeholder="Add details such as updating SupportPal, improving the database, updating PHP/Nginx, clearing cache, etc."
                      value={site.maintenanceNotes}
                      onChange={(e) => updateMaintenanceNotes(site.id, e.target.value)}
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSaveMaintenanceNotes(site.id)}
                        disabled={isNotesSaving || !hasUnsavedChanges}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isNotesSaving
                            ? "bg-blue-200 text-blue-500 cursor-not-allowed"
                            : hasUnsavedChanges
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-blue-100 text-blue-400 cursor-not-allowed"
                        }`}
                      >
                        {isNotesSaving
                          ? "Saving..."
                          : hasUnsavedChanges
                            ? "💾 Save notes"
                            : "✓ Saved"}
                      </button>
                      {lastSavedLabel && (
                        <span className="text-xs text-gray-500">
                          Last saved {lastSavedLabel}
                        </span>
                      )}
                      {saveError && (
                        <span className="text-xs text-red-600">{saveError}</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Confirm server deletion</h2>
            <p className="text-gray-600">
              You are about to delete <span className="font-medium">{deleteDialog.site?.name}</span>. This action cannot be undone.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
              <div><strong>URL:</strong> {deleteDialog.site?.url}</div>
              <div><strong>Status:</strong> {deleteDialog.site?.status?.toUpperCase()}</div>
              <div><strong>SupportPal:</strong> {deleteDialog.site?.versions?.supportpal || "-"}</div>
            </div>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={deleteDialog.isChecked}
                onChange={toggleDeleteConfirmation}
                className="mt-1"
              />
              <span>I understand that deleting this server will remove all of its data from the system.</span>
            </label>
            {deleteDialog.error && (
              <div className="text-sm text-red-600">{deleteDialog.error}</div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteDialog}
                disabled={deleteDialog.isDeleting}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSite}
                disabled={deleteDialog.isDeleting}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  deleteDialog.isDeleting
                    ? "bg-red-300 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {deleteDialog.isDeleting ? "Deleting..." : "Confirm deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpDashboard;
