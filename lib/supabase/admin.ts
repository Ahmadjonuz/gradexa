import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

export function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY topilmadi. Server muhit sozlamasini tekshiring.",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

