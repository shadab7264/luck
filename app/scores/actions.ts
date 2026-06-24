"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveSubscription } from "@/lib/supabase/auth";

const scoreSchema = z.object({
  score: z.coerce.number().int().min(1).max(45),
  scoreDate: z.coerce.date()
});

export async function saveScoreAction(_: unknown, formData: FormData) {
  const parsed = scoreSchema.safeParse({
    score: formData.get("score"),
    scoreDate: formData.get("scoreDate")
  });

  if (!parsed.success) {
    return { ok: false, message: "Score must be a number from 1 to 45 with a valid date." };
  }

  const { supabase, user } = await requireActiveSubscription();
  const scoreDate = parsed.data.scoreDate.toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("golf_scores")
    .select("id")
    .eq("user_id", user.id)
    .eq("score_date", scoreDate)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      message: "A score already exists for that date. Edit the existing entry instead of adding a duplicate."
    };
  }

  const { error } = await supabase.rpc("upsert_golf_score", {
    p_user_id: user.id,
    p_score: parsed.data.score,
    p_score_date: scoreDate
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/scores");
  revalidatePath("/dashboard");
  return { ok: true, message: "Score saved. Your latest five scores are retained automatically." };
}

export async function deleteScoreAction(formData: FormData) {
  const { supabase, user } = await requireActiveSubscription();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("golf_scores").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/scores");
  revalidatePath("/dashboard");
}
