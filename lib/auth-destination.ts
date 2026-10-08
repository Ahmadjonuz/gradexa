import { publicHref, readLanguage } from "./public-language";

// Only these two local destinations may receive an exchanged auth session.
export function safeAuthDestination(requestUrl: URL, next: string | null) {
  const language = readLanguage(requestUrl.searchParams.get("lang"));
  const fallback = new URL(publicHref(requestUrl.searchParams.get("type") === "invite" ? "/accept-invitation" : "/reset-password", language), requestUrl.origin);
  if (!next) return fallback;
  try {
    const destination = new URL(next, requestUrl.origin);
    if (destination.origin !== requestUrl.origin || !["/reset-password", "/accept-invitation"].includes(destination.pathname)) return fallback;
    // Strip unknown query parameters and hashes, including any forwarded secrets.
    return new URL(publicHref(destination.pathname, readLanguage(destination.searchParams.get("lang") ?? language)), requestUrl.origin);
  } catch { return fallback; }
}

// A login may continue only to a local page in the authenticated role's area.
export function safeLoginDestination(next: FormDataEntryValue | null, area: "admin" | "student") {
  const fallback = `/${area}`;
  if (typeof next !== "string" || next.length > 2048 || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://gradexa.local");
    if (url.origin !== "http://gradexa.local" || (url.pathname !== fallback && !url.pathname.startsWith(fallback + "/"))) return fallback;
    return url.pathname + url.search;
  } catch { return fallback; }
}
