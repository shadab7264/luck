import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteUrl } from "@/lib/env";
import { priceForPlan, stripe } from "@/lib/stripe/server";

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to create checkout session";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const { plan } = (await request.json().catch(() => ({}))) as { plan?: string };
    const price = priceForPlan(plan ?? "");
    const supabase = await createSupabaseServerClient();
    const service = createServiceClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("id,email,full_name,stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let customerId = profile.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? user.email ?? undefined,
        name: profile.full_name ?? undefined,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = customer.id;

      await service.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const siteUrl = getSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${siteUrl}/pricing?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id
        }
      },
      metadata: {
        supabase_user_id: user.id,
        plan: plan ?? ""
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return jsonError(error);
  }
}
