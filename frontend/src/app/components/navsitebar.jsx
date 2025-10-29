"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from 'react';
import { logoutUser } from '../lib/api';
import { useRouter } from 'next/navigation';

export default function NavSidebar({ isOpen, setIsOpen }) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [logoutError, setLogoutError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const clearSessionAndRedirect = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/login');
  }, [router]);

  const handleLogout = async () => {
    setLogoutError(null);

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearSessionAndRedirect();
      return;
    }

    setIsLoggingOut(true);
    try {
      await logoutUser(refreshToken);
      clearSessionAndRedirect();
    } catch (err) {
      console.error('Logout failed:', err);
      setLogoutError(err.message || 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleForceLogout = () => {
    clearSessionAndRedirect();
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 bg-[#316fb7] hover:bg-[#7a98bb] text-white p-3 rounded-md focus:outline-none focus:ring-0 transition-colors duration-200"
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          )}
        </svg>
      </button>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-white bg-opacity-50 z-[-1] "
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-[#316fb7] text-white flex flex-col transition-all duration-300 z-40 ${
          isOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Header */}
        <div className="p-4 ml-10 mt-2 ">
          <h2
            className={`text-xl font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isOpen ? "opacity-100 ml-2" : "opacity-0 w-0"
            }`}
          >
            Admin Panel
          </h2>
        </div>

         <div className="p-2 ml-5">
  {user ? (
    <span
      className="text-sm bg-[#5c8bc0] rounded-4xl hover:bg-[#688db8] cursor-pointer px-3 py-1 block w-fit transition-all duration-300"
      title={`${user.firstname} ${user.lastname}`} // Tooltip ตอน hover
    >
      {isOpen
        ? `${user.firstname} ${user.lastname}`
        : user.firstname.charAt(0)}
    </span>
  ) : (
    <span className="text-sm">Not logged in</span>
  )}
</div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <NavLink href="/" icon="home" label="Home" isOpen={isOpen} />

            {/* Dashboard with Submenu */}
            <div>
              <button
                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                className="w-full flex items-center p-3 rounded-lg transition-all duration-200 hover:bg-[#7a98bb] text-left"
              >
                <span
                  className={`material-icons text-xl transition-all duration-300 ${
                    isOpen ? "mr-3" : "mx-auto"
                  }`}
                >
                  dashboard
                </span>
                <span
                  className={`whitespace-nowrap transition-all duration-300 flex-1 ${
                    isOpen
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2 w-0 overflow-hidden"
                  }`}
                >
                  Dashboard
                </span>
                {isOpen && (
                  <span
                    className={`material-icons text-sm transition-transform duration-200 ${
                      isDashboardOpen ? "rotate-180" : ""
                    }`}
                  >
                    keyboard_arrow_down
                  </span>
                )}
              </button>

              {/* Submenu */}
              {isOpen && (
                <div
                  className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${
                    isDashboardOpen
                      ? "max-h-32 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <Link
                    href="/WordPress"
                    className="block p-2 text-sm text-gray-300 hover:text-white hover:bg-[#7a98bb] rounded transition-colors duration-200"
                  >
                    WordPress
                  </Link>
                  <Link
                    href="/Supportpal"
                    className="block p-2 text-sm text-gray-300 hover:text-white hover:bg-[#7a98bb] rounded transition-colors duration-200"
                  >
                    SupportPal
                  </Link>
                </div>
              )}
            </div>

            <NavLink
              href="/admin"
              icon="people"
              label="Admin"
              isOpen={isOpen}
            />
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 text-center border-t border-gray-700 space-y-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-2 rounded-md text-sm font-medium text-red-200 hover:text-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? 'กำลังออกจากระบบ...' : 'Logout'}
          </button>
          {logoutError && (
            <div className="text-xs text-red-100 bg-red-500/20 rounded-md px-3 py-2 space-y-1" aria-live="polite">
              <p>{logoutError}</p>
              <button
                type="button"
                onClick={handleForceLogout}
                className="underline text-red-100 hover:text-red-50"
              >
                บังคับออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// Extracted NavLink component for better maintainability
function NavLink({ href, icon, label, isOpen, className = "" }) {
  const baseClasses =
    "flex items-center p-3 rounded-lg transition-all duration-200 hover:bg-[#7a98bb]";
  const classes = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <Link href={href} className={classes}>
      <span
        className={`material-icons text-xl transition-all duration-300 ${
          isOpen ? "mr-3" : "mx-auto"
        }`}
      >
        {icon}
      </span>
      <span
        className={`whitespace-nowrap transition-all duration-300 ${
          isOpen
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-2 w-0 overflow-hidden"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
