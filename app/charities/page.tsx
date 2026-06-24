import { CalendarDays, HeartHandshake, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CharitiesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("charities")
    .select("id,name,slug,description,logo_url,is_featured,charity_events(title,event_date,location)")
    .eq("is_active", true)
    .order("is_featured", { ascending: false });

  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  }

  const { data: charities } = await query;

  return (
    <main className="page">
      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Charity directory</span>
          <h1>Choose where your subscription impact goes.</h1>
        </div>
      </section>
      <form className="panel formRow">
        <label>
          <span>
            <Search size={16} /> Search charities
          </span>
          <input name="q" type="search" defaultValue={params.q ?? ""} placeholder="Name or focus area" />
        </label>
        <button className="button" type="submit">
          Search
        </button>
      </form>
      <section className="grid">
        {(charities ?? []).map((charity: any) => (
          <article className="card" key={charity.id}>
            <HeartHandshake />
            <strong>{charity.name}</strong>
            <p>{charity.description ?? "No description yet."}</p>
            {charity.is_featured ? <span className="statusPill">Featured</span> : null}
            <div className="metric">
              <span>
                <CalendarDays size={14} /> Next event
              </span>
              <strong>{charity.charity_events?.[0]?.event_date ?? "TBA"}</strong>
            </div>
          </article>
        ))}
        {charities?.length === 0 ? (
          <article className="card">
            <HeartHandshake />
            <strong>No charities yet</strong>
            <p>Ask an admin to add active charities from the admin dashboard.</p>
          </article>
        ) : null}
      </section>
    </main>
  );
}
