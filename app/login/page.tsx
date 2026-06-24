import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    reason?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: charities } = await supabase
    .from("charities")
    .select("id,name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  const message =
    params?.reason === "checkout"
      ? "Sign in or create an account before choosing a subscription plan."
      : params?.error;
  const next = params?.next ?? "/dashboard";

  return (
    <main className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 150px)" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <section className="sectionTitle" style={{ textAlign: "center", width: "100%" }}>
          <div style={{ width: "100%" }}>
            <span className="eyebrow">Welcome back</span>
            <h1 style={{ textAlign: "center" }}>Log in to your account.</h1>
          </div>
        </section>
        {message ? <p className="notice warning" style={{ width: "100%", margin: "0 0 14px" }}>{message}</p> : null}
        <article className="card authCard" style={{ width: "100%" }}>
          <strong>Log in</strong>
          <form action={loginAction} className="formGrid">
            <input name="next" type="hidden" value={next} />
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button className="button" type="submit">
              Log in
            </button>
          </form>
          <p className="muted" style={{ marginTop: "12px" }}>
            Don't have an account?{" "}
            <Link className="textLink" href="/signup">
              Sign up
            </Link>
          </p>
        </article>
      </div>
    </main>
  );
}
