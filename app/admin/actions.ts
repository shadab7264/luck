"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sendEmail } from "@/lib/email/send";
import { requireAdmin } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const charitySchema = z.object({
  name: z.string().trim().min(2, "Charity name is required."),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const simulationSchema = z.object({
  drawMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  drawType: z.enum(["random", "algorithmic"]),
  algorithmicMode: z.enum(["most_frequent", "least_frequent"]).default("most_frequent")
});

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCharityAction(formData: FormData) {
  const parsed = charitySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") !== "off"
  });

  if (!parsed.success) {
    return;
  }

  const { supabase, user } = await requireAdmin();
  const slug = parsed.data.slug ? toSlug(parsed.data.slug) : toSlug(parsed.data.name);

  await supabase.from("charities").upsert(
    {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      logo_url: parsed.data.logoUrl || null,
      is_featured: parsed.data.isFeatured,
      is_active: parsed.data.isActive,
      created_by: user.id
    },
    { onConflict: "slug" }
  );

  revalidatePath("/admin");
  revalidatePath("/charities");
  revalidatePath("/login");
  revalidatePath("/signup");
}

export async function runDrawSimulationAction(_: unknown, formData: FormData) {
  const parsed = simulationSchema.safeParse({
    drawMonth: formData.get("drawMonth"),
    drawType: formData.get("drawType"),
    algorithmicMode: formData.get("algorithmicMode") || "most_frequent"
  });

  if (!parsed.success) {
    return { ok: false, message: "Draw month must be the first day of a month." };
  }

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("run_draw_simulation", {
    p_draw_month: parsed.data.drawMonth,
    p_draw_type: parsed.data.drawType,
    p_algorithmic_mode: parsed.data.algorithmicMode
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Simulation complete. It is still hidden from subscribers.", data };
}

export async function publishDrawAction(_: unknown, formData: FormData) {
  const drawId = String(formData.get("drawId") ?? "");
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("publish_draw", {
    p_draw_id: drawId
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const { data: winners } = await supabase
    .from("winners")
    .select("draw_entries(user_id,prize_amount,match_count,profiles(email,full_name))")
    .eq("draw_entries.draw_id", drawId);

  await Promise.all(
    (winners ?? []).map(async (winner: any) => {
      const profile = winner.draw_entries?.profiles;
      if (!profile?.email) return;

      await sendEmail({
        to: profile.email,
        subject: "You have a prize draw result",
        text: `Your entry matched ${winner.draw_entries.match_count} numbers. Prize amount: ${winner.draw_entries.prize_amount}. Please upload proof in your dashboard.`
      });
    })
  );

  revalidatePath("/admin");
  revalidatePath("/draws");
  return { ok: true, message: "Draw published, winners created, and winner notifications queued.", data };
}

export async function updateCharityAction(prevState: any, formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) {
    return { ok: false, message: "Charity ID is required." };
  }

  const parsed = charitySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on"
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message || "Validation failed." };
  }

  const { supabase } = await requireAdmin();
  const slug = parsed.data.slug ? toSlug(parsed.data.slug) : toSlug(parsed.data.name);

  const { error } = await supabase
    .from("charities")
    .update({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      logo_url: parsed.data.logoUrl || null,
      is_featured: parsed.data.isFeatured,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/charities");
  revalidatePath("/login");
  revalidatePath("/signup");
  return { ok: true, message: "Charity updated successfully." };
}

export async function deleteCharityAction(prevState: any, formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) {
    return { ok: false, message: "Charity ID is required." };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("charities").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: `Could not delete charity: ${error.message}. (Try setting Active status to false if it has active users or allocations)`
    };
  }

  revalidatePath("/admin");
  revalidatePath("/charities");
  revalidatePath("/login");
  revalidatePath("/signup");
  return { ok: true, message: "Charity deleted successfully." };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

