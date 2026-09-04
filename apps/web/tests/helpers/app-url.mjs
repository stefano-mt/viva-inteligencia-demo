export function normalizeAppBaseUrl(baseUrl) {
  const normalized = new URL(baseUrl);
  normalized.search = "";
  normalized.hash = "";
  if (!normalized.pathname.endsWith("/")) {
    normalized.pathname = `${normalized.pathname}/`;
  }
  return normalized;
}

export function resolveAppUrl(baseUrl, relativeUrl) {
  const normalizedBase = normalizeAppBaseUrl(baseUrl);
  const appRelativeUrl = String(relativeUrl ?? "").replace(/^\/+/, "");
  return new URL(appRelativeUrl, normalizedBase).href;
}

export function resolveAppPath(baseUrl, relativeUrl) {
  const resolved = new URL(resolveAppUrl(baseUrl, relativeUrl));
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
