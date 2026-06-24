import { CheckoutButton } from "@/components/CheckoutButton";

export default function PricingPage() {
  return (
    <main className="page">
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
