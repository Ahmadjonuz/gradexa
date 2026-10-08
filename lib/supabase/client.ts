"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (client) return client;
  const { url, publishableKey } = getSupabasePublicConfig();
  client = createBrowserClient(url, publishableKey);
  return client;
}

