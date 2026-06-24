import Stripe from "stripe";
import { getEnv } from "@/lib/env";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_build_placeholder";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
  appInfo: {
    name: "Golf Charity Draw Platform",
    version: "0.1.0"
  }
});

export function priceForPlan(plan: string) {
  if (plan === "monthly") return getEnv("STRIPE_PRICE_ID_MONTHLY");
  if (plan === "yearly") return getEnv("STRIPE_PRICE_ID_YEARLY");
  throw new Error("Invalid subscription plan");
}

export function planForPrice(priceId: string | null | undefined) {
  if (priceId === getEnv("STRIPE_PRICE_ID_MONTHLY")) return "monthly";
  if (priceId === getEnv("STRIPE_PRICE_ID_YEARLY")) return "yearly";
  return null;
}
