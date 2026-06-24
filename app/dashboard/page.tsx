import Link from "next/link";
import { CreditCard, HeartHandshake, Medal, Trophy } from "lucide-react";
import { BillingPortalButton } from "@/components/CheckoutButton";
import { requireActiveSubscription } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, user, subscription } = await requireActiveSubscription();
  const [{ data: scores }, { data: profile }, { data: entries }] = await Promise.all([
    supabase
      .from("golf_scores")
      .select("id,score,score_date")
      .eq("user_id", user.id)
      .order("score_date", { ascending: false })
      .limit(5),
    supabase.from("profiles").select("full_name,selected_charity_id,charity_contribution_pct").eq("id", user.id).single(),
    supabase
      .from("draw_entries")
      .select("entry_numbers,match_count,prize_amount,draws(draw_month,status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  return (
    <main className="page">
      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Subscriber dashboard</span>
          <h1>{profile?.full_name ?? "Your account"}</h1>
        </div>
        <span className="statusPill">Active until {new Date(subscription.current_period_end).toLocaleDateString()}</span>
      </section>

      <section className="grid">
        <article className="card">
          <CreditCard />
          <strong>Subscription</strong>
          <p>Status is checked on every gated server request.</p>
          <BillingPortalButton />
        </article>
        <article className="card">
          <Medal />
          <strong>{scores?.length ?? 0}/5 scores ready</strong>
          <p>Entries use your current latest-five scores at draw time.</p>
          <Link className="button" href="/scores">
            Manage scores
          </Link>
        </article>
        <article className="card">
          <HeartHandshake />
          <strong>{profile?.charity_contribution_pct ?? 10}% charity allocation</strong>
          <p>Minimum 10% is enforced by both UI and database constraints.</p>
        </article>
      </section>

      <section className="sectionTitle">
        <h2>Recent draw entries</h2>
      </section>
      <section className="table">
        <div className="tableRow tableHead">
          <span>Month</span>
          <span>Numbers</span>
          <span>Matches</span>
          <span>Prize</span>
        </div>
        {(entries ?? []).map((entry: any, index: number) => (
          <div className="tableRow" key={index}>
            <span>{entry.draws?.draw_month ?? "Pending"}</span>
            <span>{entry.entry_numbers?.join(", ")}</span>
            <strong>{entry.match_count ?? "-"}</strong>
            <span>{entry.prize_amount ?? 0}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
