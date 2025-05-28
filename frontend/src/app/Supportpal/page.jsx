"use client";

import { useState, useEffect, useCallback } from "react";


const initialSites = [
  {
    id: 1,
    name: "SupportPal Main",
    url: "https://support.example.com",
    logo: "https://via.placeholder.com/50",
    versions: {
      nginx: "1.22.1",
      php: "8.1.27",
      mariadb: "10.11.6",
      supportpal: "3.3.2"
    },
    lastChecked: "2025-05-27 10:15",
    status: "healthy",
    maintenanceNotes: "",
    isConfirmed: false,
  },

];

const SpDashboard = () => {
  const [sites, setSites] = useState(initialSites);
  const [expandedSites, setExpandedSites] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'edit', 'add', 'confirmed'
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSiteExpansion = (id) => {
    setExpandedSites(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ปรับปรุงการใช้ useCallback เพื่อป้องกัน unnecessary re-renders
  const resetToMainPage = useCallback(() => {
    // ใช้ deep copy เพื่อหลีกเลี่ยงปัญหา reference
    setSites(JSON.parse(JSON.stringify(initialSites)));
    setExpandedSites({});
    setOpenDropdowns({});
    setCurrentPage('dashboard');
    setEditingSite(null);
    setFormData({});
    setSearchTerm('');
    console.log('System reset completed - back to main page');
  }, []);

  useEffect(() => {
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
  }, [resetToMainPage]); // เพิ่ม dependency array

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
      versions: {
        nginx: '1.22.1',
        php: '8.1.27',
        mariadb: '10.11.6',
        supportpal: '3.3.2'
      },
      status: 'healthy',
      maintenanceNotes: '',
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
      versions: { ...site.versions },
      status: site.status,
      maintenanceNotes: site.maintenanceNotes,
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

  const handleVersionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      versions: {
        ...prev.versions,
        [field]: value
      }
    }));
  };

  // ปรับปรุงการ validation ในฟังก์ชัน saveChanges
  const saveChanges = () => {
    // เพิ่มการตรวจสอบข้อมูลที่จำเป็น
    if (!formData.name || !formData.url) {
      alert('กรุณากรอกชื่อเซิร์ฟเวอร์และ URL');
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
      const newSite = {
        ...formData,
        id: Math.max(...sites.map(s => s.id)) + 1,
        lastChecked: new Date().toLocaleString('th-TH')
      };
      setSites(prev => [...prev, newSite]);
      alert(`เพิ่มเซิร์ฟเวอร์ ${formData.name} เรียบร้อยแล้ว`);
    } else {
      setSites(prev =>
        prev.map(site =>
          site.id === editingSite.id ? { ...site, ...formData } : site
        )
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
    const pageTitle = isEditing ? 'แก้ไขข้อมูลเซิร์ฟเวอร์' : 'เพิ่มเซิร์ฟเวอร์ใหม่';
    const pageIcon = isEditing ? '✏️' : '➕';
    const saveButtonText = isEditing ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มเซิร์ฟเวอร์';
    
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
                  ชื่อเซิร์ฟเวอร์ *
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
                  value={formData.logo || ''}
                  onChange={(e) => handleFormChange('logo', e.target.value)}
                />
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
            </div>

            {/* System Versions */}
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
                    value={formData.versions?.nginx || ''}
                    onChange={(e) => handleVersionChange('nginx', e.target.value)}
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
                    value={formData.versions?.php || ''}
                    onChange={(e) => handleVersionChange('php', e.target.value)}
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
                    value={formData.versions?.mariadb || ''}
                    onChange={(e) => handleVersionChange('mariadb', e.target.value)}
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
                    value={formData.versions?.supportpal || ''}
                    onChange={(e) => handleVersionChange('supportpal', e.target.value)}
                    placeholder="3.3.2"
                  />
                </div>
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
                placeholder="เพิ่มรายละเอียด เช่น อัปเดต SupportPal, ปรับปรุงฐานข้อมูล, อัปเดต PHP/Nginx, ล้างแคช ฯลฯ"
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
  const pageTitle = currentPage === 'confirmed' ? 'เซิร์ฟเวอร์ที่ตรวจสอบแล้ว' : 'SupportPal Maintenance Dashboard';
  const pageIcon = currentPage === 'confirmed' ? '✅' : '🎫';

  // Dashboard and Confirmed Pages
  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center mb-6">
        {pageIcon} {pageTitle}
      </h1>

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
          <div className="text-sm text-gray-600">
            {currentPageSites.length} เซิร์ฟเวอร์ | คลิกเพื่อดูรายละเอียด
          </div>
          {currentPage === 'dashboard' && (
            <button
              onClick={goToAddPage}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
            >
              ➕ เพิ่มเซิร์ฟเวอร์ใหม่
            </button>
          )}
        </div>
      </div>

      {/* Sites List */}
      {currentPageSites.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">
            {searchTerm ? '🔍' : currentPage === 'confirmed' ? '✅' : '🖥️'}
          </div>
          <div className="text-xl font-medium text-gray-600 mb-2">
            {searchTerm 
              ? 'ไม่พบเซิร์ฟเวอร์ที่ค้นหา' 
              : currentPage === 'confirmed' 
                ? 'ยังไม่มีเซิร์ฟเวอร์ที่ตรวจสอบแล้ว' 
                : 'ยังไม่มีเซิร์ฟเวอร์ในระบบ'
            }
          </div>
          <div className="text-gray-500">
            {searchTerm 
              ? 'ลองใช้คำค้นหาอื่น หรือตรวจสอบการสะกด' 
              : currentPage === 'confirmed' 
                ? 'เมื่อยืนยันการอัปเดตเซิร์ฟเวอร์แล้ว จะแสดงที่นี่' 
                : 'เริ่มต้นด้วยการเพิ่มเซิร์ฟเวอร์แรก'
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
                    <div>SP {site.versions.supportpal}</div>
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

                {/* System Versions Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">🌐 NGINX</div>
                    <div className="font-semibold text-gray-800">{site.versions.nginx}</div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">🐘 PHP</div>
                    <div className="font-semibold text-gray-800">{site.versions.php}</div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">🗄️ MariaDB</div>
                    <div className="font-semibold text-gray-800">{site.versions.mariadb}</div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">🎫 SupportPal</div>
                    <div className="font-semibold text-gray-800">{site.versions.supportpal}</div>
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
                    placeholder="เพิ่มรายละเอียด เช่น อัปเดต SupportPal, ปรับปรุงฐานข้อมูล, อัปเดต PHP/Nginx, ล้างแคช ฯลฯ"
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

export default SpDashboard;