"use client";

import { CreditCard } from "lucide-react";

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as { url?: string; error?: string };
  } catch {
    return { error: text };
  }
}

export function CheckoutButton({ plan }: { plan: "monthly" | "yearly" }) {
  async function startCheckout() {
    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan })
    });
    const data = await readJsonResponse(response);

    if (response.status === 401) {
      window.location.href = `/login?reason=checkout&next=${encodeURIComponent("/pricing")}`;
      return;
    }

    if (!response.ok || !data.url) {
      alert(data.error ?? "Unable to start checkout");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <button className="button" type="button" onClick={startCheckout}>
      <CreditCard size={17} /> Choose {plan}
    </button>
  );
}

export function BillingPortalButton() {
  async function openPortal() {
    const response = await fetch("/api/stripe/create-portal-session", { method: "POST" });
    const data = await readJsonResponse(response);

    if (response.status === 401) {
      window.location.href = `/login?reason=checkout&next=${encodeURIComponent("/dashboard")}`;
      return;
    }

    if (!response.ok || !data.url) {
      alert(data.error ?? "Unable to open billing portal");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <button className="button secondary" type="button" onClick={openPortal}>
      <CreditCard size={17} /> Manage billing
    </button>
  );
}
