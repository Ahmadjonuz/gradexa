import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeLoginDestination } from "@/lib/auth-destination";

export type GradexaRole = "owner" | "admin" | "student";
export type GradexaProfile = {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  role: GradexaRole;
  status: "active" | "invited" | "paused";
  bio: string;
};

export const getCurrentProfile = cache(async (): Promise<GradexaProfile | null> => {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (claimsError || typeof userId !== "string" || !userId) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,initials,role,status,bio")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as GradexaProfile;
  } catch {
    return null;
  }
});

export async function requireGradexaRole(area: "admin" | "student") {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active") {
    const requestedPath = (await headers()).get("x-gradexa-path");
    redirect(`/login?next=${encodeURIComponent(safeLoginDestination(requestedPath, area))}`);
  }

  const isStaff = profile.role === "owner" || profile.role === "admin";
  if (area === "admin" && !isStaff) redirect("/student");
  if (area === "student" && profile.role !== "student") redirect("/admin");
  return profile;
}
