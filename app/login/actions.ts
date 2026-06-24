"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(message: string) {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

function safeNextPath(next: string) {
  if (next === "/admin" || next === "/pricing" || next === "/dashboard") {
    return next;
  }

  return "/dashboard";
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    redirectWithError("Enter your email and password.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithError(error.message);
  }

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      redirect("/admin");
    }
  }

  redirect(safeNextPath(next));
}
