import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authIssue } from "@/lib/auth-form-feedback";
import { publicHref, readLanguage } from "@/lib/public-language";
import { safeAuthDestination } from "@/lib/auth-destination";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const invitation = requestUrl.searchParams.get("type") === "invite";
  const language = readLanguage(requestUrl.searchParams.get("lang"));
  const failure = (reason: "expired" | "connection") => {
    const url = new URL(publicHref(invitation ? "/accept-invitation" : "/forgot-password", language), requestUrl.origin);
    url.searchParams.set("reason", reason);
    return NextResponse.redirect(url);
  };

  if (!code && !(tokenHash && invitation)) {
    return failure("expired");
  }

  try {
    const supabase = await createClient();
    const { error } = tokenHash && invitation
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" })
      : await supabase.auth.exchangeCodeForSession(code!);
    if (error) return failure(authIssue(error) === "connection" ? "connection" : "expired");
  } catch {
    return failure("connection");
  }

  return NextResponse.redirect(
    safeAuthDestination(requestUrl, requestUrl.searchParams.get("next")),
  );
}
