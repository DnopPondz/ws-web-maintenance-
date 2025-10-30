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

const normaliseText = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value).trim();
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

const shouldHideChangeSummary = (summary) => {
  if (typeof summary !== "string") {
    return false;
  }

  const trimmed = summary.trim();

  if (!trimmed) {
    return true;
  }

  const segments = trimmed
    .split(";")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return false;
  }

  return segments.every((segment) => segment.includes("→"));
};

const buildWordpressVersionDetails = (site) => {
  const detailMap = new Map();

  const addDetail = (label, value) => {
    const trimmedLabel = normaliseText(label);

    if (!trimmedLabel) {
      return;
    }

    const trimmedValue = normaliseText(value);
    const existing = detailMap.get(trimmedLabel);

    if (
      !existing ||
      (existing.value.length === 0 && trimmedValue.length > 0)
    ) {
      detailMap.set(trimmedLabel, {
        label: trimmedLabel,
        value: trimmedValue,
      });
    }
  };

  const coreVersion =
    site?.wordpressVersion ?? site?.wordpress_version ?? site?.version ?? "";

  if (coreVersion) {
    addDetail("WordPress core", coreVersion);
  }

  const theme =
    site?.theme && typeof site.theme === "object" ? site.theme : undefined;

  if (theme) {
    const themeName = normaliseText(theme.name);
    const themeVersion = normaliseText(theme.version);
    if (themeName || themeVersion) {
      addDetail(
        "Theme",
        [themeName, themeVersion].filter((part) => part.length > 0).join(" "),
      );
    }
  }

  const pluginSources = [];

  if (Array.isArray(site?.plugins)) {
    pluginSources.push(...site.plugins);
  }

  if (Array.isArray(site?.versions)) {
    pluginSources.push(...site.versions);
  }

  pluginSources.forEach((plugin, index) => {
    const name = normaliseText(plugin?.name) || `Plugin ${index + 1}`;
    const version = normaliseText(plugin?.version);
    addDetail(`Plugin: ${name}`, version);
  });

  return Array.from(detailMap.values());
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
    const versionDetails = buildWordpressVersionDetails(site);
    const versionLabelText = versionDetails
      .map((detail) =>
        [detail.label, detail.value]
          .filter((part) => part && part.length > 0)
          .join(" "),
      )
      .join(" • ");

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
      version: versionLabelText,
      versionDetails,
    };
  });

const SUPPORTPAL_VERSION_LABELS = {
  supportpal: "SupportPal",
  php: "PHP",
  mysql: "MySQL",
  mariadb: "MariaDB",
  nginx: "Nginx",
  apache: "Apache",
  os: "OS",
  redis: "Redis",
  elasticsearch: "Elasticsearch",
  node: "Node.js",
  composer: "Composer",
};

const normaliseSupportpalVersion = (site) => {
  const labels = SUPPORTPAL_VERSION_LABELS;
  const entries = new Map();

  const addEntry = (key, label, value) => {
    if (value === undefined || value === null) {
      return;
    }

    const trimmed = typeof value === "string" ? value.trim() : String(value).trim();

    if (!trimmed) {
      return;
    }

    const normalisedLabel =
      typeof label === "string" && label.trim().length > 0
        ? label.trim()
        : key.charAt(0).toUpperCase() + key.slice(1);

    entries.set(key, {
      key,
      label: normalisedLabel,
      value: trimmed,
    });
  };

  if (site?.versions && typeof site.versions === "object") {
    Object.entries(site.versions).forEach(([rawKey, value]) => {
      const key = String(rawKey).trim().toLowerCase();
      const label = labels[key] || key.charAt(0).toUpperCase() + key.slice(1);

      addEntry(key, label, value);
    });
  }

  const directVersionValue =
    site?.supportpalVersion ?? site?.supportpal_version ?? site?.version;

  if (directVersionValue !== undefined && directVersionValue !== null) {
    addEntry("supportpal", labels.supportpal || "SupportPal", directVersionValue);
  }

  if (entries.size === 0) {
    return { label: "", details: [] };
  }

  const orderedEntries = Array.from(entries.values()).sort((a, b) => {
    if (a.key === "supportpal" && b.key !== "supportpal") {
      return -1;
    }

    if (b.key === "supportpal" && a.key !== "supportpal") {
      return 1;
    }

    return 0;
  });

  const label = orderedEntries
    .map((entry) =>
      [entry.label, entry.value]
        .filter((part) => part && part.length > 0)
        .join(" "),
    )
    .join(" • ");

  return {
    label,
    details: orderedEntries.map(({ label: entryLabel, value }) => ({
      label: entryLabel,
      value,
    })),
  };
};

export const normaliseSupportpalSites = (sites = []) =>
  sites.map((site, index) => {
    const lastChecked = site?.lastChecked ?? site?.last_checked ?? null;
    const lastCheckedDate = getValidDate(lastChecked);
    const changeDetailsSource =
      site?.lastChangeDetails ?? site?.changeDetails ?? [];
    const changeDetectedAtSource =
      site?.lastChangeDetectedAt ?? site?.changeDetectedAt ?? null;
    const changeDetectedAtDate = getValidDate(changeDetectedAtSource);
    const versionInfo = normaliseSupportpalVersion(site);

    const changeSummaryRaw =
      site?.lastChangeSummary ?? site?.changeSummary ?? "";

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
      changeSummary: shouldHideChangeSummary(changeSummaryRaw)
        ? ""
        : changeSummaryRaw,
      changeDetails: normaliseChangeDetails(changeDetailsSource),
      changeDetectedAt: changeDetectedAtDate,
      version: versionInfo.label,
      versionDetails: versionInfo.details,
    };
  });

export const buildMaintenanceRecords = (wordpressSites, supportpalSites) => {
  const enhanceRecord = (record) => {
    const lastActivity = record.changeDetectedAt || record.lastCheckedDate;
    const versionDetails = Array.isArray(record.versionDetails)
      ? record.versionDetails
      : [];

    const versionText =
      typeof record.version === "string" && record.version.trim().length > 0
        ? record.version.trim()
        : versionDetails
            .map((detail) =>
              [detail.label, detail.value]
                .filter((part) => part && part.length > 0)
                .join(" "),
            )
            .join(" • ");

    let versionLabel = "N/A";

    if (versionDetails.length > 0) {
      const primaryDetail = versionDetails[0];
      const primaryLabel = [primaryDetail.label, primaryDetail.value]
        .filter((part) => part && part.length > 0)
        .join(" ");

      versionLabel = primaryLabel || versionText || "N/A";
    } else if (versionText.length > 0) {
      if (record.type === "WordPress" && !/^wordpress/i.test(versionText)) {
        versionLabel = `WordPress ${versionText}`;
      } else {
        versionLabel = versionText;
      }
    }

    return {
      ...record,
      lastActivity,
      lastActivityLabel: formatDateTime(lastActivity),
      version: versionText,
      versionLabel,
      versionDetails,
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
