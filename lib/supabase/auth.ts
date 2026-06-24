import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function requireActiveSubscription() {
  const { supabase, user } = await requireUser();

  // Admins bypass active subscription check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    return {
      supabase,
      user,
      subscription: {
        status: "active" as const,
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .gt("current_period_end", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    redirect("/pricing?reason=subscription-required");
  }

  return { supabase, user, subscription: data };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (error || data?.role !== "admin") {
    redirect("/login?error=Admin%20access%20required&next=/admin");
  }

  return { supabase, user };
}
