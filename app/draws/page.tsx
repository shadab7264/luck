import { Trophy } from "lucide-react";
import { requireActiveSubscription } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function DrawsPage() {
  const { supabase, user } = await requireActiveSubscription();
  const [{ data: draws }, { data: entries }] = await Promise.all([
    supabase.from("draws").select("id,draw_month,winning_numbers,total_prize_pool,pool_5_match,pool_4_match,pool_3_match").order("draw_month", { ascending: false }),
    supabase
      .from("draw_entries")
      .select("draw_id,entry_numbers,match_count,prize_amount")
      .eq("user_id", user.id)
  ]);

  return (
    <main className="page">
      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Published draws</span>
          <h1>Your draw results.</h1>
        </div>
      </section>
      <section className="grid">
        {(draws ?? []).map((draw: any) => {
          const entry = entries?.find((candidate: any) => candidate.draw_id === draw.id);
          return (
            <article className="card" key={draw.id}>
              <Trophy />
              <strong>{draw.draw_month}</strong>
              <div className="drawBalls">
                {draw.winning_numbers?.map((number: number) => (
                  <span key={number}>{number}</span>
                ))}
              </div>
              <p>Total prize pool: {draw.total_prize_pool}</p>
              <p>
                Your match: {entry?.match_count ?? "-"} numbers. Prize: {entry?.prize_amount ?? 0}
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
