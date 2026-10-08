import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabasePublicConfig } from "./config";

export async function updateSession(request: NextRequest) {
  // Pass the actual requested route to the server layout for a safe return
  // after login. Overwrite any client-supplied value.
  request.headers.set("x-gradexa-path", request.nextUrl.pathname + request.nextUrl.search);
  const config = readSupabasePublicConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // A temporary auth outage must not block public pages.
  }

  return response;
}
