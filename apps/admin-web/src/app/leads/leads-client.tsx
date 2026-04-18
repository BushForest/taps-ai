"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ApiError,
  searchLeads,
  fetchLeads,
  saveLead,
  updateLead,
  deleteLead,
} from "../../lib/api-client";
import type { Lead, ScoredLead, SearchLeadsResult } from "../../lib/api-client";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

const TIER_META: Record<ScoredLead["tier"], { color: string; label: string }> = {
  hot:      { color: "#22c55e", label: "Hot" },
  good:     { color: "#eab308", label: "Good" },
  possible: { color: "#6b7280", label: "Possible" },
  no_fit:   { color: "#ef4444", label: "No Fit" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TierBadge(props: { tier: ScoredLead["tier"] }) {
  const { color, label } = TIER_META[props.tier];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: color,
        color: "#000000",
      }}
    >
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LeadsClient() {
  // Search state
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [backend, setBackend] = useState<"google" | "yelp" | "auto">("auto");
  const [searchResult, setSearchResult] = useState<SearchLeadsResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState<string | null>(null);

  // Saved leads state
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const savedLeadNames = useMemo(
    () => new Set(savedLeads.map((l) => l.name.toLowerCase())),
    [savedLeads]
  );

  async function loadSavedLeads() {
    setLoadingLeads(true);
    setLeadsError(null);
    try {
      const rows = await fetchLeads();
      setSavedLeads(rows);
    } catch (e) {
      setLeadsError(e instanceof ApiError ? e.message : "Failed to load leads");
    } finally {
      setLoadingLeads(false);
    }
  }

  useEffect(() => {
    void loadSavedLeads();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const result = await searchLeads(query, location, backend);
      setSearchResult(result);
    } catch (e) {
      setSearchError(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleSave(result: ScoredLead) {
    setSavingName(result.name);
    try {
      const saved = await saveLead({
        name: result.name,
        city: location,
        state: null,
        address: null,
        phone: null,
        website: null,
        googlePlaceId: null,
        yelpUrl: null,
        categories: result.categories,
        priceRange: result.priceRange ?? null,
        rating: result.rating ?? null,
        reviewCount: result.reviewCount ?? null,
        score: result.score,
        tier: result.tier,
        scoreBreakdown: result.scoreBreakdown ?? null,
        fitReasons: result.fitReasons,
        warnings: result.warnings,
        posHint: result.posHint ?? null,
        status: "new",
        notes: null,
      });
      setSavedLeads((prev) => [saved, ...prev]);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSavingName(null);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const updated = await updateLead(id, { status });
      setSavedLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (e) {
      console.error("Status update failed", e);
    }
  }

  async function handleNotesBlur(id: string, notes: string, original: string | null) {
    if (notes === (original ?? "")) return;
    try {
      const updated = await updateLead(id, { notes });
      setSavedLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (e) {
      console.error("Notes update failed", e);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLead(id);
      setSavedLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  return (
    <div style={{ padding: "24px 20px", maxWidth: 760 }}>
      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: 0 }}>Find Leads</h1>
        <p style={{ fontSize: 13, color: "#888888", margin: "4px 0 0" }}>
          Search Google Places for restaurant prospects and save them to your pipeline.
        </p>
      </div>

      {/* ── Search bar ──────────────────────────────────────── */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          className="admin-input"
          style={{ flex: "2 1 180px" }}
          type="text"
          placeholder="Restaurant type or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <input
          className="admin-input"
          style={{ flex: "1 1 140px" }}
          type="text"
          placeholder="City or neighbourhood…"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
        <select
          className="admin-input"
          style={{ flex: "0 0 110px" }}
          value={backend}
          onChange={(e) => setBackend(e.target.value as "google" | "yelp" | "auto")}
        >
          <option value="auto">Auto</option>
          <option value="google">Google</option>
          <option value="yelp">Yelp</option>
        </select>
        <button
          type="submit"
          disabled={searching}
          style={{
            flex: "0 0 auto",
            padding: "0 18px",
            height: 42,
            background: "#ffffff",
            color: "#000000",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: searching ? "not-allowed" : "pointer",
            opacity: searching ? 0.6 : 1,
          }}
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {/* ── Search error ────────────────────────────────────── */}
      {searchError && (
        <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{searchError}</p>
      )}

      {/* ── Search results ──────────────────────────────────── */}
      {searchResult && (
        <div style={{ marginBottom: 32 }}>
          <p className="admin-section-label" style={{ marginBottom: 10 }}>
            {searchResult.source === "yelp_url"
              ? "Yelp search"
              : `${searchResult.results.length} result${searchResult.results.length !== 1 ? "s" : ""} via Google`}
          </p>

          {searchResult.source === "yelp_url" && searchResult.searchUrl && (
            <div className="promo-row">
              <span style={{ fontSize: 13, color: "#aaaaaa" }}>
                Yelp API key not configured.{" "}
                <a
                  href={searchResult.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#ffffff", textDecoration: "underline" }}
                >
                  Open Yelp search →
                </a>
              </span>
            </div>
          )}

          {searchResult.results.length === 0 && searchResult.source !== "yelp_url" && (
            <div style={{ color: "#555555", fontSize: 13, padding: "16px 0" }}>No results found.</div>
          )}

          {searchResult.results.map((result, i) => {
            const alreadySaved = savedLeadNames.has(result.name.toLowerCase());
            const isSaving = savingName === result.name;
            const btnDisabled = alreadySaved || isSaving;
            return (
              <div key={i} className="promo-row" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <TierBadge tier={result.tier} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff" }}>{result.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888888" }}>
                    {location}
                    {result.categories.length > 0 && ` · ${result.categories.slice(0, 3).join(", ")}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: "#aaaaaa" }}>{result.score} / 100</span>
                  <button
                    type="button"
                    disabled={btnDisabled}
                    onClick={() => void handleSave(result)}
                    style={{
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: btnDisabled ? "transparent" : "#ffffff",
                      color: btnDisabled ? "#555555" : "#000000",
                      border: btnDisabled ? "1px solid #333333" : "none",
                      borderRadius: 6,
                      cursor: btnDisabled ? "default" : "pointer",
                    }}
                  >
                    {alreadySaved ? "Saved" : isSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Saved leads ─────────────────────────────────────── */}
      <div>
        <p className="admin-section-label" style={{ marginBottom: 10 }}>
          Saved Leads ({savedLeads.length})
        </p>

        {loadingLeads && (
          <div style={{ color: "#555555", fontSize: 13, padding: "16px 0" }}>Loading…</div>
        )}

        {leadsError && (
          <p style={{ color: "#ef4444", fontSize: 13 }}>{leadsError}</p>
        )}

        {!loadingLeads && savedLeads.length === 0 && (
          <div style={{ color: "#555555", fontSize: 13, padding: "16px 0" }}>
            No leads saved yet. Search above and click Save.
          </div>
        )}

        {savedLeads.map((lead) => (
          <div
            key={lead.id}
            className="promo-row"
            style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}
          >
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <TierBadge tier={lead.tier} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#ffffff" }}>{lead.name}</span>
              <span style={{ fontSize: 12, color: "#aaaaaa", flexShrink: 0 }}>{lead.score} / 100</span>
            </div>

            {/* City + categories */}
            <div style={{ fontSize: 12, color: "#888888" }}>
              {lead.city}
              {lead.categories && lead.categories.length > 0 && ` · ${lead.categories.slice(0, 3).join(", ")}`}
            </div>

            {/* Controls row */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", flexWrap: "wrap" }}>
              <select
                className="admin-input"
                style={{ flex: "0 0 180px", fontSize: 12 }}
                value={lead.status}
                onChange={(e) => void handleStatusChange(lead.id, e.target.value)}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="demo_scheduled">Demo Scheduled</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
                <option value="not_interested">Not Interested</option>
              </select>

              {/* TODO: wire prefill when onboarding wizard is created */}
              <Link
                href={`/onboarding/new?prefill=1&name=${encodeURIComponent(lead.name)}&slug=${encodeURIComponent(slugify(lead.name))}` as Route}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#1a1a1a",
                  color: "#ffffff",
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                Start Onboarding →
              </Link>

              <button
                type="button"
                onClick={() => void handleDelete(lead.id)}
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  background: "transparent",
                  color: "#ef4444",
                  border: "1px solid #3a1a1a",
                  borderRadius: 6,
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                Delete
              </button>
            </div>

            {/* Notes */}
            <textarea
              className="admin-input"
              rows={2}
              placeholder="Add notes…"
              defaultValue={lead.notes ?? ""}
              onBlur={(e) => void handleNotesBlur(lead.id, e.target.value, lead.notes)}
              style={{ fontSize: 12, resize: "vertical", width: "100%" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
