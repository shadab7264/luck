"use client";

import { useActionState, useState } from "react";
import { HeartHandshake, Edit2, Trash2, Check, X, Search, Star, AlertTriangle, Loader2 } from "lucide-react";
import { updateCharityAction, deleteCharityAction } from "@/app/admin/actions";

interface Charity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_featured: boolean;
  is_active: boolean;
}

const initialState = { ok: false, message: "" };

export default function ManageCharities({ initialCharities }: { initialCharities: Charity[] }) {
  const [charities, setCharities] = useState<Charity[]>(initialCharities);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "featured">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Sync state if initialCharities changes
  if (initialCharities.length !== charities.length && editingId === null) {
    setCharities(initialCharities);
  }

  const filteredCharities = charities.filter((charity) => {
    const matchesSearch =
      charity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (charity.description && charity.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      charity.slug.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "active") return charity.is_active;
    if (statusFilter === "inactive") return !charity.is_active;
    if (statusFilter === "featured") return charity.is_featured;
    return true;
  });

  return (
    <section className="formGrid" style={{ gap: "20px" }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div className="panel formRow" style={{ padding: "16px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", margin: 0 }}>
            <Search size={16} style={{ color: "var(--muted)" }} />
            <input
              type="search"
              placeholder="Search by name, description, or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ minHeight: "38px" }}
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["all", "active", "inactive", "featured"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`button secondary ${statusFilter === filter ? "" : "inactive"}`}
              style={{
                minHeight: "38px",
                padding: "0 12px",
                textTransform: "capitalize",
                background: statusFilter === filter ? "linear-gradient(135deg, var(--gold), var(--mint))" : "rgba(255, 255, 255, 0.05)",
                color: statusFilter === filter ? "#08110f" : "var(--muted)"
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="table">
        <div className="tableRow tableHead">
          <span>Charity</span>
          <span>Description</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {filteredCharities.length === 0 ? (
          <div className="tableRow" style={{ gridTemplateColumns: "1fr", textAlign: "center", padding: "32px" }}>
            <p className="muted" style={{ margin: 0 }}>No charities match your search criteria.</p>
          </div>
        ) : (
          filteredCharities.map((charity) => {
            const isEditing = editingId === charity.id;
            const isConfirmingDelete = confirmingDeleteId === charity.id;

            if (isEditing) {
              return (
                <EditCharityRow
                  key={charity.id}
                  charity={charity}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            if (isConfirmingDelete) {
              return (
                <DeleteCharityRow
                  key={charity.id}
                  charity={charity}
                  onCancel={() => setConfirmingDeleteId(null)}
                />
              );
            }

            return (
              <div className="tableRow" key={charity.id} style={{ alignItems: "center" }}>
                {/* Column 1: Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {charity.logo_url ? (
                    <img
                      src={charity.logo_url}
                      alt={charity.name}
                      style={{
                        width: "36px",
                        height: "36px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid var(--line)"
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.06)",
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid var(--line)",
                        color: "var(--gold)"
                      }}
                    >
                      <HeartHandshake size={18} />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {charity.name}
                    </strong>
                    <span className="muted" style={{ fontSize: "0.78rem" }}>
                      /{charity.slug}
                    </span>
                  </div>
                </div>

                {/* Column 2: Description */}
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--muted)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {charity.description || "No description yet."}
                </span>

                {/* Column 3: Status */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {charity.is_featured && (
                    <span className="statusPill" style={{ color: "var(--gold)", borderColor: "rgba(242, 191, 93, 0.3)", background: "rgba(242, 191, 93, 0.08)" }}>
                      <Star size={12} fill="var(--gold)" /> Featured
                    </span>
                  )}
                  {charity.is_active ? (
                    <span className="statusPill" style={{ color: "var(--mint)", borderColor: "rgba(111, 231, 192, 0.3)", background: "rgba(111, 231, 192, 0.08)" }}>
                      Active
                    </span>
                  ) : (
                    <span className="statusPill" style={{ color: "var(--rose)", borderColor: "rgba(230, 111, 138, 0.3)", background: "rgba(230, 111, 138, 0.08)" }}>
                      Inactive
                    </span>
                  )}
                </div>

                {/* Column 4: Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="button secondary"
                    onClick={() => setEditingId(charity.id)}
                    style={{ minHeight: "36px", padding: "0 10px", gap: "6px", fontSize: "0.85rem" }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setConfirmingDeleteId(charity.id)}
                    style={{ minHeight: "36px", padding: "0 10px", gap: "6px", color: "var(--rose)", borderColor: "rgba(230, 111, 138, 0.2)", fontSize: "0.85rem" }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function EditCharityRow({ charity, onCancel }: { charity: Charity; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(updateCharityAction, initialState);

  // Close editing view if successfully updated
  if (state.ok && !pending) {
    onCancel();
  }

  return (
    <div className="tableRow" style={{ gridTemplateColumns: "1fr", padding: "20px", background: "rgba(255,255,255,0.02)" }}>
      <form action={formAction} className="formGrid">
        <input type="hidden" name="id" value={charity.id} />
        
        <strong style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--gold)" }}>
          <Edit2 size={16} /> Edit Charity: {charity.name}
        </strong>

        <div className="formRow">
          <label>
            Charity name
            <input name="name" type="text" defaultValue={charity.name} required placeholder="Golf Foundation" />
          </label>
          <label>
            Slug
            <input name="slug" type="text" defaultValue={charity.slug} placeholder="golf-foundation" />
          </label>
        </div>

        <div className="formRow">
          <label style={{ flex: 2 }}>
            Description
            <input name="description" type="text" defaultValue={charity.description || ""} placeholder="What this charity supports" />
          </label>
          <label style={{ flex: 1 }}>
            Logo URL
            <input name="logoUrl" type="url" defaultValue={charity.logo_url || ""} placeholder="https://example.com/logo.png" />
          </label>
        </div>

        <div className="inlineActions" style={{ justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <div style={{ display: "flex", gap: "16px" }}>
            <label className="checkControl" style={{ cursor: "pointer" }}>
              <input name="isFeatured" type="checkbox" defaultChecked={charity.is_featured} /> Featured
            </label>
            <label className="checkControl" style={{ cursor: "pointer" }}>
              <input name="isActive" type="checkbox" defaultChecked={charity.is_active} /> Active
            </label>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="button secondary"
              type="button"
              onClick={onCancel}
              disabled={pending}
              style={{ minHeight: "38px" }}
            >
              <X size={15} /> Cancel
            </button>
            <button
              className="button"
              type="submit"
              disabled={pending}
              style={{ minHeight: "38px" }}
            >
              {pending ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={15} /> Save changes
                </>
              )}
            </button>
          </div>
        </div>

        {state.message && (
          <p className={state.ok ? "notice" : "notice warning"} style={{ margin: "10px 0 0" }}>
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}

function DeleteCharityRow({ charity, onCancel }: { charity: Charity; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(deleteCharityAction, initialState);

  return (
    <div className="tableRow" style={{ gridTemplateColumns: "1fr", padding: "20px", background: "rgba(230, 111, 138, 0.05)", borderLeft: "4px solid var(--rose)" }}>
      <form action={formAction} className="formGrid">
        <input type="hidden" name="id" value={charity.id} />
        
        <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
          <AlertTriangle size={24} style={{ color: "var(--rose)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ color: "var(--rose)", fontSize: "1.1rem" }}>Delete "{charity.name}"?</strong>
            <p className="muted" style={{ margin: "4px 0 12px", fontSize: "0.9rem" }}>
              Are you sure you want to permanently delete this charity? This action cannot be undone. If this charity has users or allocations, deletion will fail. Consider setting it to <strong>Inactive</strong> instead.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            className="button secondary"
            type="button"
            onClick={onCancel}
            disabled={pending}
            style={{ minHeight: "38px" }}
          >
            Cancel
          </button>
          <button
            className="button"
            type="submit"
            disabled={pending}
            style={{ minHeight: "38px", background: "var(--rose)", color: "#fff" }}
          >
            {pending ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Deleting...
              </>
            ) : (
              "Yes, delete permanently"
            )}
          </button>
        </div>

        {state.message && (
          <p className="notice warning" style={{ margin: "10px 0 0" }}>
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
