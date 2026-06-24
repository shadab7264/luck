import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteUrl } from "@/lib/env";
import { stripe } from "@/lib/stripe/server";

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to create billing portal session";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const service = createServiceClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: profile } = await service.from("profiles").select("stripe_customer_id").eq("id", user.id).single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getSiteUrl()}/dashboard`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return jsonError(error);
  }
}
