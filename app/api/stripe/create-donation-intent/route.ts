import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";

const donationSchema = z.object({
  amount: z.number().int().min(100).max(1000000),
  currency: z.string().default("gbp"),
  charityId: z.string().uuid()
});

export async function POST(request: Request) {
  const body = donationSchema.safeParse(await request.json().catch(() => ({})));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const intent = await stripe.paymentIntents.create({
    amount: body.data.amount,
    currency: body.data.currency.toLowerCase(),
    automatic_payment_methods: {
      enabled: true
    },
    metadata: {
      supabase_user_id: user.id,
      charity_id: body.data.charityId
    }
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}
