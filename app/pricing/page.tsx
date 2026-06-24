import Link from "next/link";
import { CheckoutButton } from "@/components/CheckoutButton";

type PricingPageProps = {
  searchParams?: Promise<{
    checkout?: string;
    reason?: string;
  }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;
  const isSuccess = params?.checkout === "success";
  const isSubscriptionRequired = params?.reason === "subscription-required";

  return (
    <main className="page">
      {isSuccess && (
        <div className="notice" style={{ marginBottom: "24px" }}>
          <strong>Subscription Activated!</strong> Thank you for your support. Your payment has been processed successfully and your account is being updated.
          <Link href="/dashboard" className="textLink" style={{ marginLeft: "10px", textDecoration: "underline" }}>
            Go to your Dashboard →
          </Link>
        </div>
      )}

      {isSubscriptionRequired && (
        <div className="notice warning" style={{ marginBottom: "24px" }}>
          An active subscription is required to access the dashboard and draw features. Please choose one of the plans below to subscribe.
        </div>
      )}

      <section className="sectionTitle">
        <div>
          <span className="eyebrow">Subscription</span>
          <h1>Choose a draw plan.</h1>
        </div>
      </section>
      <section className="grid two">
        <article className="card">
          <strong>Monthly</strong>
          <p>Recurring monthly access to score entry, dashboard, draw entries, and charity allocation.</p>
          <CheckoutButton plan="monthly" />
        </article>
        <article className="card">
          <strong>Yearly</strong>
          <p>Discounted annual access with the same real-time subscription checks and webhook-backed status.</p>
          <CheckoutButton plan="yearly" />
        </article>
      </section>
    </main>
  );
}
