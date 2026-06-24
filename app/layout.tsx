import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, LogIn, ShieldCheck, Trophy } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import UserMenu from "@/components/UserMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golf Charity Draw Platform",
  description: "Golf score entries, monthly prize draws, and charity contribution tracking."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  let isAdmin = false;
  let userName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,full_name")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
    userName = profile?.full_name || user.email || "User";
  }

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brandMark">
              <Trophy size={18} />
            </span>
            <span>Fairway Draw</span>
          </Link>
          <nav className="navLinks" aria-label="Primary">
            <Link href="/charities">
              <HeartHandshake size={16} /> Charities
            </Link>
            <Link href="/draws">
              <Trophy size={16} /> Draws
            </Link>
            <Link href="/dashboard">
              <ShieldCheck size={16} /> Dashboard
            </Link>
            {isAdmin && (
              <Link href="/admin" style={{ color: "var(--gold)", borderColor: "rgba(242, 191, 93, 0.4)", background: "rgba(242, 191, 93, 0.05)" }}>
                <ShieldCheck size={16} /> Admin
              </Link>
            )}
            {user ? (
              <UserMenu userName={userName} />
            ) : (
              <Link href="/login">
                <LogIn size={16} /> Login
              </Link>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
