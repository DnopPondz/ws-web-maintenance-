"use client";
import Link from "next/link";
import { useState } from "react";

export default function NavSidebar({ isOpen, setIsOpen }) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-gray-800 text-white flex flex-col transition-all duration-300 z-40 ${
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

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <NavLink href="/" icon="home" label="Home" isOpen={isOpen} />

            {/* Dashboard with Submenu */}
            <div>
              <button
                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                className="w-full flex items-center p-3 rounded-lg transition-all duration-200 hover:bg-gray-700 text-left"
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
                    className="block p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors duration-200"
                  >
                    WordPress
                  </Link>
                  <Link
                    href="/SupportPal"
                    className="block p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors duration-200"
                  >
                    SupportPal
                  </Link>
                </div>
              )}
            </div>

            <NavLink
              href="/admin"
              icon="people"
              label="Users"
              isOpen={isOpen}
            />
            <NavLink
              href="/settings"
              icon="settings"
              label="Settings"
              isOpen={isOpen}
            />
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <NavLink
            href="/logout"
            icon="logout"
            label="Logout"
            isOpen={isOpen}
            className="text-red-300 hover:bg-red-900/20 hover:text-red-200"
          />
        </div>
      </aside>
    </>
  );
}

// Extracted NavLink component for better maintainability
function NavLink({ href, icon, label, isOpen, className = "" }) {
  const baseClasses =
    "flex items-center p-3 rounded-lg transition-all duration-200 hover:bg-gray-700";
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
