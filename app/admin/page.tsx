import { ChartNoAxesCombined, HeartHandshake, LogOut, ShieldCheck, Trophy, Users } from "lucide-react";
import { DrawSimulationForm, PublishDrawForm } from "@/components/AdminDrawForms";
import ManageCharities from "@/components/ManageCharities";
import { requireAdmin } from "@/lib/supabase/auth";
import { createCharityAction, logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const [{ count: userCount }, { data: draws }, { data: charityTotals }, { data: drawStats }, { data: charities }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("draws")
      .select("id,draw_month,status,draw_type")
      .neq("status", "published")
      .order("draw_month", { ascending: false }),
    supabase.from("charity_allocations").select("amount,charities(name)").limit(20),
    supabase.from("draw_entries").select("match_count,draws(draw_month)").not("match_count", "is", null).limit(100),
    supabase.from("charities").select("*").order("name", { ascending: true })
  ]);


  const totalCharity = (charityTotals ?? []).reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);
  const publishableDraws =
    draws?.map((draw: any) => ({
      id: draw.id,
      label: `${draw.draw_month} - ${draw.draw_type} (${draw.status})`
    })) ?? [];
  const matchCounts = [5, 4, 3].map((tier) => ({
    tier,
    count: (drawStats ?? []).filter((row: any) => row.match_count === tier).length
  }));

  return (
    <main className="page">
      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Admin dashboard</span>
          <h1>Users, draws, charities, winners, and reports.</h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="statusPill">
            <ShieldCheck size={16} /> Admin only
          </span>
          <form action={logoutAction}>
            <button className="button secondary" type="submit" style={{ minHeight: "38px", display: "flex", alignItems: "center", gap: "8px", borderColor: "rgba(230, 111, 138, 0.4)", color: "var(--rose)", background: "rgba(230, 111, 138, 0.05)" }}>
              <LogOut size={16} /> Log out
            </button>
          </form>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <Users />
          <strong>{userCount ?? 0} users</strong>
          <p>Profile and score editing are protected by admin RLS policies.</p>
        </article>
        <article className="card">
          <HeartHandshake />
          <strong>{totalCharity.toFixed(2)} allocated</strong>
          <p>Webhook-fed charity allocation ledger total.</p>
        </article>
        <article className="card">
          <Trophy />
          <strong>{publishableDraws.length} pending draws</strong>
          <p>Simulation can be inspected before results become visible to subscribers.</p>
        </article>
      </section>

      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Charity setup</span>
          <h2>Add a charity.</h2>
        </div>
        <HeartHandshake />
      </section>
      <article className="card">
        <form action={createCharityAction} className="formGrid">
          <div className="formRow">
            <label>
              Charity name
              <input name="name" type="text" placeholder="Golf Foundation" required />
            </label>
            <label>
              Slug
              <input name="slug" type="text" placeholder="golf-foundation" />
            </label>
          </div>
          <label>
            Description
            <input name="description" type="text" placeholder="What this charity supports" />
          </label>
          <label>
            Logo URL
            <input name="logoUrl" type="url" placeholder="https://example.com/logo.png" />
          </label>
          <div className="inlineActions">
            <label className="checkControl">
              <input name="isFeatured" type="checkbox" /> Featured
            </label>
            <label className="checkControl">
              <input name="isActive" type="checkbox" defaultChecked /> Active
            </label>
            <button className="button" type="submit">
              Add charity
            </button>
          </div>
        </form>
      </article>

      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Charity Directory</span>
          <h2>Manage charities</h2>
        </div>
        <HeartHandshake />
      </section>
      <ManageCharities initialCharities={(charities as any) ?? []} />

      <section className="sectionTitle">
        <h2>Draw operations</h2>
      </section>
      <section className="grid two">
        <DrawSimulationForm />
        <PublishDrawForm draws={publishableDraws} />
      </section>

      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Reports</span>
          <h2>Historic match tiers</h2>
        </div>
        <ChartNoAxesCombined />
      </section>
      <section className="grid">
        {matchCounts.map((row) => (
          <article className="card" key={row.tier}>
            <strong>{row.tier}-match winners</strong>
            <p>{row.count} historical entries.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
