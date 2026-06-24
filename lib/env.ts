const requiredServerVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_MONTHLY",
  "STRIPE_PRICE_ID_YEARLY",
  "NEXT_PUBLIC_SITE_URL"
] as const;

export function getEnv(name: (typeof requiredServerVars)[number] | "STRIPE_PUBLISHABLE_KEY" | "RESEND_API_KEY" | "RESEND_FROM_EMAIL") {
  const value = process.env[name];

  if (!value && requiredServerVars.includes(name as (typeof requiredServerVars)[number])) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value ?? "";
}

export function getSiteUrl() {
  return getEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
}
