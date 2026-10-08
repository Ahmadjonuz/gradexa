import "server-only";

declare global {
  // Prevent Turbopack hot reload from registering the same proxy dispatcher twice.
  var __gradexaProxyConfigured: boolean | undefined;
}

/**
 * Lets the Node.js side of Gradexa reach Supabase from networks that require
 * an HTTP proxy. No proxy is used unless GRADEXA_HTTP_PROXY is explicitly set.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (globalThis.__gradexaProxyConfigured) return;

  const proxyUrl = process.env.GRADEXA_HTTP_PROXY?.trim();
  if (!proxyUrl) return;

  try {
    new URL(proxyUrl);
    const { ProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    globalThis.__gradexaProxyConfigured = true;
  } catch (error) {
    console.error("Gradexa proksi sozlamasi ishlamadi:", error);
  }
}
