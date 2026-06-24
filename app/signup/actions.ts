"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(message: string) {
  redirect(`/signup?error=${encodeURIComponent(message)}`);
}

export async function signupAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const selectedCharityId = String(formData.get("selectedCharityId") ?? "");
  const charityContributionPct = Number(formData.get("charityContributionPct") ?? 10);

  if (!fullName || !email || !password) {
    redirectWithError("Enter your name, email, and password.");
  }

  if (!selectedCharityId) {
    redirectWithError("Choose a charity before creating your account.");
  }

  if (!Number.isFinite(charityContributionPct) || charityContributionPct < 10 || charityContributionPct > 100) {
    redirectWithError("Charity contribution must be between 10 and 100 percent.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    redirectWithError(error.message);
  }

  if (data.user) {
    await createServiceClient()
      .from("profiles")
      .upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        selected_charity_id: selectedCharityId,
        charity_contribution_pct: charityContributionPct
      });
  }

  redirect("/pricing?signup=success");
}
