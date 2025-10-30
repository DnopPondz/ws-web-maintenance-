const TIME_ZONE = "Asia/Bangkok";

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

export const formatDateTime = (value) => {
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

export const normaliseWordpressSites = (sites = []) =>
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
      version:
        site?.wordpressVersion ??
        site?.wordpress_version ??
        site?.version ??
        "",
    };
  });

export const normaliseSupportpalSites = (sites = []) =>
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
      version:
        site?.supportpalVersion ??
        site?.supportpal_version ??
        site?.version ??
        "",
    };
  });

export const buildMaintenanceRecords = (wordpressSites, supportpalSites) => {
  const enhanceRecord = (record) => {
    const lastActivity = record.changeDetectedAt || record.lastCheckedDate;

    return {
      ...record,
      lastActivity,
      lastActivityLabel: formatDateTime(lastActivity),
      versionLabel: record.version && record.version.trim().length > 0
        ? record.version
        : "N/A",
    };
  };

  return [...wordpressSites.map(enhanceRecord), ...supportpalSites.map(enhanceRecord)]
    .sort((a, b) => {
      const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;

      return dateB - dateA;
    });
};

export { TIME_ZONE };
