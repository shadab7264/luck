export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Replace this with `supabase gen types typescript` output once a real project is connected.
export type Database = any;

export type Plan = "monthly" | "yearly";
export type DrawType = "random" | "algorithmic";
export type AlgorithmicMode = "most_frequent" | "least_frequent";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";
