"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from 'react';
import { logoutUser } from '../lib/api';
import { useRouter } from 'next/navigation';

export default function NavSidebar({ isDesktop, isOpen, setIsOpen }) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [logoutError, setLogoutError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const isAdmin = typeof user?.role === 'string' && user.role.toLowerCase() === 'admin';
  const fullName = [user?.firstname, user?.lastname]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ');
  const displayName = fullName || user?.username || user?.email || 'User';
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Unable to parse stored user:', error);
        localStorage.removeItem('user');
      }
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
      setLogoutError(err.message || 'Unable to log out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleForceLogout = () => {
    clearSessionAndRedirect();
  };

  useEffect(() => {
    if (!isOpen) {
      setIsDashboardOpen(false);
    }
  }, [isOpen]);

  const handleNavigate = useCallback(() => {
    if (!isDesktop) {
      setIsOpen(false);
    }
  }, [isDesktop, setIsOpen]);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const toggleButtonClasses = [
    'fixed top-4 z-50 bg-[#316fb7] hover:bg-[#7a98bb] text-white p-3 rounded-md focus:outline-none focus:ring-0 transition-colors duration-200',
    isDesktop ? (isOpen ? 'left-60' : 'left-6') : 'left-4'
  ].join(' ');

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={toggleButtonClasses}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isOpen}
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
      {!isDesktop && isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-gradient-to-br from-[#316fb7] via-[#2a5fa0] to-[#1f4d85] text-white flex flex-col shadow-xl transition-all duration-300 z-40 transform ${
          isDesktop
            ? isOpen
              ? 'w-64'
              : 'w-16'
            : `w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        } lg:translate-x-0`}
      >
        {/* Header */}
        <div className={`px-4 pt-6 ${isDesktop && !isOpen ? 'hidden lg:block lg:px-0' : ''}`}>
          {(!isDesktop || isOpen) && (
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          )}
        </div>

        <div className="px-4 pt-4">
          {user ? (
            <span
              className={`text-sm text-white bg-[#5c8bc0] hover:bg-[#688db8] cursor-pointer transition-all duration-300 ${
                isDesktop && !isOpen
                  ? 'flex h-10 w-10 items-center justify-center rounded-full'
                  : 'block w-fit rounded-full px-3 py-1'
              }`}
              title={displayName}
            >
              {isDesktop && !isOpen ? displayInitial : displayName}
            </span>
          ) : (
            <span className="text-sm text-white/80">Not logged in</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 pb-6" aria-label="Main navigation">
          <div className="space-y-2">
            <NavLink href="/" icon="home" label="Home" isOpen={isOpen} onNavigate={handleNavigate} />
            <NavLink
              href="/dashboard"
              icon="insights"
              label="Dashboard"
              isOpen={isOpen}
              onNavigate={handleNavigate}
            />

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
                  System
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
                    onClick={handleNavigate}
                    className="block rounded p-2 text-sm text-gray-300 transition-colors duration-200 hover:bg-[#7a98bb] hover:text-white"
                  >
                    WordPress
                  </Link>
                  <Link
                    href="/Supportpal"
                    onClick={handleNavigate}
                    className="block rounded p-2 text-sm text-gray-300 transition-colors duration-200 hover:bg-[#7a98bb] hover:text-white"
                  >
                    SupportPal
                  </Link>
                </div>
              )}
            </div>

            {isAdmin && (
              <NavLink
                href="/admin"
                icon="people"
                label="Admin"
                isOpen={isOpen}
                onNavigate={handleNavigate}
              />
            )}
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
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
          {logoutError && (
            <div className="text-xs text-red-100 bg-red-500/20 rounded-md px-3 py-2 space-y-1" aria-live="polite">
              <p>{logoutError}</p>
              <button
                type="button"
                onClick={handleForceLogout}
                className="underline text-red-100 hover:text-red-50"
              >
                Force logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// Extracted NavLink component for better maintainability
function NavLink({ href, icon, label, isOpen, onNavigate, className = "" }) {
  const baseClasses =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white/15";
  const classes = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <Link href={href} className={classes} onClick={onNavigate}>
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
