"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User, Settings, CreditCard } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { url?: string; error?: string };
  } catch {
    return { error: text };
  }
}

export default function UserMenu({ userName }: { userName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {/* Settings / Manage Subscription Button in header */}
      <button
        onClick={openPortal}
        title="Manage Subscription"
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "8px",
          color: "var(--muted)",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--gold)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--muted)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        }}
      >
        <Settings size={18} />
      </button>

      {/* User profile dropdown menu */}
      <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            minHeight: "38px",
            gap: "8px",
            borderRadius: "8px",
            padding: "0 12px",
            color: "var(--ink)",
            background: isOpen ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "inherit"
          }}
        >
          <User size={16} style={{ color: "var(--mint)" }} />
          <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userName}
          </span>
        </button>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              zIndex: 100,
              minWidth: "180px",
              overflow: "hidden",
              padding: "4px"
            }}
          >
            {/* Manage Subscription Button in Dropdown */}
            <button
              onClick={openPortal}
              style={{
                width: "100%",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--muted)",
                background: "none",
                border: "none",
                borderRadius: "6px",
                textAlign: "left",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              <CreditCard size={14} style={{ color: "var(--gold)" }} />
              <span>Billing Settings</span>
            </button>

            {/* Logout Button */}
            <form action={logoutAction} style={{ width: "100%" }}>
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--rose)",
                  background: "none",
                  border: "none",
                  borderRadius: "6px",
                  textAlign: "left",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(230, 111, 138, 0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
