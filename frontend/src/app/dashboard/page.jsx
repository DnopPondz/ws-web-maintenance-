"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PageContainer from "../components/PageContainer";
import { fetchSupportpalSites, fetchWordpressSites } from "../lib/api";

const quickLinks = [
  {
    title: "Maintenance log",
    description:
      "Review every update recorded for each platform, including version history and maintenance notes.",
    href: "/dashboard/history",
    icon: "history",
  },
  {
    title: "WordPress platform",
    description:
      "Inspect all active plugins, themes, and WordPress versions from a single workspace.",
    href: "/WordPress",
    icon: "language",
  },
  {
    title: "SupportPal platform",
    description:
      "Track SupportPal health, confirmation status, and maintenance records across every branch.",
    href: "/Supportpal",
    icon: "support_agent",
  },
];

const PLATFORMS = [
  { key: "wordpress", name: "WordPress" },
  { key: "supportpal", name: "SupportPal" },
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
      aria-label={label || `${confirmed} of ${total || 0} maintenance tasks confirmed (${percentage}%)`}
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

const PlatformSummaryCard = ({ platform, stats, error, isLoading }) => {
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
        <p className="font-semibold">{platform.name}</p>
        <p className="mt-1 leading-relaxed">{error}</p>
        <p className="mt-2 text-xs text-amber-600">
          Open the {platform.name} workspace to retry loading maintenance status.
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
          label={`${platform.name}: ${confirmed} of ${total || 0} confirmed (${percentage}%)`}
          size={80}
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{platform.name}</p>
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
                    key={`${platform.key}-pending-${index}`}
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
                    key={`${platform.key}-confirmed-${index}`}
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

const NavigatorCard = ({ title, description, href, icon }) => (
  <Link
    href={href}
    className="group block rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#316fb7]"
  >
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#316fb7]/10 text-2xl text-[#316fb7]">
        <span className="material-icons" aria-hidden>
          {icon}
        </span>
      </span>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </div>
    <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#316fb7]">
      Open this section
      <span aria-hidden className="transition group-hover:translate-x-0.5">
        →
      </span>
    </span>
  </Link>
);

const DashboardPage = () => {
  const [maintenanceStats, setMaintenanceStats] = useState(() => createInitialStats());
  const [maintenanceErrors, setMaintenanceErrors] = useState({ wordpress: null, supportpal: null });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

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

  return (
    <PageContainer
      meta="Navigator"
      title="Maintenance workspace"
      description="Pick a destination to begin maintenance work right away."
    >
      <section className="rounded-3xl bg-gradient-to-br from-[#1e3a64] via-[#1a2e52] to-[#13213c] p-8 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
          Welcome back, Admin!
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          Choose the platform you want to maintain today
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-white/80">
          This page serves as a shortcut to every part of the maintenance ecosystem—select a destination and start reviewing
          without repeating the same searches.
        </p>
      </section>

      <section className="mt-8 rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {isLoadingStats ? (
              <div className="h-24 w-24 animate-pulse rounded-full bg-slate-100" />
            ) : (
              <ProgressRing
                confirmed={aggregatedStats.confirmed}
                total={aggregatedStats.total}
                label={`Overall: ${aggregatedStats.confirmed} of ${aggregatedStats.total || 0} confirmed (${aggregatedPercentage}%)`}
                size={110}
              />
            )}
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Today&apos;s maintenance status</h3>
              <p className="mt-1 text-sm text-slate-600">
                Review outstanding confirmations before diving into a specific platform.
              </p>
              <p className="mt-3 text-sm text-slate-900">
                <span className="font-semibold text-emerald-600">{aggregatedStats.confirmed}</span>
                /{aggregatedStats.total || 0} tasks confirmed
              </p>
              <p className="mt-1 text-sm text-slate-600">{aggregatedMessage}</p>
            </div>
          </div>

          <div className="grid flex-1 gap-4 md:grid-cols-2">
            {PLATFORMS.map((platform) => (
              <PlatformSummaryCard
                key={platform.key}
                platform={platform}
                stats={maintenanceStats[platform.key] ?? createEmptyStats()}
                error={maintenanceErrors[platform.key]}
                isLoading={isLoadingStats}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Core maintenance areas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Access the essential pages for reviewing records, confirmations, and follow-up tasks.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <NavigatorCard key={item.href} {...item} />
          ))}
        </div>
      </section>
    </PageContainer>
  );
};

export default DashboardPage;
