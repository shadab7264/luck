import { Trash2 } from "lucide-react";
import { ScoreForm } from "@/components/ScoreForm";
import { deleteScoreAction } from "@/app/scores/actions";
import { requireActiveSubscription } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const { supabase, user } = await requireActiveSubscription();
  const { data: scores } = await supabase
    .from("golf_scores")
    .select("id,score,score_date,created_at")
    .eq("user_id", user.id)
    .order("score_date", { ascending: false });

  return (
    <main className="page">
      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Score management</span>
          <h1>Latest-five score entry.</h1>
        </div>
      </section>
      <section className="grid two">
        <ScoreForm />
        <article className="card">
          <strong>Validation rules</strong>
          <p>Scores must be 1-45. Duplicate dates return a clear edit-existing message. The RPC trims older rows after the fifth score.</p>
        </article>
      </section>
      <section className="sectionTitle">
        <h2>Your scores</h2>
      </section>
      <section className="table">
        <div className="tableRow tableHead">
          <span>Date</span>
          <span>Score</span>
          <span>Created</span>
          <span>Action</span>
        </div>
        {(scores ?? []).map((score: any) => (
          <div className="tableRow" key={score.id}>
            <span>{score.score_date}</span>
            <strong>{score.score}</strong>
            <span>{new Date(score.created_at).toLocaleDateString()}</span>
            <form action={deleteScoreAction}>
              <input name="id" type="hidden" value={score.id} />
              <button className="button secondary" type="submit">
                <Trash2 size={16} /> Delete
              </button>
            </form>
          </div>
        ))}
      </section>
    </main>
  );
}
