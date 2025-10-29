"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { fetchWordpressSites } from "../lib/api";

const cloneSites = (sites = []) =>
  sites.map((site) => ({
    ...site,
    theme: site.theme ? { ...site.theme } : { name: "", version: "" },
    plugins: Array.isArray(site.plugins)
      ? site.plugins.map((plugin) => ({ ...plugin }))
      : [],
  }));

const normaliseSites = (rawSites = []) =>
  rawSites.map((site, index) => ({
    id: typeof site?.id === "number" ? site.id : index + 1,
    name: site?.name || "Unnamed Site",
    url: site?.url || "",
    logo: site?.logo || "https://via.placeholder.com/50",
    wordpressVersion: site?.wordpressVersion || "N/A",
    status: site?.status || "healthy",
    maintenanceNotes: site?.maintenanceNotes || "",
    theme: {
      name: site?.theme?.name || "N/A",
      version: site?.theme?.version || "N/A",
    },
    plugins: Array.isArray(site?.plugins)
      ? site.plugins.map((plugin, pluginIndex) => ({
          name: plugin?.name || `Plugin ${pluginIndex + 1}`,
          version: plugin?.version || "N/A",
        }))
      : [],
    isConfirmed: Boolean(site?.isConfirmed),
    lastChecked: site?.lastChecked || "-",
  }));

const cloneSite = (site) => {
  if (!site) {
    return null;
  }

  return cloneSites([site])[0];
};

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

  const loadSites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiSites = await fetchWordpressSites();
      const normalisedSites = normaliseSites(apiSites);
      initialSitesRef.current = cloneSites(normalisedSites);
      setSites(normalisedSites);
      setHasFetchedInitialSites(true);
    } catch (err) {
      console.error('Failed to load WordPress sites:', err);
      setError(err.message || 'ไม่สามารถโหลดข้อมูลเว็บไซต์ได้');
      if (!initialSitesRef.current.length) {
        setSites([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

useEffect(() => {
    loadSites();
  }, [loadSites]);


  const toggleSiteExpansion = (id) => {
    setExpandedSites(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  

  // ปรับปรุงการใช้ useCallback เพื่อป้องกัน unnecessary re-renders
  const resetToMainPage = useCallback(() => {
    if (!initialSitesRef.current.length) {
      console.warn('No initial WordPress site data available to reset.');
      return;
    }

    setSites(cloneSites(initialSitesRef.current));
    setExpandedSites({});
    setOpenDropdowns({});
    setCurrentPage('dashboard');
    setEditingSite(null);
    setFormData({});
    setSearchTerm('');
    console.log('System reset completed - back to main page');
  }, []);

  useEffect(() => {
    if (!hasFetchedInitialSites) {
      return;
    }

    const checkAndReset = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = อาทิตย์, 1 = จันทร์
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // ตรวจสอบว่าเป็นวันจันทร์เที่ยงคืน (00:00)
      if (dayOfWeek === 1 && hours === 0 && minutes === 0) {
        resetToMainPage();
      }
    };

    // ตั้งเวลาตรวจสอบทุกนาที
    const interval = setInterval(checkAndReset, 60000);

    // ทำความสะอาดเมื่อ component unmount
    return () => clearInterval(interval);
  }, [resetToMainPage, hasFetchedInitialSites]); // เพิ่ม dependency array

  const toggleDropdown = (id, type) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [`${id}-${type}`]: !prev[`${id}-${type}`],
    }));
  };

  const updateMaintenanceNotes = (id, notes) => {
    setSites(prev =>
      prev.map(site =>
        site.id === id ? { ...site, maintenanceNotes: notes } : site
      )
    );
  };

  const confirmUpdate = (siteId) => {
    setSites(prev =>
      prev.map(site =>
        site.id === siteId ? { ...site, isConfirmed: true, lastChecked: new Date().toLocaleString('th-TH') } : site
      )
    );
    alert('ยืนยันการอัปเดตเรียบร้อยแล้ว!');
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
    setCurrentPage('edit');
  };

  const goBackToDashboard = () => {
    setCurrentPage('dashboard');
    setEditingSite(null);
    setFormData({});
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
  const saveChanges = () => {
    // เพิ่มการตรวจสอบข้อมูลที่จำเป็น
    if (!formData.name || !formData.url) {
      alert('กรุณากรอกชื่อเว็บไซต์และ URL');
      return;
    }

    // ตรวจสอบ URL format
    try {
      new URL(formData.url);
    } catch {
      alert('กรุณากรอก URL ที่ถูกต้อง (เช่น https://example.com)');
      return;
    }

    if (currentPage === 'add') {
      const nextId = sites.length
        ? Math.max(...sites.map((s) => (typeof s.id === 'number' ? s.id : Number(s.id) || 0))) + 1
        : 1;

      const newSite = cloneSite({
        ...formData,
        id: nextId,
        lastChecked: new Date().toLocaleString('th-TH'),
        isConfirmed: Boolean(formData.isConfirmed),
      });

      if (!newSite) {
        alert('ไม่สามารถเพิ่มเว็บไซต์ใหม่ได้');
        return;
      }

      setSites((prev) => [...prev, newSite]);
      alert(`เพิ่มเว็บไซต์ ${formData.name} เรียบร้อยแล้ว`);
    } else if (editingSite) {
      const updatedSite = cloneSite({
        ...editingSite,
        ...formData,
      });

      if (!updatedSite) {
        alert('ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองอีกครั้ง');
        return;
      }

      setSites((prev) =>
        prev.map((site) => (site.id === editingSite.id ? updatedSite : site))
      );
      alert(`บันทึกการแก้ไข ${formData.name} เรียบร้อยแล้ว`);
    }
    goBackToDashboard();
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
          กำลังโหลดข้อมูลเว็บไซต์ WordPress...
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
    const pageTitle = isEditing ? 'แก้ไขข้อมูลเว็บไซต์' : 'เพิ่มเว็บไซต์ใหม่';
    const pageIcon = isEditing ? '✏️' : '➕';
    const saveButtonText = isEditing ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มเว็บไซต์';
    
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
                ← กลับไปหน้าหลัก
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อเว็บไซต์ *
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
                สถานะ
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.status || ''}
                onChange={(e) => handleFormChange('status', e.target.value)}
              >
                <option value="healthy">Healthy (ปกติ)</option>
                <option value="warning">Warning (เตือน)</option>
                <option value="error">Error (ข้อผิดพลาด)</option>
              </select>
            </div>

            {/* Theme Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🎨 ธีม</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อธีม
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
                    เวอร์ชัน
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
                <h3 className="text-lg font-semibold text-gray-800">🔌 ปลั๊กอิน</h3>
                <button
                  onClick={addPlugin}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  + เพิ่มปลั๊กอิน
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.plugins?.map((plugin, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="ชื่อปลั๊กอิน"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={plugin.name}
                        onChange={(e) => handlePluginChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="text"
                        placeholder="เวอร์ชัน"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={plugin.version}
                        onChange={(e) => handlePluginChange(index, 'version', e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => removePlugin(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm transition-colors"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Notes */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 รายละเอียดการบำรุงรักษา
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                placeholder="เพิ่มรายละเอียด เช่น อัปเดตปลั๊กอิน ลบไฟล์เก่า ปรับปรุงความเร็ว ฯลฯ"
                value={formData.maintenanceNotes || ''}
                onChange={(e) => handleFormChange('maintenanceNotes', e.target.value)}
              />
            </div>

            {/* Save Buttons */}
            <div className="border-t pt-6 flex gap-3">
              <button
                onClick={saveChanges}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                {saveButtonText}
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
  const pageTitle = currentPage === 'confirmed' ? 'เว็บไซต์ที่ตรวจสอบแล้ว' : 'WordPress Maintenance Dashboard';
  const pageIcon = currentPage === 'confirmed' ? '✅' : '🚀';

  // Dashboard and Confirmed Pages
  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center mb-6">
        {pageIcon} {pageTitle}
      </h1>

      {hasFetchedInitialSites && isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-center text-sm">
          กำลังรีเฟรชข้อมูลล่าสุด...
        </div>
      )}

      {hasFetchedInitialSites && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          <div className="font-semibold mb-1">ไม่สามารถรีเฟรชข้อมูลล่าสุดได้</div>
          <p className="text-sm mb-3">{error}</p>
          <button
            onClick={loadSites}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            ลองอีกครั้ง
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
            🏠 หน้าหลัก ({sites.filter(s => !s.isConfirmed).length})
          </button>
          <button
            onClick={goToConfirmedPage}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              currentPage === 'confirmed' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ✅ ตรวจสอบแล้ว ({sites.filter(s => s.isConfirmed).length})
          </button>
        </div>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาเว็บไซต์... (ชื่อ หรือ URL)"
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
            🔄 รีเฟรชข้อมูล
          </button>
          <div className="text-sm text-gray-600">
            {currentPageSites.length} เว็บไซต์ | คลิกเพื่อดูรายละเอียด
          </div>
          {currentPage === 'dashboard' && (
            <button
              onClick={goToAddPage}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
            >
              ➕ เพิ่มเว็บไซต์ใหม่
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
              ? 'ไม่พบเว็บไซต์ที่ค้นหา' 
              : currentPage === 'confirmed' 
                ? 'ยังไม่มีเว็บไซต์ที่ตรวจสอบแล้ว' 
                : 'ยังไม่มีเว็บไซต์ในระบบ'
            }
          </div>
          <div className="text-gray-500">
            {searchTerm 
              ? 'ลองใช้คำค้นหาอื่น หรือตรวจสอบการสะกด' 
              : currentPage === 'confirmed' 
                ? 'เมื่อยืนยันการอัปเดตเว็บไซต์แล้ว จะแสดงที่นี่' 
                : 'เริ่มต้นด้วยการเพิ่มเว็บไซต์แรก'
            }
          </div>
        </div>
      ) : (
        currentPageSites.map((site) => (
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
                    <div>WP {site.wordpressVersion}</div>
                    <div>{site.lastChecked}</div>
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
                      onClick={() => confirmUpdate(site.id)}
                      className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✅ ยืนยันการอัปเดต
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
                        {site.plugins.length} ปลั๊กอิน
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
                    📝 รายละเอียดการบำรุงรักษา
                  </label>
                  <textarea
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all resize-none"
                    rows={3}
                    placeholder="เพิ่มรายละเอียด เช่น อัปเดตปลั๊กอิน ลบไฟล์เก่า ปรับปรุงความเร็ว ฯลฯ"
                    value={site.maintenanceNotes}
                    onChange={(e) => updateMaintenanceNotes(site.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default WpDashboard;