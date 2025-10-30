"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { logoutUser } from "../lib/api";
import { useRouter } from "next/navigation";

export default function NavSidebar({ isDesktop, isOpen, setIsOpen }) {
  const [expandedGroups, setExpandedGroups] = useState(() => ({
    dashboard: true,
    system: !isDesktop,
  }));
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
      dashboard: true,
      system: !isDesktop || previous.system,
    }));
  }, [isDesktop]);

  useEffect(() => {
    if (isDesktop && !isOpen) {
      setExpandedGroups((previous) => ({
        ...previous,
        dashboard: false,
        system: false,
      }));
    } else if (isDesktop && isOpen) {
      setExpandedGroups((previous) => ({
        ...previous,
        dashboard: true,
      }));
    }
  }, [isDesktop, isOpen]);

  const handleNavigate = useCallback(() => {
    if (!isDesktop) {
      setIsOpen(false);
    }
  }, [isDesktop, setIsOpen]);

  const navigationItems = useMemo(() => {
    const items = [
      { id: "home", href: "/", icon: "home", label: "Home" },
      {
        id: "dashboard",
        icon: "insights",
        label: "Dashboard",
        children: [
          {
            id: "dashboard-overview",
            href: "/dashboard",
            icon: "space_dashboard",
            label: "Overview",
          },
          {
            id: "dashboard-history",
            href: "/dashboard/history",
            icon: "history",
            label: "Maintenance log",
          },
        ],
      },
    ];

    if (isAdmin) {
      items.push({
        id: "system",
        icon: "grid_view",
        label: "System",
        children: [
          {
            id: "wordpress",
            href: "/WordPress",
            icon: "language",
            label: "WordPress",
          },
          {
            id: "supportpal",
            href: "/Supportpal",
            icon: "support_agent",
            label: "SupportPal",
          },
        ],
      });

      items.push({ id: "admin", href: "/admin", icon: "group", label: "Admin" });
    }

    return items;
  }, [isAdmin]);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const toggleButtonClasses = [
    "fixed top-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#132a4b] text-white shadow-lg transition-all duration-200 lg:hidden",
    "hover:border-white/40 hover:bg-[#1b3762] focus:outline-none focus:ring-2 focus:ring-white/30",
  ].join(" ");

  const asideClasses = [
    "fixed top-0 left-0 z-40 flex h-screen flex-col overflow-hidden bg-gradient-to-b from-[#16294d] via-[#102347] to-[#0c1834] text-white shadow-2xl transition-[width,transform] duration-300",
    isDesktop
      ? isOpen
        ? "w-64"
        : "w-20"
      : `w-64 ${isOpen ? "translate-x-0" : "-translate-x-full"}`,
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
        <span className="material-icons text-xl">
          {isOpen ? "chevron_left" : "menu"}
        </span>
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
          <div className="px-5 pt-8 pb-6">
            <div className="flex items-center justify-between">
              <div className={`text-sm font-semibold tracking-wide ${isDesktop && !isOpen ? "sr-only" : "uppercase text-white/70"}`}>
                Web Maintenance
              </div>
              {isDesktop && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10 lg:flex"
                  aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                  aria-expanded={isOpen}
                >
                  <span className="material-icons text-base">
                    {isOpen ? "chevron_left" : "chevron_right"}
                  </span>
                </button>
              )}
            </div>

            <div className="mt-2 rounded-xl  ">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-semibold uppercase">
                  {displayInitial}
                </div>
                {(isOpen || !isDesktop) && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                    <p className="text-xs text-white/60">{isAdmin ? "Administrator" : "Member"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-8" aria-label="Main navigation">
            <ul className="space-y-2">
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
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-red-100 transition-colors duration-200 hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
          {logoutError && (
            <div className="mt-3 rounded-lg border border-red-400/30 bg-red-500/20 px-3 py-2 text-xs text-red-100" aria-live="polite">
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
  const iconName = icon || (isChild ? "chevron_right" : "radio_button_unchecked");
  const baseClasses = [
    "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
    isChild ? "text-white/80 hover:bg-white/10" : "text-white hover:bg-white/10",
    shouldShowLabel ? "justify-start gap-3" : "justify-center",
    isChild && shouldShowLabel ? "pl-8" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={href}
      className={baseClasses}
      onClick={onNavigate}
      title={label}
      aria-label={!shouldShowLabel ? label : undefined}
    >
      <span
        className={`material-icons ${
          isChild && shouldShowLabel ? "text-base text-white/60" : "text-lg"
        } transition-transform duration-200`}
        aria-hidden
      >
        {iconName}
      </span>
      {shouldShowLabel && <span className="flex-1 truncate text-left">{label}</span>}
    </Link>
  );
}

function NavGroup({ item, isOpen, isDesktop, isExpanded, onToggle, onNavigate }) {
  const isCollapsedDesktop = isDesktop && !isOpen;
  const shouldShowChildren = isCollapsedDesktop
    ? true
    : isDesktop
    ? isExpanded && isOpen
    : true;

  const parentButtonClasses = [
    "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30",
    isCollapsedDesktop ? "justify-center" : "justify-between",
  ]
    .filter(Boolean)
    .join(" ");

  const showParentLabel = !isCollapsedDesktop && (isOpen || !isDesktop);

  const collapsedChildren = isCollapsedDesktop && isExpanded
    ? item.children.map((child) => (
        <NavLink
          key={child.id}
          href={child.href}
          icon={child.icon}
          label={child.label}
          isOpen={false}
          onNavigate={onNavigate}
          showLabel={false}
        />
      ))
    : null;

  const expandedChildren = !isCollapsedDesktop && shouldShowChildren
    ? item.children.map((child) => (
        <NavLink
          key={child.id}
          href={child.href}
          icon={child.icon}
          label={child.label}
          isOpen={isOpen}
          onNavigate={onNavigate}
          isChild
          showLabel={isOpen || !isDesktop}
        />
      ))
    : null;

  return (
    <li>
      <div
        className={`rounded-xl  p-2 transition-all duration-200 ${
          isCollapsedDesktop && isExpanded ? "pb-3" : ""
        }`}
      >
        <button
          type="button"
          onClick={isDesktop ? onToggle : undefined}
          aria-expanded={isDesktop ? isExpanded : true}
          aria-label={isCollapsedDesktop ? item.label : undefined}
          title={item.label}
          className={`${parentButtonClasses} ${
            isCollapsedDesktop && isExpanded ? "bg-white/10" : ""
          }`}
        >
          <span className="flex items-center gap-3">
            <span className="material-icons text-lg" aria-hidden>
              {item.icon}
            </span>
            {showParentLabel && <span className="truncate">{item.label}</span>}
          </span>
          {isDesktop && isOpen && (
            <span
              className={`material-icons text-base transition-transform duration-200 ${
                isCollapsedDesktop
                  ? isExpanded
                    ? "rotate-45"
                    : ""
                  : isExpanded
                  ? "-rotate-180"
                  : ""
              }`}
            >
              expand_more
            </span>
          )}
        </button>

        {!isCollapsedDesktop && expandedChildren && (
          <div className={`space-y-1 ${isDesktop ? "mt-2" : "mt-3"}`}>{expandedChildren}</div>
        )}
      </div>
      {isCollapsedDesktop && collapsedChildren && (
        <div className="mt-3 space-y-1">{collapsedChildren}</div>
      )}
    </li>
  );
}
