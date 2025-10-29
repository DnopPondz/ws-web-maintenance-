"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import {
  fetchSupportpalSites,
  createSupportpalSite,
  updateSupportpalSite,
  deleteSupportpalSite,
} from "../lib/api";

let thaiDateFormatter;

const getThaiDateFormatter = () => {
  if (!thaiDateFormatter) {
    thaiDateFormatter = new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    });
  }
  return thaiDateFormatter;
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

    return getThaiDateFormatter().format(date);
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
        ? `${message} ตรวจสอบการตั้งค่า MongoDB หรือสร้าง collection สำหรับ SupportPal`
        : message;
      setError(friendlyMessage || "ไม่สามารถโหลดข้อมูลเซิร์ฟเวอร์ได้");
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
          error: "ไม่พบเซิร์ฟเวอร์ที่ต้องการบันทึก",
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
          error: err.message || "ไม่สามารถบันทึกข้อมูลเซิร์ฟเวอร์ได้",
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
        error: "กรุณาติ๊กเพื่อยืนยันการลบ",
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
      showBanner(`ลบเซิร์ฟเวอร์ ${deleteDialog.site.name} เรียบร้อยแล้ว`, "success");
      closeDeleteDialog();
    } catch (err) {
      console.error("Failed to delete SupportPal site:", err);
      setDeleteDialog((prev) => ({
        ...prev,
        isDeleting: false,
        error: err.message || "ไม่สามารถลบเซิร์ฟเวอร์ได้",
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
        showBanner("ยืนยันการอัปเดตเรียบร้อยแล้ว!", "success");
      })
      .catch((err) => {
        showBanner(err.message || "ไม่สามารถยืนยันการอัปเดตได้", "error");
      });
  };

  const handleSaveMaintenanceNotes = (siteId) => {
    const siteName =
      sitesRef.current.find((item) => item.id === siteId)?.name || "เซิร์ฟเวอร์";

    persistSite(siteId, {}, { showLoader: false, action: "notes" })
      .then(() => {
        showBanner(`บันทึกหมายเหตุของ ${siteName} เรียบร้อยแล้ว`, "success");
      })
      .catch((err) => {
        showBanner(
          err.message || `ไม่สามารถบันทึกหมายเหตุของ ${siteName} ได้`,
          "error"
        );
      });
  };

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
      setFormStatus({ type: "error", message: "กรุณากรอกชื่อเซิร์ฟเวอร์และ URL" });
      return;
    }

    try {
      new URL(formData.url);
    } catch (error) {
      setFormStatus({
        type: "error",
        message: "กรุณากรอก URL ที่ถูกต้อง (เช่น https://support.example.com)",
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

    const siteLabel = formData.name || editingSite?.name || "เซิร์ฟเวอร์";

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
        showBanner(`เพิ่มเซิร์ฟเวอร์ ${siteLabel} เรียบร้อยแล้ว`, "success");
        goBackToDashboard();
      } else if (editingSite) {
        const payload = {
          ...basePayload,
          lastChecked: editingSite.lastChecked || null,
        };

        await updateSupportpalSite(editingSite.id, payload);
        await loadSites({ showLoader: false });
        showBanner(`บันทึกการแก้ไข ${siteLabel} เรียบร้อยแล้ว`, "success");
        goBackToDashboard();
      }
    } catch (err) {
      console.error("Failed to save SupportPal site:", err);
      const message = err?.message || "";
      const friendlyMessage = /collection|Mongo/i.test(message)
        ? `${message} ตรวจสอบการตั้งค่า MongoDB หรือสิทธิ์การเข้าถึง collection`
        : message;
      setFormStatus({
        type: "error",
        message:
          friendlyMessage || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
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
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">เกิดข้อผิดพลาดในการดึงข้อมูล</h1>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={loadSites}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  if (showInitialLoader) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center text-gray-600">
          กำลังโหลดข้อมูลเซิร์ฟเวอร์ SupportPal...
        </div>
      </div>
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
    const pageTitle = isEditing ? "แก้ไขข้อมูลเซิร์ฟเวอร์" : "เพิ่มเซิร์ฟเวอร์ใหม่";
    const pageIcon = isEditing ? "✏️" : "➕";
    const saveButtonText = isEditing ? "💾 บันทึกการแก้ไข" : "➕ เพิ่มเซิร์ฟเวอร์";

    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">
                {pageIcon} {pageTitle}
              </h1>
              <button
                onClick={goBackToDashboard}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                ← กลับไปหน้าหลัก
              </button>
            </div>
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
                  ชื่อเซิร์ฟเวอร์ *
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
                  สถานะ
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.status || ""}
                  onChange={(e) => handleFormChange("status", e.target.value)}
                >
                  <option value="healthy">Healthy (ปกติ)</option>
                  <option value="warning">Warning (เตือน)</option>
                  <option value="error">Error (ข้อผิดพลาด)</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🖥️ เวอร์ชันระบบ</h3>
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
                📝 รายละเอียดการบำรุงรักษา
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                placeholder="เพิ่มรายละเอียด เช่น อัปเดต SupportPal, ปรับปรุงฐานข้อมูล, อัปเดต PHP/Nginx, ล้างแคช ฯลฯ"
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
                {isSavingChanges ? "กำลังบันทึก..." : saveButtonText}
              </button>
              <button
                onClick={goBackToDashboard}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPageSites = getCurrentPageSites();
  const pageTitle =
    currentPage === "confirmed" ? "เซิร์ฟเวอร์ที่ตรวจสอบแล้ว" : "SupportPal Maintenance Dashboard";
  const pageIcon = currentPage === "confirmed" ? "✅" : "🎫";

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center mb-6">
        {pageIcon} {pageTitle}
      </h1>

      {banner && (
        <div
          className={`px-4 py-3 rounded-lg border flex items-start justify-between gap-4 ${
            banner.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : banner.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          <span>{banner.message}</span>
          <button onClick={dismissBanner} className="text-sm underline">
            ปิด
          </button>
        </div>
      )}

      {error && hasFetchedInitialSites && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          <div className="font-medium mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
          <div className="text-sm mb-3">{error}</div>
          <button
            onClick={() => loadSites({ showLoader: true })}
            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            ลองโหลดใหม่
          </button>
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              currentPage === "dashboard"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            🏠 หน้าหลัก ({sites.filter((s) => !s.isConfirmed).length})
          </button>
          <button
            onClick={goToConfirmedPage}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              currentPage === "confirmed"
                ? "bg-white text-green-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            ✅ ตรวจสอบแล้ว ({sites.filter((s) => s.isConfirmed).length})
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาเซิร์ฟเวอร์... (ชื่อ หรือ URL)"
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
            onClick={() => loadSites({ showLoader: true })}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              isLoading
                ? "bg-blue-100 text-blue-300 cursor-not-allowed border-blue-100"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
            }`}
          >
            🔄 รีเฟรชข้อมูล
          </button>
          <div className="text-sm text-gray-600">
            {currentPageSites.length} เซิร์ฟเวอร์ | คลิกเพื่อดูรายละเอียด
          </div>
          {currentPage === "dashboard" && (
            <button
              onClick={goToAddPage}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
            >
              ➕ เพิ่มเซิร์ฟเวอร์ใหม่
            </button>
          )}
        </div>
      </div>

      {currentPageSites.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">
            {searchTerm ? "🔍" : currentPage === "confirmed" ? "✅" : "🖥️"}
          </div>
          <div className="text-xl font-medium text-gray-600 mb-2">
            {searchTerm
              ? "ไม่พบเซิร์ฟเวอร์ที่ค้นหา"
              : currentPage === "confirmed"
                ? "ยังไม่มีเซิร์ฟเวอร์ที่ตรวจสอบแล้ว"
                : "ยังไม่มีเซิร์ฟเวอร์ในระบบ"}
          </div>
          <div className="text-gray-500">
            {searchTerm
              ? "ลองใช้คำค้นหาอื่น หรือตรวจสอบการสะกด"
              : currentPage === "confirmed"
                ? "เมื่อยืนยันการอัปเดตเซิร์ฟเวอร์แล้ว จะแสดงที่นี่"
                : "เริ่มต้นด้วยการเพิ่มเซิร์ฟเวอร์แรก"}
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
                            ✅ ตรวจสอบแล้ว
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
                        {isConfirmSaving ? "กำลังยืนยัน..." : "✅ ยืนยันการอัปเดต"}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToEditPage(site);
                      }}
                      className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✏️ แก้ไข
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
                      🗑️ ลบเซิร์ฟเวอร์
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
                      📝 รายละเอียดการบำรุงรักษา
                    </label>
                    <textarea
                      className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all resize-none"
                      rows={3}
                      placeholder="เพิ่มรายละเอียด เช่น อัปเดต SupportPal, ปรับปรุงฐานข้อมูล, อัปเดต PHP/Nginx, ล้างแคช ฯลฯ"
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
                          ? "กำลังบันทึก..."
                          : hasUnsavedChanges
                            ? "💾 บันทึกหมายเหตุ"
                            : "✓ บันทึกแล้ว"}
                      </button>
                      {lastSavedLabel && (
                        <span className="text-xs text-gray-500">
                          บันทึกล่าสุด {lastSavedLabel} น.
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
            <h2 className="text-xl font-semibold text-gray-800">ยืนยันการลบเซิร์ฟเวอร์</h2>
            <p className="text-gray-600">
              คุณกำลังจะลบ <span className="font-medium">{deleteDialog.site?.name}</span>. การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
              <div><strong>URL:</strong> {deleteDialog.site?.url}</div>
              <div><strong>สถานะ:</strong> {deleteDialog.site?.status?.toUpperCase()}</div>
              <div><strong>SupportPal:</strong> {deleteDialog.site?.versions?.supportpal || "-"}</div>
            </div>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={deleteDialog.isChecked}
                onChange={toggleDeleteConfirmation}
                className="mt-1"
              />
              <span>ฉันเข้าใจว่าการลบนี้จะลบข้อมูลทั้งหมดของเซิร์ฟเวอร์นี้ออกจากระบบ</span>
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
                ยกเลิก
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
                {deleteDialog.isDeleting ? "กำลังลบ..." : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpDashboard;
