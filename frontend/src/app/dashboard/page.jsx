"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchSupportpalSites, fetchWordpressSites } from "../lib/api";

const TIME_ZONE = "Asia/Bangkok";
const WORDPRESS_SCHEDULE_DESCRIPTION =
  "Weekly maintenance — resets every Monday at 00:00 (Asia/Bangkok).";
const SUPPORTPAL_SCHEDULE_DESCRIPTION =
  "Monthly maintenance — resets on the 1st day of each month at 00:00 (Asia/Bangkok).";

let dateFormatter;

const getDateFormatter = () => {
  if (!dateFormatter) {
    dateFormatter = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: TIME_ZONE,
    });
  }

  return dateFormatter;
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return getDateFormatter().format(date);
};

const toBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();

    return ["true", "1", "t", "y", "yes"].includes(normalised);
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
};

const getValidDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const normaliseNotes = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value);
};

const deriveId = (site, index) => {
  const candidates = [site?._id, site?.id, site?.uuid];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return String(candidate);
    }
  }

  return String(index + 1);
};

const normaliseChangeDetails = (rawDetails) => {
  if (!Array.isArray(rawDetails)) {
    return [];
  }

  return rawDetails
    .map((detail, index) => {
      const field = detail?.field ? String(detail.field) : undefined;
      const labelCandidates = [detail?.label, detail?.field];
      const labelSource = labelCandidates.find(
        (candidate) => typeof candidate === "string" && candidate.trim()
      );
      const label = labelSource ? labelSource.trim() : `Change ${index + 1}`;

      const normaliseValue = (value) => {
        if (value === undefined || value === null) {
          return "";
        }

        if (typeof value === "string") {
          return value.trim();
        }

        return String(value).trim();
      };

      return {
        field,
        label,
        previous: normaliseValue(detail?.previous),
        current: normaliseValue(detail?.current),
      };
    })
    .filter((detail) => detail.label);
};

const normaliseWordpressSites = (sites = []) =>
  sites.map((site, index) => {
    const lastChecked = site?.lastChecked ?? site?.last_checked ?? null;
    const lastCheckedDate = getValidDate(lastChecked);
    const changeDetailsSource =
      site?.lastChangeDetails ?? site?.changeDetails ?? [];
    const changeDetectedAtSource =
      site?.lastChangeDetectedAt ?? site?.changeDetectedAt ?? null;
    const changeDetectedAtDate = getValidDate(changeDetectedAtSource);

    return {
      id: deriveId(site, index),
      name: site?.name || "Unnamed Site",
      url: site?.url || "",
      status: site?.status || "unknown",
      maintenanceNotes:
        normaliseNotes(site?.maintenanceNotes ?? site?.maintenance_notes),
      isConfirmed: toBoolean(site?.isConfirmed ?? site?.is_confirmed),
      lastChecked,
      lastCheckedDate,
      type: "WordPress",
      changeSummary:
        site?.lastChangeSummary ?? site?.changeSummary ?? "",
      changeDetails: normaliseChangeDetails(changeDetailsSource),
      changeDetectedAt: changeDetectedAtDate,
    };
  });

const normaliseSupportpalSites = (sites = []) =>
  sites.map((site, index) => {
    const lastChecked = site?.lastChecked ?? site?.last_checked ?? null;
    const lastCheckedDate = getValidDate(lastChecked);
    const changeDetailsSource =
      site?.lastChangeDetails ?? site?.changeDetails ?? [];
    const changeDetectedAtSource =
      site?.lastChangeDetectedAt ?? site?.changeDetectedAt ?? null;
    const changeDetectedAtDate = getValidDate(changeDetectedAtSource);

    return {
      id: deriveId(site, index),
      name: site?.name || "Unnamed Server",
      url: site?.url || "",
      status: site?.status || "unknown",
      maintenanceNotes:
        normaliseNotes(site?.maintenanceNotes ?? site?.maintenance_notes),
      isConfirmed: toBoolean(site?.isConfirmed ?? site?.is_confirmed),
      lastChecked,
      lastCheckedDate,
      type: "SupportPal",
      changeSummary:
        site?.lastChangeSummary ?? site?.changeSummary ?? "",
      changeDetails: normaliseChangeDetails(changeDetailsSource),
      changeDetectedAt: changeDetectedAtDate,
    };
  });

const STATUS_STYLES = {
  healthy: "bg-emerald-100 text-emerald-700",
  success: "bg-emerald-100 text-emerald-700",
  operational: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  degraded: "bg-amber-100 text-amber-700",
  maintenance: "bg-sky-100 text-sky-700",
  pending: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
  incident: "bg-red-100 text-red-700",
  offline: "bg-red-100 text-red-700",
  down: "bg-red-100 text-red-700",
};

const getStatusBadgeClass = (status) => {
  if (!status || typeof status !== "string") {
    return "bg-gray-200 text-gray-700";
  }

  const key = status.trim().toLowerCase();

  return STATUS_STYLES[key] || "bg-gray-200 text-gray-700";
};

const formatStatusLabel = (status) => {
  if (!status || typeof status !== "string") {
    return "Unknown";
  }

  return status
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const extractErrorMessage = (reason, fallback) => {
  if (!reason) {
    return fallback;
  }

  if (reason instanceof Error) {
    return reason.message || fallback;
  }

  if (typeof reason === "string") {
    return reason;
  }

  if (typeof reason === "object" && reason.message) {
    return reason.message;
  }

  return fallback;
};

const SummaryCard = ({ title, schedule, stats, accent }) => {
  const lastConfirmedLabel = stats.lastConfirmed
    ? formatDateTime(stats.lastConfirmed)
    : "No confirmations yet";
  const confirmationRate = stats.total
    ? Math.round((stats.confirmed / stats.total) * 100)
    : 0;

  return (
    <section className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${accent}`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{schedule}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {confirmationRate}% confirmed
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-6">
        <div className="flex items-end gap-4">
          <p className="text-4xl font-semibold text-slate-900">
            {stats.confirmed}
          </p>
          <span className="text-sm text-slate-500">Confirmed this cycle</span>
        </div>
        <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Total tracked</dt>
            <dd className="text-base font-semibold text-slate-900">
              {stats.total}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Pending review</dt>
            <dd className="text-base font-semibold text-slate-900">
              {stats.pending}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400">Last confirmation</dt>
            <dd className="text-sm font-medium text-slate-700">
              {lastConfirmedLabel}
            </dd>
          </div>
        </dl>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#316fb7] to-[#245c94]"
            style={{ width: `${Math.min(confirmationRate, 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
};

const StatsTile = ({ label, value, helper, tone = "bg-slate-100 text-slate-600" }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
    <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
    <p className="mt-1 text-sm text-slate-500">{helper}</p>
  </div>
);

const EmptyState = ({ message, compact = false }) => (
  <div
    className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500 ${
      compact ? "p-8" : "p-12"
    }`}
  >
    {message}
  </div>
);

const ChangeDetails = ({ details, summary }) => {
  const hasDetails = Array.isArray(details) && details.length > 0;
  const [isExpanded, setIsExpanded] = useState(false);

  if (!hasDetails) {
    if (summary) {
      return <p className="mt-4 text-sm text-slate-600">{summary}</p>;
    }

    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded((previous) => !previous);
  };

  return (
    <div className="mt-4">
      {summary && <p className="text-sm text-slate-600">{summary}</p>}
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60">
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-[#316fb7] transition hover:text-[#245c94]"
        >
          <span>
            {isExpanded
              ? "Hide maintenance change log"
              : `View maintenance change log (${details.length})`}
          </span>
          <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
        </button>
        {isExpanded && (
          <dl className="divide-y divide-slate-200 text-sm text-slate-600">
            {details.map((detail, index) => {
              const key = detail.field || `${detail.label}-${index}`;
              const hasPrevious = detail.previous && detail.previous.length > 0;
              const hasCurrent = detail.current && detail.current.length > 0;
              let valueLabel = "Updated";

              if (hasPrevious && hasCurrent) {
                valueLabel =
                  detail.previous === detail.current
                    ? detail.current
                    : `${detail.previous} → ${detail.current}`;
              } else if (hasCurrent) {
                valueLabel = detail.current;
              } else if (hasPrevious) {
                valueLabel = detail.previous;
              }

              return (
                <div key={key} className="grid gap-1 px-4 py-3 sm:grid-cols-[200px_1fr]">
                  <dt className="font-medium text-slate-500">{detail.label}</dt>
                  <dd className="text-slate-700">{valueLabel || "—"}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const [data, setData] = useState({ wordpress: [], supportpal: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isMountedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const [wpResult, spResult] = await Promise.allSettled([
      fetchWordpressSites(),
      fetchSupportpalSites(),
    ]);

    if (!isMountedRef.current) {
      return;
    }

    const nextData = {
      wordpress:
        wpResult.status === "fulfilled"
          ? normaliseWordpressSites(wpResult.value)
          : [],
      supportpal:
        spResult.status === "fulfilled"
          ? normaliseSupportpalSites(spResult.value)
          : [],
    };

    const encounteredErrors = [];

    if (wpResult.status === "rejected") {
      console.error("Failed to load WordPress maintenance data:", wpResult.reason);
      encounteredErrors.push(
        extractErrorMessage(
          wpResult.reason,
          "Unable to load WordPress maintenance data."
        )
      );
    }

    if (spResult.status === "rejected") {
      console.error(
        "Failed to load SupportPal maintenance data:",
        spResult.reason
      );
      encounteredErrors.push(
        extractErrorMessage(
          spResult.reason,
          "Unable to load SupportPal maintenance data."
        )
      );
    }

    setData(nextData);

    if (
      wpResult.status === "fulfilled" ||
      spResult.status === "fulfilled"
    ) {
      setLastUpdated(new Date());
    } else {
      setLastUpdated(null);
    }

    setError(encounteredErrors.length ? encounteredErrors.join(" ") : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const wordpressConfirmed = useMemo(
    () => data.wordpress.filter((site) => site.isConfirmed),
    [data.wordpress]
  );

  const supportpalConfirmed = useMemo(
    () => data.supportpal.filter((site) => site.isConfirmed),
    [data.supportpal]
  );

  const wordpressStats = useMemo(() => {
    const total = data.wordpress.length;
    const confirmed = wordpressConfirmed.length;
    const pending = Math.max(total - confirmed, 0);

    const lastConfirmed = wordpressConfirmed.reduce((latest, site) => {
      if (!site.lastCheckedDate) {
        return latest;
      }

      if (!latest) {
        return site.lastCheckedDate;
      }

      return site.lastCheckedDate > latest ? site.lastCheckedDate : latest;
    }, null);

    return { total, confirmed, pending, lastConfirmed };
  }, [data.wordpress, wordpressConfirmed]);

  const supportpalStats = useMemo(() => {
    const total = data.supportpal.length;
    const confirmed = supportpalConfirmed.length;
    const pending = Math.max(total - confirmed, 0);

    const lastConfirmed = supportpalConfirmed.reduce((latest, site) => {
      if (!site.lastCheckedDate) {
        return latest;
      }

      if (!latest) {
        return site.lastCheckedDate;
      }

      return site.lastCheckedDate > latest ? site.lastCheckedDate : latest;
    }, null);

    return { total, confirmed, pending, lastConfirmed };
  }, [data.supportpal, supportpalConfirmed]);

  const combinedConfirmed = useMemo(() => {
    const items = [...wordpressConfirmed, ...supportpalConfirmed];

    return items.sort((a, b) => {
      const aTime = a.lastCheckedDate ? a.lastCheckedDate.getTime() : 0;
      const bTime = b.lastCheckedDate ? b.lastCheckedDate.getTime() : 0;

      return bTime - aTime;
    });
  }, [wordpressConfirmed, supportpalConfirmed]);

  const pendingItems = useMemo(() => {
    const wordpressPending = data.wordpress
      .filter((site) => !site.isConfirmed)
      .map((site) => ({ ...site }));
    const supportpalPending = data.supportpal
      .filter((site) => !site.isConfirmed)
      .map((site) => ({ ...site }));

    return [...wordpressPending, ...supportpalPending].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [data.supportpal, data.wordpress]);

  const hasAnyData =
    data.wordpress.length > 0 || data.supportpal.length > 0;

  const totalSystems = data.wordpress.length + data.supportpal.length;
  const totalConfirmed = wordpressConfirmed.length + supportpalConfirmed.length;
  const totalPending = pendingItems.length;
  const changeLogEntries = combinedConfirmed.reduce((count, item) => {
    if (!Array.isArray(item.changeDetails)) {
      return count;
    }

    return count + item.changeDetails.length;
  }, 0);

  const mostRecentActivity = combinedConfirmed[0]?.lastCheckedDate
    ? combinedConfirmed[0].lastCheckedDate
    : combinedConfirmed[0]?.changeDetectedAt;
  const latestActivityLabel = mostRecentActivity
    ? formatDateTime(mostRecentActivity)
    : "Waiting for confirmations";

  const handleManualRefresh = useCallback(() => {
    if (isLoading) {
      return;
    }

    loadData();
  }, [isLoading, loadData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <header className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-sm md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#316fb7]">
              Maintenance overview
            </p>
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
              Dashboard
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Review the health of every managed system, keep track of confirmed maintenance, and spot what still needs your attention.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {lastUpdated && (
              <span className="text-sm text-slate-500">
                Synced {formatDateTime(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-[#316fb7] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245c94] focus:outline-none focus:ring-2 focus:ring-[#93c5fd] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm"
          >
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsTile
            label="Cycle coverage"
            value={`${totalConfirmed}/${totalSystems || 0}`}
            helper="Confirmed this cycle"
            tone="bg-emerald-100 text-emerald-700"
          />
          <StatsTile
            label="Pending reviews"
            value={totalPending}
            helper="Awaiting confirmation"
            tone="bg-amber-100 text-amber-700"
          />
          <StatsTile
            label="Change log entries"
            value={changeLogEntries}
            helper="Across recent confirmations"
            tone="bg-indigo-100 text-indigo-700"
          />
          <StatsTile
            label="Latest activity"
            value={latestActivityLabel}
            helper="Most recent confirmation"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SummaryCard
            title="WordPress maintenance"
            schedule={WORDPRESS_SCHEDULE_DESCRIPTION}
            stats={wordpressStats}
            accent="bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9]"
          />
          <SummaryCard
            title="SupportPal maintenance"
            schedule={SUPPORTPAL_SCHEDULE_DESCRIPTION}
            stats={supportpalStats}
            accent="bg-gradient-to-r from-emerald-400 to-emerald-600"
          />
        </section>

        {isLoading && !hasAnyData ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading maintenance data…
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Confirmed maintenance
                  </h2>
                  <p className="text-sm text-slate-600">
                    All systems confirmed for the current cycle, ordered by most recent activity.
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {combinedConfirmed.length} {combinedConfirmed.length === 1 ? "item" : "items"}
                </span>
              </div>

              {combinedConfirmed.length ? (
                <ul className="mt-6 space-y-4">
                  {combinedConfirmed.map((item) => (
                    <li
                      key={`${item.type}-${item.id}`}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-[#316fb7]/40 hover:bg-white hover:shadow-sm lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              item.type === "WordPress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.type}
                          </span>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {item.name}
                          </h3>
                        </div>
                        {item.maintenanceNotes && (
                          <p className="text-sm text-slate-600">
                            {item.maintenanceNotes}
                          </p>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-sm font-medium text-[#316fb7] hover:text-[#245c94] hover:underline"
                          >
                            {item.url}
                          </a>
                        )}
                        <ChangeDetails
                          details={item.changeDetails}
                          summary={item.changeSummary}
                        />
                      </div>
                      <div className="flex flex-col items-start gap-2 text-sm text-slate-600 lg:items-end">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {formatStatusLabel(item.status)}
                        </span>
                        <span className="font-medium text-slate-700">
                          Confirmed {formatDateTime(item.lastCheckedDate)}
                        </span>
                        {item.changeDetectedAt && (
                          <span>
                            Changes detected {formatDateTime(item.changeDetectedAt)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  message="No confirmed updates recorded for this cycle just yet."
                  compact
                />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Pending follow-up
                  </h2>
                  <p className="text-sm text-slate-600">
                    Systems that still need review and confirmation for the active maintenance window.
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {totalPending} {totalPending === 1 ? "item" : "items"}
                </span>
              </div>

              {pendingItems.length ? (
                <ul className="mt-6 space-y-4">
                  {pendingItems.map((item) => (
                    <li
                      key={`pending-${item.type}-${item.id}`}
                      className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 transition hover:border-[#316fb7]/40 hover:bg-white hover:shadow-sm lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              item.type === "WordPress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.type}
                          </span>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {item.name}
                          </h3>
                        </div>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-sm font-medium text-[#316fb7] hover:text-[#245c94] hover:underline"
                          >
                            {item.url}
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-2 text-sm text-slate-600 lg:items-end">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {formatStatusLabel(item.status)}
                        </span>
                        <span className="font-medium text-slate-700">
                          {item.lastCheckedDate
                            ? `Last checked ${formatDateTime(item.lastCheckedDate)}`
                            : "Awaiting first check"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  message="Everything tracked has been confirmed. Nice work!"
                  compact
                />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
