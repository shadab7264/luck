"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";

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

  return (
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
            minWidth: "150px",
            overflow: "hidden",
            padding: "4px"
          }}
        >
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
  );
}
