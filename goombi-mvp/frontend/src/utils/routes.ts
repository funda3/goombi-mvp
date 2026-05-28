function normalizedBasePath(): string {
  const base = String(import.meta.env.BASE_URL || "/");
  if (base === "/") return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function appHref(route: "/" | "/admin" | "/admin/crm"): string {
  const base = normalizedBasePath();
  return `${base}/#${route}`;
}

export function currentAppRoute(): string {
  const hash = window.location.hash;
  if (hash.startsWith("#/")) {
    return hash.slice(1);
  }

  const base = normalizedBasePath();
  const pathname = window.location.pathname;
  if (base && pathname.startsWith(base)) {
    const stripped = pathname.slice(base.length);
    return stripped || "/";
  }
  return pathname || "/";
}
