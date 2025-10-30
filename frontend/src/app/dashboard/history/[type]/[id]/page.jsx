"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";

import PageContainer from "../../../../components/PageContainer";
import { fetchSupportpalSites, fetchWordpressSites } from "../../../../lib/api";
import {
  buildMaintenanceRecords,
  formatDateTime,
  normaliseSupportpalSites,
  normaliseWordpressSites,
} from "@/app/dashboard/dataUtils";
import {
  decodeParamSegment,
  recordMatchesParams,
  toTypeSlug,
} from "../../utils";

const ChangeDetailsList = ({ details }) => {
  if (!Array.isArray(details) || details.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No additional change details for the latest cycle
      </p>
    );
  }

  return (
    <dl className="space-y-3">
      {details.map((detail, index) => {
        const key = detail.field || `${detail.label}-${index}`;
        const previous = detail.previous && detail.previous.length > 0 ? detail.previous : null;
        const current = detail.current && detail.current.length > 0 ? detail.current : null;
        let value = "Updated";

        if (previous && current) {
          value = previous === current ? current : `${previous} → ${current}`;
        } else if (current) {
          value = current;
        } else if (previous) {
          value = previous;
        }

        return (
          <div
            key={key}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
          >
            <dt className="font-semibold text-slate-800">{detail.label}</dt>
            <dd className="mt-1 text-slate-600">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
};

const VersionDetailsList = ({ details, fallback }) => {
  if (Array.isArray(details) && details.length > 0) {
    return (
      <dl className="mt-4 space-y-3 text-sm text-slate-600">
        {details.map((detail, index) => {
          const key = detail.label ? `${detail.label}-${index}` : `version-${index}`;
          const value = detail.value && detail.value.length > 0 ? detail.value : "-";

          return (
            <div key={key} className="flex flex-col gap-1">
              <dt className="font-medium text-slate-500">{detail.label}</dt>
              <dd className="text-slate-900">{value}</dd>
            </div>
          );
        })}
      </dl>
    );
  }

  const fallbackText = fallback && fallback.length > 0 ? fallback : "No version data";

  return <p className="mt-4 text-sm text-slate-500">{fallbackText}</p>;
};

const MaintenanceRecordDetailPage = ({ params }) => {
  const resolvedParams =
    params && typeof params.then === "function" ? use(params) : params;
  const [data, setData] = useState({ wordpress: [], supportpal: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const typeParam = toTypeSlug(decodeParamSegment(resolvedParams?.type));
  const idParam = decodeParamSegment(resolvedParams?.id);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [wordpressResult, supportpalResult] = await Promise.allSettled([
      fetchWordpressSites(),
      fetchSupportpalSites(),
    ]);

    const nextData = {
      wordpress:
        wordpressResult.status === "fulfilled"
          ? normaliseWordpressSites(wordpressResult.value)
          : [],
      supportpal:
        supportpalResult.status === "fulfilled"
          ? normaliseSupportpalSites(supportpalResult.value)
          : [],
    };

    const encounteredErrors = [];

    if (wordpressResult.status === "rejected") {
      console.error("Unable to load WordPress sites:", wordpressResult.reason);
      encounteredErrors.push("Unable to load WordPress data.");
    }

    if (supportpalResult.status === "rejected") {
      console.error("Unable to load SupportPal sites:", supportpalResult.reason);
      encounteredErrors.push("Unable to load SupportPal data.");
    }

    setData(nextData);

    if (wordpressResult.status === "fulfilled" || supportpalResult.status === "fulfilled") {
      setLastUpdated(new Date());
    } else {
      setLastUpdated(null);
    }

    setError(encounteredErrors.length > 0 ? encounteredErrors.join(" ") : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const combinedRecords = useMemo(
    () => buildMaintenanceRecords(data.wordpress, data.supportpal),
    [data],
  );

  const selectedRecord = useMemo(
    () =>
      combinedRecords.find((record) => recordMatchesParams(record, typeParam, idParam)),
    [combinedRecords, typeParam, idParam],
  );

  const pageTitle = selectedRecord ? selectedRecord.name : "System details";
  const pageDescription = selectedRecord
    ? `Review maintenance history and updates for ${selectedRecord.type}`
    : "Fetching the selected record";

  const lastCheckedLabel = selectedRecord
    ? formatDateTime(selectedRecord.lastCheckedDate)
    : "-";

  const confirmationLabel = selectedRecord
    ? selectedRecord.isConfirmed
      ? "Confirmed for the current cycle"
      : "Not yet confirmed this cycle"
    : "";

  return (
    <PageContainer
      title={pageTitle}
      description={pageDescription}
      actions={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          {lastUpdated && (
            <span className="text-sm text-slate-600">
              Last updated {formatDateTime(lastUpdated)}
            </span>
          )}
          <Link
            href="/dashboard/history"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Back to list
          </Link>
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-[#316fb7] bg-[#316fb7] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245c94] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      }
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-5 text-red-700 shadow-sm">
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      )}

      {isLoading && !selectedRecord ? (
        <div className="mt-6 space-y-4">
          <div className="h-6 w-64 animate-pulse rounded bg-slate-200/80" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-200/70" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200/70" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/70" />
        </div>
      ) : selectedRecord ? (
        <section className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-medium ${
                    selectedRecord.type === "WordPress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {selectedRecord.type}
                </span>
                <h2 className="text-xl font-semibold text-slate-900">{selectedRecord.name}</h2>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p className="font-medium uppercase tracking-wide text-slate-500">
                  Last updated
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {selectedRecord.lastActivityLabel || "No history yet"}
                </p>
              </div>
            </div>
            {selectedRecord.url && (
              <a
                href={selectedRecord.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm text-[#316fb7] hover:underline"
              >
                {selectedRecord.url}
              </a>
            )}
            <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-500">System status</dt>
                <dd className="mt-1 text-slate-900">{selectedRecord.status || "Unknown"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Last checked</dt>
                <dd className="mt-1 text-slate-900">{lastCheckedLabel}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Maintenance confirmation</dt>
                <dd className="mt-1 text-slate-900">{confirmationLabel}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Reference ID</dt>
                <dd className="mt-1 text-slate-900">{selectedRecord.id}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Version details</h3>
            <VersionDetailsList
              details={selectedRecord.versionDetails}
              fallback={selectedRecord.versionLabel || selectedRecord.version}
            />
          </div>

          {selectedRecord.changeSummary && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Latest change summary</h3>
              <p className="mt-2 text-sm text-slate-600">{selectedRecord.changeSummary}</p>
            </div>
          )}

          {selectedRecord.maintenanceNotes && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-amber-900">Maintenance notes</h3>
              <p className="mt-2 text-sm text-amber-800 leading-relaxed">
                {selectedRecord.maintenanceNotes}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Change log details</h3>
            <p className="mt-2 text-sm text-slate-500">
              Entries reflect the most recent detected changes. If multiple updates occurred, they follow the order reported by the system.
            </p>
            <div className="mt-4">
              <ChangeDetailsList details={selectedRecord.changeDetails} />
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm text-slate-600">
            The selected record could not be found. It may have been removed or the reference ID may have changed.
          </p>
        </div>
      )}
    </PageContainer>
  );
};

export default MaintenanceRecordDetailPage;
