const normaliseText = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

export const toTypeSlug = (type) => {
  const normalised = normaliseText(type);

  if (!normalised) {
    return "";
  }

  return normalised.toLowerCase().replace(/\s+/g, "-");
};

export const buildRecordPath = (record) => {
  const typeSlug = toTypeSlug(record?.type);
  const id = normaliseText(record?.id);

  return `/dashboard/history/${encodeURIComponent(typeSlug)}/${encodeURIComponent(id)}`;
};

export const recordMatchesParams = (record, typeParam, idParam) => {
  const recordTypeSlug = toTypeSlug(record?.type);
  const targetTypeSlug = toTypeSlug(typeParam);

  if (!recordTypeSlug || recordTypeSlug !== targetTypeSlug) {
    return false;
  }

  const recordId = normaliseText(record?.id);
  const targetId = normaliseText(idParam);

  return recordId && recordId === targetId;
};

export const decodeParamSegment = (segment) => {
  if (segment === undefined || segment === null) {
    return "";
  }

  const value = Array.isArray(segment) ? segment[0] : segment;

  try {
    return decodeURIComponent(value);
  } catch (error) {
    console.error("Unable to decode route parameter", value, error);
    return String(value);
  }
};
