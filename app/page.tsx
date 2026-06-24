import Link from "next/link";
import { ArrowRight, CircleDollarSign, HeartHandshake, Medal, ShieldCheck, Trophy } from "lucide-react";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <span className="eyebrow">Golf performance, rewards, and giving</span>
          <h1>Enter five scores. Join the draw. Fund the charity you choose.</h1>
          <p>
            Subscribers keep a rolling set of five validated golf scores. Monthly draw entries are derived from those
            scores, winners share tiered prize pools, and every paid subscription records an auditable charity
            allocation.
          </p>
          <div className="heroActions">
            <Link className="button" href="/signup">
              Sign up <ArrowRight size={17} />
            </Link>
            <Link className="button secondary" href="/login">
              Login
            </Link>
            <Link className="button" href="/pricing">
              Subscribe <ArrowRight size={17} />
            </Link>
            <Link className="button secondary" href="/charities">
              Browse charities
            </Link>
          </div>
        </div>
        <div className="panel heroPanel">
          <span className="eyebrow">Next draw preview</span>
          <div className="drawBalls" aria-label="Example draw numbers">
            {[7, 12, 19, 31, 42].map((number) => (
              <span key={number}>{number}</span>
            ))}
          </div>
          <p>
            Random draws use server-side number generation. Algorithmic draws can weight toward most or least frequent
            submitted scores for admin pre-analysis before publishing.
          </p>
        </div>
      </section>

      <section className="grid" aria-label="Platform flow">
        <article className="card">
          <Medal />
          <strong>What the user does</strong>
          <p>Enter one score per date, from 1 to 45. The database keeps only the five most recent scores per user.</p>
        </article>
        <article className="card">
          <Trophy />
          <strong>How they win</strong>
          <p>Monthly entries are frozen from the latest five scores. Matching 5, 4, or 3 numbers splits 40/35/25 pools.</p>
        </article>
        <article className="card">
          <HeartHandshake />
          <strong>Charity impact</strong>
          <p>At least 10% of subscription revenue is allocated to the subscriber-selected charity in a ledger.</p>
        </article>
      </section>

      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Production controls</span>
          <h2>Built around server-verified access.</h2>
        </div>
      </section>
      <section className="grid">
        <article className="card">
          <ShieldCheck />
          <strong>Supabase RLS</strong>
          <p>Users see their own protected records. Admin writes are gated by role checks and service-role webhooks.</p>
        </article>
        <article className="card">
          <CircleDollarSign />
          <strong>Stripe source of truth</strong>
          <p>Checkout, portal, webhooks, and donation intents are separated and signature verified.</p>
        </article>
        <article className="card">
          <Trophy />
          <strong>Draw auditability</strong>
          <p>Simulation stays hidden. Publishing computes matches, prizes, winners, and rollover atomically.</p>
        </article>
      </section>
    </main>
  );
}
