import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendEmail } from "@/lib/email/send";
import { getEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { planForPrice, stripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

type StripeSubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

async function upsertSubscription(subscription: StripeSubscriptionWithPeriod) {
  const service = createServiceClient();
  const userId = subscription.metadata.supabase_user_id;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = planForPrice(priceId);

  if (!userId || !plan) return;

  await service.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan,
      status: subscription.status,
      currency: subscription.currency,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end
    },
    { onConflict: "stripe_subscription_id" }
  );
}

async function handleInvoiceSucceeded(invoice: InvoiceWithSubscription) {
  const service = createServiceClient();
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as StripeSubscriptionWithPeriod;
  await upsertSubscription(subscription);

  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  const { data: profile } = await service
    .from("profiles")
    .select("selected_charity_id,charity_contribution_pct,email")
    .eq("id", userId)
    .single();

  const amountPaid = invoice.amount_paid / 100;
  const charityPct = Number(profile?.charity_contribution_pct ?? 10);
  const charityAmount = Number(((amountPaid * charityPct) / 100).toFixed(2));
  const prizePoolAmount = Number((amountPaid - charityAmount).toFixed(2));
  const period = invoice.lines.data[0]?.period;

  await service.from("subscription_invoices").upsert(
    {
      user_id: userId,
      stripe_invoice_id: invoice.id,
      amount_paid: amountPaid,
      charity_amount: charityAmount,
      prize_pool_amount: prizePoolAmount,
      currency: invoice.currency,
      period_start: period?.start ? new Date(period.start * 1000).toISOString() : null,
      period_end: period?.end ? new Date(period.end * 1000).toISOString() : null
    },
    { onConflict: "stripe_invoice_id" }
  );

  if (profile?.selected_charity_id) {
    await service.from("charity_allocations").upsert(
      {
        user_id: userId,
        charity_id: profile.selected_charity_id,
        stripe_invoice_id: invoice.id,
        amount: charityAmount,
        currency: invoice.currency
      },
      { onConflict: "stripe_invoice_id" }
    );
  }
}

async function handleInvoiceFailed(invoice: InvoiceWithSubscription) {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const service = createServiceClient();
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as StripeSubscriptionWithPeriod;
  await upsertSubscription({ ...subscription, status: "past_due" });

  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  const { data: profile } = await service.from("profiles").select("email").eq("id", userId).single();
  if (profile?.email) {
    await sendEmail({
      to: profile.email,
      subject: "Payment failed",
      text: "Your subscription payment failed. Please update your billing details to keep score entry and draw access active."
    });
  }
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const userId = intent.metadata.supabase_user_id;
  const charityId = intent.metadata.charity_id;
  if (!userId || !charityId) return;

  await createServiceClient().from("donations").upsert(
    {
      user_id: userId,
      charity_id: charityId,
      amount: intent.amount_received / 100,
      currency: intent.currency,
      stripe_payment_intent_id: intent.id
    },
    { onConflict: "stripe_payment_intent_id" }
  );
}

function parseStripeEvent(rawBody: string, signature: string | null) {
  if (process.env.NODE_ENV === "development") {
    return JSON.parse(rawBody) as Stripe.Event;
  }

  if (!signature) {
    throw new Error("Missing Stripe signature");
  }

  return stripe.webhooks.constructEvent(rawBody, signature, getEnv("STRIPE_WEBHOOK_SECRET"));
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = parseStripeEvent(rawBody, signature);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from("webhook_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (subscriptionId) {
        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as StripeSubscriptionWithPeriod;
        await upsertSubscription(subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await upsertSubscription(event.data.object as StripeSubscriptionWithPeriod);
      break;
    case "invoice.payment_succeeded":
      await handleInvoiceSucceeded(event.data.object as InvoiceWithSubscription);
      break;
    case "invoice.payment_failed":
      await handleInvoiceFailed(event.data.object as InvoiceWithSubscription);
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    default:
      break;
  }

  await service.from("webhook_events").insert({
    stripe_event_id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>
  });

  return NextResponse.json({ received: true });
}
