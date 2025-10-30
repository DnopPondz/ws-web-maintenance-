"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import PageContainer from "../../components/PageContainer";
import { fetchSupportpalSites, fetchWordpressSites } from "../../lib/api";
import {
  buildMaintenanceRecords,
  formatDateTime,
  normaliseSupportpalSites,
  normaliseWordpressSites,
} from "../dataUtils";

const typeOptions = [
  { value: "all", label: "All platforms" },
  { value: "WordPress", label: "WordPress" },
  { value: "SupportPal", label: "SupportPal" },
];

const getFilterOptions = (records) => {
  const availableTypes = new Set(records.map((record) => record.type));

  return typeOptions.filter(
    (option) => option.value === "all" || availableTypes.has(option.value),
  );
};

const filterRecords = (records, searchTerm, type) => {
  const trimmedSearch = searchTerm.trim().toLowerCase();
  const hasSearch = trimmedSearch.length > 0;

  return records.filter((record) => {
    if (type !== "all" && record.type !== type) {
      return false;
    }

    if (!hasSearch) {
      return true;
    }

    const haystack = [
      record.name,
      record.type,
      record.version,
      record.changeSummary,
      record.maintenanceNotes,
      record.url,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (haystack.includes(trimmedSearch)) {
      return true;
    }

    if (!Array.isArray(record.changeDetails)) {
      return false;
    }

    return record.changeDetails.some((detail) => {
      const detailValues = [detail.label, detail.previous, detail.current]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return detailValues.includes(trimmedSearch);
    });
  });
};

const ChangeDetailsList = ({ details }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!Array.isArray(details) || details.length === 0) {
    return null;
  }

  const toggle = () => setIsExpanded((previous) => !previous);

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1 text-sm font-semibold text-[#316fb7] transition-colors hover:text-[#245c94]"
        aria-expanded={isExpanded}
      >
        {isExpanded ? "Hide change details" : `Show change details (${details.length})`}
        <span aria-hidden>{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <dl className="space-y-2 text-sm text-gray-600">
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
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="font-medium text-gray-500">{detail.label}</dt>
                <dd className="text-gray-700">{value}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
};

const MaintenanceHistoryPage = () => {
  const [data, setData] = useState({ wordpress: [], supportpal: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

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
      encounteredErrors.push("ไม่สามารถโหลดข้อมูล WordPress ได้");
    }

    if (supportpalResult.status === "rejected") {
      console.error("Unable to load SupportPal sites:", supportpalResult.reason);
      encounteredErrors.push("ไม่สามารถโหลดข้อมูล SupportPal ได้");
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

  const availableFilters = useMemo(
    () => getFilterOptions(combinedRecords),
    [combinedRecords],
  );

  const filteredRecords = useMemo(
    () => filterRecords(combinedRecords, searchTerm, typeFilter),
    [combinedRecords, searchTerm, typeFilter],
  );

  const stats = useMemo(() => {
    const totals = combinedRecords.reduce(
      (accumulator, record) => {
        accumulator.total += 1;
        accumulator.byType[record.type] = (accumulator.byType[record.type] || 0) + 1;

        if (record.lastActivity) {
          const timestamp = new Date(record.lastActivity).getTime();

          if (!accumulator.latest || timestamp > accumulator.latest.timestamp) {
            accumulator.latest = {
              timestamp,
              label: record.lastActivityLabel,
            };
          }
        }

        return accumulator;
      },
      { total: 0, byType: {}, latest: null },
    );

    return totals;
  }, [combinedRecords]);

  return (
    <PageContainer
      title="Maintenance log"
      description="ตรวจสอบข้อมูลเวอร์ชันและประวัติการอัปเดตของระบบทั้งหมดได้ในหน้าเดียว"
      actions={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          {lastUpdated && (
            <span className="text-sm text-slate-600">
              อัปเดตล่าสุด {formatDateTime(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-[#316fb7] bg-white/80 px-5 py-2 text-sm font-semibold text-[#316fb7] shadow-sm transition hover:bg-[#316fb7]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </div>
      }
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-5 text-red-700 shadow-sm">
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            รายการทั้งหมด
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">จำนวนรายการที่กำลังติดตาม</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            จำแนกตามระบบ
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {Object.entries(stats.byType).map(([type, count]) => (
              <li key={type} className="flex items-center justify-between">
                <span>{type}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </li>
            ))}
            {Object.keys(stats.byType).length === 0 && (
              <li className="text-gray-400">ยังไม่มีข้อมูล</li>
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            การอัปเดตล่าสุด
          </p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {stats.latest ? stats.latest.label : "ยังไม่มีประวัติ"}
          </p>
          <p className="text-sm text-gray-500">ข้อมูลอ้างอิงตามเวลาที่ตรวจพบการเปลี่ยนแปลง</p>
        </div>
      </section>

      <section className="mt-10 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="maintenance-search">
                ค้นหาระบบ
              </label>
              <input
                id="maintenance-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาด้วยชื่อระบบ เวอร์ชัน หรือหมายเหตุ"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40"
              />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-sm font-medium text-gray-700" htmlFor="maintenance-type-filter">
                เลือกระบบ
              </label>
              <select
                id="maintenance-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40"
              >
                {availableFilters.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            แสดง {filteredRecords.length} จาก {combinedRecords.length} รายการ
          </div>
        </div>

        {isLoading && combinedRecords.length === 0 ? (
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200/80" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200/80" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200/80" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/80" />
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <p className="text-sm text-gray-500">ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredRecords.map((record) => (
              <li
                key={`${record.type}-${record.id}`}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          record.type === "WordPress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {record.type}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{record.name}</h3>
                    </div>
                    {record.url && (
                      <a
                        href={record.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm text-[#316fb7] hover:underline"
                      >
                        {record.url}
                      </a>
                    )}
                    <div className="mt-3 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                      <div>
                        <span className="font-semibold text-gray-500">เวอร์ชัน</span>
                        <p className="text-gray-900">{record.versionLabel}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-500">สถานะล่าสุด</span>
                        <p className="text-gray-900">{record.status || "ไม่ทราบ"}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-500">ตรวจครั้งสุดท้าย</span>
                        <p className="text-gray-900">{formatDateTime(record.lastCheckedDate)}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-500">อัปเดตล่าสุด</span>
                        <p className="text-gray-900">{record.lastActivityLabel}</p>
                      </div>
                    </div>
                    {record.changeSummary && (
                      <p className="mt-3 text-sm text-gray-600">{record.changeSummary}</p>
                    )}
                    {record.maintenanceNotes && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        หมายเหตุ: {record.maintenanceNotes}
                      </p>
                    )}
                    <ChangeDetailsList details={record.changeDetails} />
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-500">สรุปยืนยัน</p>
                    <p className="mt-1">
                      {record.isConfirmed
                        ? "ยืนยันการบำรุงรักษาแล้วในรอบปัจจุบัน"
                        : "ยังไม่ได้ยืนยันการบำรุงรักษาในรอบนี้"}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
};

export default MaintenanceHistoryPage;
