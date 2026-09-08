/** Restore the real path after a static-host 404 fallback so refresh keeps the same route. */
export function restoreSpaLocation() {
  if (typeof window === "undefined") return;

  const { search, pathname, hash } = window.location;

  // spa-github-pages style: /?/devices
  if (search.startsWith("?/")) {
    const decoded = search
      .slice(1)
      .split("&")
      .map((s) => s.replace(/~and~/g, "&"))
      .join("?");
    const base = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    window.history.replaceState(null, "", base + decoded + hash);
    return;
  }

  try {
    const stored = sessionStorage.getItem("spa-redirect");
    if (stored && stored !== pathname + search + hash && !stored.startsWith("/404")) {
      sessionStorage.removeItem("spa-redirect");
      window.history.replaceState(null, "", stored);
    }
  } catch {
    // ignore
  }
}
