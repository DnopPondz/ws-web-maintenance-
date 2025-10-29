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

const SummaryCard = ({ title, schedule, stats }) => {
  const lastConfirmedLabel = stats.lastConfirmed
    ? formatDateTime(stats.lastConfirmed)
    : "No confirmations yet";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <p className="mt-1 text-xs text-gray-400">{schedule}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-3xl font-bold text-gray-900">{stats.confirmed}</p>
          <p className="text-sm text-gray-500">Confirmed this cycle</p>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
          <div>
            <dt className="text-gray-400">Total tracked</dt>
            <dd className="font-semibold text-gray-900">{stats.total}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Pending review</dt>
            <dd className="font-semibold text-gray-900">{stats.pending}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-400">Last confirmation</dt>
            <dd className="font-medium text-gray-900">{lastConfirmedLabel}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

const EmptyState = ({ message }) => (
  <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
    {message}
  </div>
);

const ChangeDetails = ({ details, summary }) => {
  const hasDetails = Array.isArray(details) && details.length > 0;
  const [isExpanded, setIsExpanded] = useState(false);

  if (!hasDetails) {
    if (summary) {
      return <p className="mt-3 text-sm text-gray-500">{summary}</p>;
    }

    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded((previous) => !previous);
  };

  return (
    <div className="mt-3 space-y-2">
      {summary && <p className="text-sm text-gray-500">{summary}</p>}

      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        className="inline-flex items-center gap-1 text-sm font-semibold text-[#316fb7] transition-colors hover:text-[#245c94]"
      >
        {isExpanded
          ? "Hide change details"
          : `Show change details (${details.length})`}
        <span aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <dl className="space-y-2 text-sm text-gray-600">
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
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="font-medium text-gray-500">{detail.label}</dt>
                <dd className="text-gray-700">{valueLabel}</dd>
              </div>
            );
          })}
        </dl>
      )}
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

  return (
    <div className="space-y-6 bg-gray-50 p-6">
      <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track confirmed updates and outstanding maintenance work across WordPress and SupportPal environments.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last refreshed {formatDateTime(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#316fb7] px-4 py-2 text-sm font-semibold text-[#316fb7] transition-colors hover:bg-[#316fb7]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {isLoading && !hasAnyData ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ) : (
        <>
          <section>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SummaryCard
                title="WordPress maintenance"
                schedule={WORDPRESS_SCHEDULE_DESCRIPTION}
                stats={wordpressStats}
              />
              <SummaryCard
                title="SupportPal maintenance"
                schedule={SUPPORTPAL_SCHEDULE_DESCRIPTION}
                stats={supportpalStats}
              />
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Upcoming resets
                </h2>
                <ul className="mt-4 space-y-3 text-sm text-gray-700">
                  <li>
                    <span className="font-semibold text-gray-900">WordPress:</span>{" "}
                    Resets every Monday at 00:00 ({TIME_ZONE})
                  </li>
                  <li>
                    <span className="font-semibold text-gray-900">SupportPal:</span>{" "}
                    Resets on the 1st day of each month at 00:00 ({TIME_ZONE})
                  </li>
                </ul>
                <p className="mt-4 text-xs text-gray-500">
                  Confirmed updates remain visible here until the next scheduled reset for each platform.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent confirmed updates
                </h2>
                <p className="text-sm text-gray-600">
                  WordPress confirmations reset weekly, while SupportPal confirmations reset monthly.
                </p>
              </div>
            </div>

            {combinedConfirmed.length ? (
              <ul className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {combinedConfirmed.map((item) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            item.type === "WordPress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {item.type}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900">
                          {item.name}
                        </h3>
                      </div>
                      {item.maintenanceNotes && (
                        <p className="mt-1 text-sm text-gray-600">
                          {item.maintenanceNotes}
                        </p>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-sm text-[#316fb7] hover:underline"
                        >
                          {item.url}
                        </a>
                      )}
                      <ChangeDetails
                        details={item.changeDetails}
                        // summary={item.changeSummary}
                      />
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm text-gray-500 sm:items-end">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {formatStatusLabel(item.status)}
                      </span>
                      <span>
                        Confirmed {formatDateTime(item.lastCheckedDate)}
                      </span>
                      {item.changeDetectedAt && (
                        <span>
                          Changes recorded {formatDateTime(item.changeDetectedAt)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No confirmed updates have been recorded for the current maintenance cycles yet." />
            )}
          </section>

          <section>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Pending follow-up
              </h2>
              <p className="text-sm text-gray-600">
                Websites and servers that still need to be reviewed and confirmed for this maintenance cycle.
              </p>
            </div>

            {pendingItems.length ? (
              <ul className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {pendingItems.map((item) => (
                  <li
                    key={`pending-${item.type}-${item.id}`}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            item.type === "WordPress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {item.type}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900">
                          {item.name}
                        </h3>
                      </div>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-sm text-[#316fb7] hover:underline"
                        >
                          {item.url}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm text-gray-500 sm:items-end">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {formatStatusLabel(item.status)}
                      </span>
                      <span>
                        {item.lastCheckedDate
                          ? `Last checked ${formatDateTime(item.lastCheckedDate)}`
                          : "Awaiting first check"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="All tracked systems have been confirmed for the current maintenance schedules." />
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
