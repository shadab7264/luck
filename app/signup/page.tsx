import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signupAction } from "./actions";

export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: charities } = await supabase
    .from("charities")
    .select("id,name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <main className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 150px)" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <section className="sectionTitle" style={{ textAlign: "center", width: "100%" }}>
          <div style={{ width: "100%" }}>
            <span className="eyebrow">Create account</span>
            <h1 style={{ textAlign: "center" }}>Sign up and choose your charity.</h1>
          </div>
        </section>
        {params?.error ? <p className="notice warning" style={{ width: "100%", margin: "0 0 14px" }}>{params.error}</p> : null}
        <article className="card authCard" style={{ width: "100%" }}>
          <form action={signupAction} className="formGrid">
            <label>
              Full name
              <input name="fullName" type="text" autoComplete="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="new-password" minLength={6} required />
            </label>
            <label>
              Charity
              <select name="selectedCharityId" required disabled={!charities?.length}>
                <option value="">{charities?.length ? "Choose a charity" : "Add charities first"}</option>
                {(charities ?? []).map((charity: any) => (
                  <option key={charity.id} value={charity.id}>
                    {charity.name}
                  </option>
                ))}
              </select>
            </label>
            {!charities?.length ? (
              <p className="notice warning">
                No charities exist yet. <Link className="textLink" href="/charities">Add starter charities</Link>.
              </p>
            ) : null}
            <label>
              Contribution percentage
              <input name="charityContributionPct" type="number" min={10} max={100} defaultValue={10} required />
            </label>
            <button className="button" type="submit">
              Create account
            </button>
          </form>
          <p className="muted" style={{ marginTop: "12px" }}>
            Already have an account? <Link className="textLink" href="/login">Log in</Link>
          </p>
        </article>
      </div>
    </main>
  );
}
