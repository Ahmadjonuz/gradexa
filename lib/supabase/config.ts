export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase sozlamalari topilmadi. .env.local faylini tekshiring.",
    );
  }

  return { url, publishableKey };
}

export function readSupabasePublicConfig(): SupabasePublicConfig | null {
  try {
    return getSupabasePublicConfig();
  } catch {
    return null;
  }
}

