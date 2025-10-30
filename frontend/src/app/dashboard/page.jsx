"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchSupportpalSites, fetchWordpressSites } from "../lib/api";
import PageContainer from "../components/PageContainer";
import {
  TIME_ZONE,
  formatDateTime,
  normaliseSupportpalSites,
  normaliseWordpressSites,
} from "./dataUtils";

const WORDPRESS_SCHEDULE_DESCRIPTION =
  "Weekly maintenance — resets every Monday at 00:00 (Asia/Bangkok).";
const SUPPORTPAL_SCHEDULE_DESCRIPTION =
  "Monthly maintenance — resets on the 1st day of each month at 00:00 (Asia/Bangkok).";

const ATTENTION_STATUS_KEYS = new Set([
  "warning",
  "degraded",
  "maintenance",
  "pending",
  "critical",
  "incident",
  "offline",
  "down",
]);

const HEALTHY_STATUS_KEYS = new Set(["healthy", "success", "operational"]);

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

const ProgressSummaryCard = ({ label, stats }) => {
  const percentComplete = stats.total
    ? Math.round((stats.confirmed / stats.total) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {label}
          </h3>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {stats.confirmed} / {stats.total}
          </p>
          <p className="text-sm text-gray-500">Confirmed this cycle</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {percentComplete}% complete
        </span>
      </div>

      <div className="mt-4 h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-[#316fb7] transition-all"
          style={{ width: `${Math.min(percentComplete, 100)}%` }}
        />
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
        <div>
          <dt className="text-gray-400">Pending review</dt>
          <dd className="font-semibold text-gray-900">{stats.pending}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Last confirmation</dt>
          <dd className="font-medium text-gray-900">
            {stats.lastConfirmed ? formatDateTime(stats.lastConfirmed) : "No confirmations"}
          </dd>
        </div>
      </dl>
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

  const hasAnyData =
    data.wordpress.length > 0 || data.supportpal.length > 0;

  const statusOverview = useMemo(() => {
    const combined = [...data.wordpress, ...data.supportpal];

    return combined.reduce(
      (accumulator, site) => {
        const key =
          typeof site.status === "string"
            ? site.status.trim().toLowerCase()
            : "";

        if (!key) {
          accumulator.unknown += 1;
          return accumulator;
        }

        if (ATTENTION_STATUS_KEYS.has(key)) {
          accumulator.needsAttention += 1;
          return accumulator;
        }

        if (HEALTHY_STATUS_KEYS.has(key)) {
          accumulator.operational += 1;
          return accumulator;
        }

        accumulator.unknown += 1;
        return accumulator;
      },
      { needsAttention: 0, operational: 0, unknown: 0 }
    );
  }, [data.supportpal, data.wordpress]);

  const totalTracked = data.wordpress.length + data.supportpal.length;
  const totalConfirmed =
    wordpressStats.confirmed + supportpalStats.confirmed;
  const totalPending = Math.max(totalTracked - totalConfirmed, 0);
  const percentComplete = totalTracked
    ? Math.round((totalConfirmed / totalTracked) * 100)
    : 0;

  return (
    <PageContainer
      meta="Systems overview"
      title="Maintenance dashboard"
      description="Track confirmed updates and outstanding maintenance work across WordPress and SupportPal environments."
      actions={(
        <>
          {lastUpdated && (
            <span className="text-sm text-slate-600">
              Last refreshed {formatDateTime(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-[#316fb7] bg-white/80 px-5 py-2 text-sm font-semibold text-[#316fb7] shadow-sm transition hover:bg-[#316fb7]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </>
      )}
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-5 text-red-700 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {isLoading && !hasAnyData ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200/80" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-slate-200/80" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200/80" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/80" />
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

          <section className="mt-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Current cycle overview
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Track confirmation progress and quickly understand which environments may need follow-up.
              </p>

              {totalTracked ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <ProgressSummaryCard
                    label="WordPress"
                    stats={wordpressStats}
                  />
                  <ProgressSummaryCard
                    label="SupportPal"
                    stats={supportpalStats}
                  />
                </div>
              ) : (
                <EmptyState message="No maintenance records are currently tracked." />
              )}

              {totalTracked > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Overall completion
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {totalConfirmed} / {totalTracked}
                    </p>
                    <p className="text-sm text-slate-600">
                      {percentComplete}% of systems confirmed this cycle
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Pending reviews
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{totalPending}</p>
                    <p className="text-sm text-slate-600">
                      Awaiting confirmation on the next maintenance check
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Status snapshot
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      <li className="flex items-center justify-between">
                        <span>Operational</span>
                        <span className="font-semibold text-slate-900">
                          {statusOverview.operational}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Needs attention</span>
                        <span className="font-semibold text-slate-900">
                          {statusOverview.needsAttention}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Unknown</span>
                        <span className="font-semibold text-slate-900">
                          {statusOverview.unknown}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="mt-8">
            <div className="rounded-2xl border border-dashed border-[#316fb7]/40 bg-[#f5f9ff] p-6 text-[#1f4c7a]">
              <h2 className="text-lg font-semibold">Need deeper details?</h2>
              <p className="mt-2 text-sm">
                Review change logs, version breakdowns, and historical confirmations on the maintenance log page.
              </p>
              <Link
                href="/dashboard/history"
                className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#316fb7] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245c94]"
              >
                Open maintenance log
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
};

export default DashboardPage;
