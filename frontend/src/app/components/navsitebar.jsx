"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { logoutUser } from "../lib/api";
import { useRouter } from "next/navigation";

export default function NavSidebar({ isDesktop, isOpen, setIsOpen }) {
  const [expandedGroups, setExpandedGroups] = useState(() => ({ system: !isDesktop }));
  const [user, setUser] = useState(null);
  const [logoutError, setLogoutError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const fullName = [user?.firstname, user?.lastname]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ");
  const displayName = fullName || user?.username || user?.email || "User";
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : "?";
  const isAdmin = typeof user?.role === "string" && user.role.toLowerCase() === "admin";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Unable to parse stored user:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const clearSessionAndRedirect = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/login");
  }, [router]);

  const handleLogout = async () => {
    setLogoutError(null);

    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      clearSessionAndRedirect();
      return;
    }

    setIsLoggingOut(true);
    try {
      await logoutUser(refreshToken);
      clearSessionAndRedirect();
    } catch (err) {
      console.error("Logout failed:", err);
      setLogoutError(err.message || "Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleForceLogout = () => {
    clearSessionAndRedirect();
  };

  useEffect(() => {
    setExpandedGroups((previous) => ({
      ...previous,
      system: !isDesktop || previous.system,
    }));
  }, [isDesktop]);

  const handleNavigate = useCallback(() => {
    if (!isDesktop) {
      setIsOpen(false);
    }
  }, [isDesktop, setIsOpen]);

  const navigationItems = useMemo(
    () => [
      { id: "home", href: "/", icon: "home", label: "Home" },
      { id: "dashboard", href: "/dashboard", icon: "insights", label: "Dashboard" },
      {
        id: "system",
        icon: "grid_view",
        label: "System",
        children: [
          { id: "wordpress", href: "/WordPress", label: "WordPress" },
          { id: "supportpal", href: "/Supportpal", label: "SupportPal" },
        ],
      },
      isAdmin
        ? { id: "admin", href: "/admin", icon: "group", label: "Admin" }
        : null,
    ].filter(Boolean),
    [isAdmin],
  );

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const toggleButtonClasses =
    "fixed top-4 left-4 z-50 rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur transition-all duration-200 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40";

  const asideClasses = [
    "fixed top-0 left-0 z-40 flex h-screen flex-col bg-gradient-to-br from-[#1f3d73] via-[#264f96] to-[#17315c] text-white shadow-2xl transition-all duration-300",
    isDesktop
      ? isOpen
        ? "w-64"
        : "w-16"
      : `w-64 ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`
  ]
    .filter(Boolean)
    .join(" ");

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
      <aside className={asideClasses}>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-5 pt-8">
            <div
              className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-inner backdrop-blur transition-all duration-300 ${
                isDesktop && !isOpen ? "flex-col gap-2 text-center" : ""
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-lg font-semibold uppercase">
                {displayInitial}
              </div>
              <div
                className={`min-w-0 text-left text-sm ${
                  isDesktop && !isOpen ? "opacity-0 h-0 w-0" : "opacity-100"
                } transition-all duration-300`}
              >
                <p className="font-semibold text-white">{displayName}</p>
                <p className="text-xs text-white/70">{isAdmin ? "Administrator" : "Member"}</p>
              </div>
            </div>
          </div>

          <nav className="mt-6 flex-1 overflow-y-auto px-4 pb-8" aria-label="Main navigation">
            <ul className="space-y-3">
              {navigationItems.map((item) =>
                item.children ? (
                  <NavGroup
                    key={item.id}
                    item={item}
                    isOpen={isOpen}
                    isDesktop={isDesktop}
                    isExpanded={Boolean(expandedGroups[item.id])}
                    onToggle={() =>
                      setExpandedGroups((previous) => ({
                        ...previous,
                        [item.id]: !previous[item.id],
                      }))
                    }
                    onNavigate={handleNavigate}
                  />
                ) : (
                  <li key={item.id}>
                    <NavLink
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      isOpen={isOpen}
                      onNavigate={handleNavigate}
                    />
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/10 px-4 py-5">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-red-100 transition-all duration-200 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
          {logoutError && (
            <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/20 px-3 py-2 text-xs text-red-100" aria-live="polite">
              <p>{logoutError}</p>
              <button
                type="button"
                onClick={handleForceLogout}
                className="mt-1 inline-flex items-center text-[11px] font-semibold underline hover:text-red-50"
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

function NavLink({
  href,
  icon,
  label,
  isOpen,
  onNavigate,
  isChild = false,
  showLabel,
}) {
  const shouldShowLabel = typeof showLabel === "boolean" ? showLabel : isOpen;
  const baseClasses = `group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
    isChild
      ? "bg-white/5 text-white/80 hover:bg-white/15"
      : "bg-white/5 text-white hover:bg-white/20"
  }`;

  return (
    <Link href={href} className={baseClasses} onClick={onNavigate}>
      <span
        className={`material-icons ${
          isChild ? "text-base text-white/50" : "text-xl"
        } transition-all duration-300 ${shouldShowLabel ? "" : "mx-auto"}`}
        aria-hidden
      >
        {isChild ? "arrow_forward_ios" : icon}
      </span>
      <span
        className={`whitespace-nowrap text-left transition-all duration-300 ${
          shouldShowLabel
            ? "opacity-100"
            : "pointer-events-none w-0 translate-x-2 overflow-hidden opacity-0"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

function NavGroup({ item, isOpen, isDesktop, isExpanded, onToggle, onNavigate }) {
  const shouldShowChildren = isDesktop ? isExpanded : true;

  return (
    <li>
      <div className="rounded-3xl bg-white/5 p-2 shadow-inner">
        <button
          type="button"
          onClick={isDesktop ? onToggle : undefined}
          aria-expanded={isDesktop ? isExpanded : true}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 ${
            isDesktop && !isOpen ? "justify-center" : "justify-between"
          }`}
        >
          <span className="flex items-center gap-3">
            <span
              className={`material-icons text-xl transition-all duration-300 ${
                isDesktop && !isOpen ? "" : ""
              }`}
              aria-hidden
            >
              {item.icon}
            </span>
            <span
              className={`whitespace-nowrap transition-all duration-300 ${
                isOpen ? "opacity-100" : "opacity-0 -translate-x-2"
              } ${isDesktop && !isOpen ? "pointer-events-none hidden" : ""}`}
            >
              {item.label}
            </span>
          </span>
          {isDesktop && isOpen && (
            <span
              className={`material-icons text-base transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              expand_more
            </span>
          )}
        </button>

        {shouldShowChildren && (
          <div className="mt-2 space-y-2 rounded-2xl bg-white/5 p-3">
            {item.children.map((child) => (
              <NavLink
                key={child.id}
                href={child.href}
                label={child.label}
                isOpen={isOpen}
                onNavigate={onNavigate}
                isChild
                showLabel={isOpen || !isDesktop}
              />
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
