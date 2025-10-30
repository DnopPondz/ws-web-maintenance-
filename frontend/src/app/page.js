"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PageContainer from "./components/PageContainer";
import { fetchSupportpalSites, fetchWordpressSites } from "./lib/api";
import { useAuth } from "./lib/auth-context";

const SERVICES = [
  {
    key: "wordpress",
    name: "WordPress",
    description:
      "Review plugin updates, confirm content deployments, and track maintenance history for each site.",
    href: "/WordPress",
    badge: "Weekly resets • Mondays 00:00 (Asia/Bangkok)",
    image: {
      src: "/logo-image/wordpress-logo.png",
      alt: "WordPress logo",
    },
    gradient: "from-[#f0f6ff] to-white",
  },
  {
    key: "supportpal",
    name: "SupportPal",
    description:
      "Monitor ticketing infrastructure, confirm server updates, and document follow-up actions.",
    href: "/Supportpal",
    badge: "Monthly resets • 1st day 00:00 (Asia/Bangkok)",
    image: {
      src: "/logo-image/supportpal-logo.png",
      alt: "SupportPal logo",
    },
    gradient: "from-[#e8f1ff] to-white",
  },
];

const createEmptyStats = () => ({
  total: 0,
  confirmed: 0,
  pending: 0,
  pendingNames: [],
  confirmedNames: [],
});

const createInitialStats = () => ({
  wordpress: createEmptyStats(),
  supportpal: createEmptyStats(),
});

const truthyStrings = new Set([
  "true",
  "1",
  "t",
  "y",
  "yes",
  "done",
  "complete",
  "completed",
  "confirmed",
]);

const falsyStrings = new Set(["false", "0", "f", "n", "no", "pending", "incomplete"]);

const normaliseConfirmation = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();

    if (truthyStrings.has(normalised)) {
      return true;
    }

    if (falsyStrings.has(normalised)) {
      return false;
    }
  }

  return false;
};

const deriveSiteName = (site, index) => {
  if (site?.name && typeof site.name === "string" && site.name.trim()) {
    return site.name.trim();
  }

  if (site?.url && typeof site.url === "string" && site.url.trim()) {
    return site.url.trim();
  }

  return `Entry ${index + 1}`;
};

const buildMaintenanceStats = (sites = []) => {
  const stats = createEmptyStats();
  const list = Array.isArray(sites) ? sites : [];

  stats.total = list.length;

  list.forEach((site, index) => {
    const rawStatus = site?.isConfirmed ?? site?.is_confirmed;
    const isConfirmed = normaliseConfirmation(rawStatus);
    const displayName = deriveSiteName(site, index);

    if (isConfirmed) {
      stats.confirmed += 1;
      stats.confirmedNames.push(displayName);
      return;
    }

    stats.pending += 1;
    stats.pendingNames.push(displayName);
  });

  return stats;
};

const extractErrorMessage = (error, fallbackMessage) => {
  if (!error) {
    return fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallbackMessage;
};

const summariseNames = (names = [], limit = 4) => {
  if (!Array.isArray(names) || names.length === 0) {
    return [];
  }

  const trimmed = names
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter(Boolean);

  if (trimmed.length <= limit) {
    return trimmed;
  }

  const visible = trimmed.slice(0, limit - 1);
  const remaining = trimmed.length - visible.length;

  return [...visible, `+${remaining} more`];
};

const getCompletionPercentage = (confirmed, total) => {
  if (!total) {
    return 0;
  }

  const percentage = Math.round((confirmed / total) * 100);
  return Math.min(100, Math.max(0, percentage));
};

const ProgressRing = ({ confirmed, total, label, size = 88 }) => {
  const percentage = getCompletionPercentage(confirmed, total);
  const innerOffset = Math.max(6, Math.round(size * 0.2));

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        label || `${confirmed} of ${total || 0} maintenance tasks confirmed (${percentage}%)`
      }
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#22c55e ${percentage}%, rgba(148, 163, 184, 0.35) ${percentage}% 100%)`,
        }}
      />
      <div
        className="absolute rounded-full bg-white"
        style={{ inset: innerOffset }}
        aria-hidden
      />
      <span className="relative text-xs font-semibold text-slate-900">
        {confirmed}/{total || 0}
      </span>
    </div>
  );
};

const PlatformSummaryCard = ({ service, stats, error, isLoading }) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-28 rounded-full bg-slate-100" />
            <div className="h-3 w-40 rounded-full bg-slate-100" />
            <div className="h-3 w-24 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 shadow-sm">
        <p className="font-semibold">{service.name}</p>
        <p className="mt-1 leading-relaxed">{error}</p>
        <p className="mt-2 text-xs text-amber-600">
          Open the {service.name} workspace to retry loading maintenance status.
        </p>
      </div>
    );
  }

  const { total, confirmed, pending, pendingNames, confirmedNames } = stats;
  const pendingDisplay = summariseNames(pendingNames);
  const confirmedDisplay = summariseNames(confirmedNames);
  const percentage = getCompletionPercentage(confirmed, total);

  const statusMessage = (() => {
    if (!total) {
      return "No maintenance records yet.";
    }

    if (pending === 0) {
      return "All maintenance confirmed.";
    }

    return `${pending} awaiting confirmation.`;
  })();

  return (
    <div className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <ProgressRing
          confirmed={confirmed}
          total={total}
          label={`${service.name}: ${confirmed} of ${total || 0} confirmed (${percentage}%)`}
          size={80}
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{service.name}</p>
          <p className="mt-1 text-xs text-slate-600">{statusMessage}</p>
          <p className="mt-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">{confirmed}</span> confirmed ·{" "}
            <span className="font-semibold text-amber-600">{pending}</span> pending
          </p>

          {pendingDisplay.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Waiting for confirmation
              </p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {pendingDisplay.map((name, index) => (
                  <li
                    key={`${service.key}-pending-${index}`}
                    className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {confirmedDisplay.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Completed confirmations
              </p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {confirmedDisplay.map((name, index) => (
                  <li
                    key={`${service.key}-confirmed-${index}`}
                    className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();

  const [maintenanceStats, setMaintenanceStats] = useState(() => createInitialStats());
  const [maintenanceErrors, setMaintenanceErrors] = useState({ wordpress: null, supportpal: null });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const greetingName = [user?.firstname, user?.username, user?.email].find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  const safeGreeting = greetingName ? greetingName.trim() : "";

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      setIsLoadingStats(true);

      const [wpResult, spResult] = await Promise.allSettled([
        fetchWordpressSites(),
        fetchSupportpalSites(),
      ]);

      if (!isMounted) {
        return;
      }

      const nextStats = createInitialStats();
      const nextErrors = { wordpress: null, supportpal: null };

      if (wpResult.status === "fulfilled") {
        nextStats.wordpress = buildMaintenanceStats(wpResult.value);
      } else {
        nextErrors.wordpress = extractErrorMessage(
          wpResult.reason,
          "Unable to load WordPress maintenance status."
        );
      }

      if (spResult.status === "fulfilled") {
        nextStats.supportpal = buildMaintenanceStats(spResult.value);
      } else {
        nextErrors.supportpal = extractErrorMessage(
          spResult.reason,
          "Unable to load SupportPal maintenance status."
        );
      }

      setMaintenanceStats(nextStats);
      setMaintenanceErrors(nextErrors);
      setIsLoadingStats(false);
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const aggregatedStats = useMemo(
    () =>
      Object.values(maintenanceStats).reduce(
        (acc, stats) => {
          acc.total += stats.total;
          acc.confirmed += stats.confirmed;
          acc.pending += stats.pending;
          return acc;
        },
        { total: 0, confirmed: 0, pending: 0 }
      ),
    [maintenanceStats]
  );

  const aggregatedPercentage = getCompletionPercentage(
    aggregatedStats.confirmed,
    aggregatedStats.total
  );

  const aggregatedMessage = useMemo(() => {
    if (isLoadingStats) {
      return "Loading maintenance progress…";
    }

    if (!aggregatedStats.total) {
      return "Add your first maintenance record to begin tracking progress.";
    }

    if (aggregatedStats.pending === 0) {
      return "All maintenance across WordPress and SupportPal is confirmed.";
    }

    const plural = aggregatedStats.pending === 1 ? "" : "s";
    return `${aggregatedStats.pending} pending confirmation${plural} across all platforms.`;
  }, [aggregatedStats, isLoadingStats]);

  const getServiceStatus = (serviceKey) => {
    const stats = maintenanceStats[serviceKey] ?? createEmptyStats();

    if (isLoadingStats) {
      return {
        type: "loading",
        headline: "Loading status…",
        description: "",
        stats,
      };
    }

    const error = maintenanceErrors[serviceKey];
    if (error) {
      return {
        type: "error",
        headline: "Status unavailable",
        description: error,
        stats,
      };
    }

    if (!stats.total) {
      return {
        type: "info",
        headline: "No maintenance records yet.",
        description: "Start by adding a site to begin tracking progress.",
        stats,
      };
    }

    if (stats.pending === 0) {
      return {
        type: "success",
        headline: "All maintenance confirmed.",
        description: "Everything is up to date for this cycle.",
        stats,
      };
    }

    const plural = stats.pending === 1 ? "" : "s";
    return {
      type: "warning",
      headline: `${stats.pending} pending confirmation${plural}.`,
      description: "Review outstanding records before you proceed.",
      stats,
    };
  };

  const statusToneToDot = {
    loading: "bg-slate-300",
    error: "bg-amber-600",
    info: "bg-slate-400",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
  };

  return (
    <PageContainer
      meta="Maintenance workspace"
      title={`Welcome back${safeGreeting ? ", " + safeGreeting : ""}!`}
      description="Choose the platform you would like to maintain. Everything shares the same visual language so you can move between systems with confidence."
      actions={
        <div className="rounded-2xl bg-white/70 px-6 py-4 text-sm text-slate-600 shadow-sm backdrop-blur">
          <p className="font-semibold text-[#316fb7]">Today&apos;s reminder</p>
          <p className="mt-1 leading-relaxed">
            Confirm WordPress updates by Monday midnight and SupportPal updates by the first of each
            month. Keeping confirmations up to date helps everyone stay in sync.
          </p>
        </div>
      }
      maxWidth="max-w-6xl"
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur">
            <h2 className="text-2xl font-semibold text-slate-900">Your maintenance hub</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Stay on top of every release cycle with a unified, familiar interface. Jump directly
              into a platform or review the combined health metrics from the dashboard.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#316fb7]">
                  Quick access
                </p>
                <p className="mt-2 font-medium text-slate-900">Dashboard overview</p>
                <p className="mt-1 text-slate-600">See confirmations and pending work in one place.</p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex items-center justify-start text-sm font-semibold text-[#316fb7] hover:text-[#254d85]"
                >
                  Go to dashboard →
                </Link>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#316fb7]">
                  Need a hand?
                </p>
                <p className="mt-2 font-medium text-slate-900">Team contacts</p>
                <p className="mt-1 text-slate-600">
                  Reach the platform lead directly from the admin panel.
                </p>
                <Link
                  href="/admin"
                  className="mt-3 inline-flex items-center justify-start text-sm font-semibold text-[#316fb7] hover:text-[#254d85]"
                >
                  Manage users →
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur">
            <h3 className="text-xl font-semibold text-slate-900">Today&apos;s maintenance status</h3>
            <p className="mt-2 text-sm text-slate-600">
              Review outstanding confirmations before diving into a specific platform.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-6">
              {isLoadingStats ? (
                <>
                  <div className="h-20 w-20 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-48 rounded-full bg-slate-100" />
                    <div className="h-3 w-60 rounded-full bg-slate-100" />
                  </div>
                </>
              ) : (
                <>
                  <ProgressRing
                    confirmed={aggregatedStats.confirmed}
                    total={aggregatedStats.total}
                    label={`Overall: ${aggregatedStats.confirmed} of ${
                      aggregatedStats.total || 0
                    } confirmed (${aggregatedPercentage}%)`}
                    size={96}
                  />
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {aggregatedStats.confirmed}/{aggregatedStats.total || 0} tasks confirmed
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{aggregatedMessage}</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {SERVICES.map((service) => (
                <PlatformSummaryCard
                  key={service.key}
                  service={service}
                  stats={maintenanceStats[service.key] ?? createEmptyStats()}
                  error={maintenanceErrors[service.key]}
                  isLoading={isLoadingStats}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-lg backdrop-blur">
          <h3 className="text-lg font-semibold text-slate-900">Maintenance at a glance</h3>
          <ul className="mt-5 space-y-4 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#316fb7]" />
              <div>
                <p className="font-medium text-slate-900">Consistent theme</p>
                <p className="mt-1 leading-relaxed text-slate-600">
                  Every screen shares the same layout language for predictable navigation.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#316fb7]" />
              <div>
                <p className="font-medium text-slate-900">Quick confirmation cues</p>
                <p className="mt-1 leading-relaxed text-slate-600">
                  Status pills and grouped notes help highlight what still requires attention.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {SERVICES.map((service) => {
          const status = getServiceStatus(service.key);
          const stats = status.stats ?? maintenanceStats[service.key] ?? createEmptyStats();
          const dotColor = statusToneToDot[status.type] || "bg-slate-300";

          return (
            <Link key={service.name} href={service.href} className="group">
              <article
                className={`relative h-full overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br ${service.gradient} p-8 shadow-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow">
                    <Image
                      src={service.image.src}
                      alt={service.image.alt}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">{service.name}</h3>
                    <p className="mt-1 text-sm font-medium text-[#316fb7]">{service.badge}</p>
                  </div>
                </div>
                <p className="mt-5 text-base leading-relaxed text-slate-600">
                  {service.description}
                </p>

                <div className="mt-6">
                  {status.type === "loading" ? (
                    <div className="h-6 w-36 animate-pulse rounded-full bg-white/60" />
                  ) : (
                    <div className="inline-flex flex-col gap-1 rounded-2xl bg-white/70 p-3 text-xs text-slate-700 shadow-sm backdrop-blur">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                        {status.headline}
                      </div>
                      {status.description && (
                        <p className="text-xs text-slate-600">{status.description}</p>
                      )}
                      {status.type !== "error" && (
                        <p className="text-xs text-slate-500">
                          {stats.confirmed}/{stats.total || 0} confirmed
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#316fb7] transition-colors group-hover:text-[#254d85]">
                  Open workspace →
                </span>
              </article>
            </Link>
          );
        })}
      </section>
    </PageContainer>
  );
};

export default Home;
