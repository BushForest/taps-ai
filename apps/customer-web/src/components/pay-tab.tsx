"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GetSessionStatusResponse } from "@taps/contracts";
import {
  createPayer,
  fetchGuestSummary,
  isApiError,
  splitByItem,
  splitCustomAmount,
  splitEvenly,
} from "../lib/api-client";
import {
  formatCurrency,
  lineWithChildrenGross,
  rootPayableLines,
} from "../lib/format";
import { StaleCheckBanner } from "./stale-check-banner";

type SplitMode = "even" | "by_item" | "custom_amount" | "whole";

const TIP_OPTIONS = [
  { label: "15%", value: 0.15 },
  { label: "18%", value: 0.18 },
  { label: "20%", value: 0.20 },
  { label: "Custom", value: -1 },
];

export function PayTab(props: {
  publicToken: string;
  initialSummary: GetSessionStatusResponse;
  initialMode?: SplitMode;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(props.initialSummary);
  const [mode, setMode] = useState<SplitMode>(props.initialMode ?? "even");
  const [partySize, setPartySize] = useState(Math.max(summary.payers?.length ?? 0, 2));
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [customAmountMode, setCustomAmountMode] = useState<"dollar" | "percent">("dollar");
  const [tipRate, setTipRate] = useState(0.18);
  const [customTip, setCustomTip] = useState("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [customTipMode, setCustomTipMode] = useState<"dollar" | "percent">("dollar");
  const [payMethod, setPayMethod] = useState<"apple" | "google" | "card" | null>(null);
  const [receiptContact, setReceiptContact] = useState("");
  const [receiptConsent, setReceiptConsent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [staleMessage, setStaleMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const check = summary.check;
  const remainingCents = summary.settlement?.remainingBalanceCents ?? check?.remainingBalanceCents ?? 0;
  const rootLines = useMemo(() => rootPayableLines(check?.lines ?? []), [check?.lines]);
  const itemCount = rootLines.length;

  const evenAmount = partySize > 0 ? Math.ceil(remainingCents / Math.max(partySize, 1)) : 0;
  const byItemAmount = useMemo(
    () => selectedLineIds.reduce((sum, id) => sum + lineWithChildrenGross(check?.lines ?? [], id), 0),
    [check?.lines, selectedLineIds]
  );
  const customAmountCents = Math.max(
    customAmountMode === "percent"
      ? Math.round(remainingCents * (Number(customAmount || 0) / 100))
      : Math.round(Number(customAmount || 0) * 100),
    0
  );

  const baseCents =
    mode === "whole" ? remainingCents :
    mode === "even" ? evenAmount :
    mode === "by_item" ? byItemAmount :
    customAmountCents;

  // Extract tax already embedded in baseCents (remaining balance includes tax)
  const checkTaxRate = check && check.subtotalCents > 0
    ? check.taxCents / check.subtotalCents
    : 0.08;
  const taxCents = Math.round(baseCents * checkTaxRate / (1 + checkTaxRate));
  const preTaxBase = baseCents - taxCents;

  // Tip is calculated on pre-tax amount
  const activeTipRate = isCustomTip ? 0 : tipRate;
  const customTipCents = isCustomTip
    ? customTipMode === "percent"
      ? Math.round(preTaxBase * (Number(customTip || 0) / 100))
      : Math.round(Number(customTip || 0) * 100)
    : 0;
  const tipCents = isCustomTip ? customTipCents : Math.round(preTaxBase * activeTipRate);
  const totalCents = baseCents + tipCents;

  const modeLabel =
    mode === "whole" ? "Whole Tab" :
    mode === "even" ? "Split Evenly" :
    mode === "by_item" ? "My Items" :
    "Custom";

  function toggleLine(id: string) {
    setSelectedLineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function refreshSummary() {
    const next = await fetchGuestSummary(props.publicToken);
    setSummary(next);
    return next;
  }

  async function ensurePayer() {
    const existing = summary.payers?.find((p) => p.status !== "left");
    if (existing) return existing;
    const displayName = "Guest";
    const payer = await createPayer(props.publicToken, { displayName });
    await refreshSummary();
    return payer;
  }

  async function ensureEvenParticipants(payerId: string) {
    const latest = await refreshSummary();
    const current = latest.payers ?? [];
    if (current.some((p) => p.id === payerId) && current.length >= partySize) return;
    let count = current.length;
    while (count < partySize) {
      count += 1;
      await createPayer(props.publicToken, { displayName: `Guest ${count}` });
    }
    await refreshSummary();
  }

  async function handlePay() {
    if (!check) return;
    setErrorMessage(undefined);
    setStaleMessage(undefined);

    try {
      const payer = await ensurePayer();
      let response;

      if (mode === "whole" || mode === "custom_amount") {
        const amount = mode === "whole" ? remainingCents : customAmountCents;
        if (amount <= 0) { setErrorMessage("Enter a valid amount."); return; }
        response = await splitCustomAmount(props.publicToken, {
          payerId: payer.id,
          checkVersion: check.version,
          amountCents: amount,
        });
      } else if (mode === "even") {
        await ensureEvenParticipants(payer.id);
        const refreshed = await refreshSummary();
        if (!refreshed.check) throw new Error("Check unavailable.");
        response = await splitEvenly(props.publicToken, { checkVersion: refreshed.check.version });
      } else {
        if (selectedLineIds.length === 0) { setErrorMessage("Choose at least one item to pay for."); return; }
        response = await splitByItem(props.publicToken, {
          payerId: payer.id,
          checkVersion: check.version,
          lineItemIds: selectedLineIds,
        });
      }

      const payerAmount = response.allocationPlan.entries
        .filter((e) => e.payerId === payer.id)
        .reduce((s, e) => s + e.assignedCents, 0);

      const receiptParam = `&receipt=${encodeURIComponent(receiptContact.trim())}`;
      const methodParam = payMethod ? `&method=${payMethod}` : "";
      router.push(
        `/session/${props.publicToken}/pay?payerId=${encodeURIComponent(payer.id)}&planId=${encodeURIComponent(response.allocationPlan.id)}&amountCents=${payerAmount}&checkVersion=${response.check.version}&mode=${mode}${methodParam}${receiptParam}`
      );
    } catch (err) {
      if (isApiError(err) && err.code === "STALE_CHECK_VERSION") {
        const refreshed = await refreshSummary();
        setStaleMessage(`Bill updated to version ${refreshed.check?.version ?? "new"}. Please review before paying.`);
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Unable to build payment right now.");
    }
  }

  const receiptValid = receiptContact.trim().length > 0 && receiptConsent;

  const canPay =
    !isPending &&
    !!check &&
    payMethod !== null &&
    receiptValid &&
    (mode === "whole" ? remainingCents > 0 :
     mode === "even" ? evenAmount > 0 :
     mode === "by_item" ? byItemAmount > 0 :
     customAmountCents > 0);

  return (
    <div style={{ display: "grid", gap: 14, paddingBottom: 100 }}>
      {staleMessage ? <StaleCheckBanner message={staleMessage} /> : null}

      {/* Heading */}
      <h1 className="pay-page-heading">How do you want to pay?</h1>

      {/* MY TAB Card */}
      <div className="my-tab-card">
        <div>
          <p className="my-tab-card__label">MY TAB</p>
          <p className="my-tab-card__amount">{formatCurrency(remainingCents)}</p>
        </div>
        <p className="my-tab-card__sub">
          {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? "s" : ""}` : ""}
          {summary.settlement?.tableComplete ? " · Settled" : ""}
        </p>
      </div>

      {/* Pay Whole Tab */}
      <div
        className={`pay-section${mode === "whole" ? " pay-section--selected" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => setMode("whole")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setMode("whole"); }}
      >
        <div className="pay-section__header" style={{ cursor: "pointer" }}>
          <div>
            <span className="pay-section__title">Pay Whole Tab</span>
            <span className="pay-section__subtitle">Pay the entire bill at once</span>
          </div>
          <div className="pay-section__header-right">
            {mode === "whole" ? <span className="selected-badge">✓ SELECTED</span> : null}
            <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 700 }}>{formatCurrency(remainingCents)}</span>
            <span className={`chevron${mode === "whole" ? " chevron--up" : ""}`}>▼</span>
          </div>
        </div>
        {mode === "whole" ? (
          <div className="pay-section__body">
            <div className="pay-section__full-tab-row">
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Full tab amount</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>{formatCurrency(remainingCents)}</span>
            </div>
            <TipSelector
              tipRate={tipRate}
              setTipRate={(r) => { setTipRate(r); setIsCustomTip(false); }}
              isCustom={isCustomTip}
              customTip={customTip}
              setCustomTip={setCustomTip}
              customTipMode={customTipMode}
              setCustomTipMode={(m) => { setCustomTipMode(m); setCustomTip(""); }}
              onCustomSelect={() => setIsCustomTip(true)}
              baseCents={remainingCents}
            />
            <TotalBreakdown preTax={preTaxBase} tax={taxCents} tip={tipCents} total={totalCents} />
          </div>
        ) : null}
      </div>

      {/* Split Evenly */}
      <div className={`pay-section${mode === "even" ? " pay-section--selected" : ""}`}>
        <div
          className="pay-section__header"
          role="button"
          tabIndex={0}
          onClick={() => setMode("even")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setMode("even"); }}
        >
          <div>
            <span className="pay-section__title">Split Evenly</span>
            <span className="pay-section__subtitle">Divide total equally among the table</span>
          </div>
          <div className="pay-section__header-right">
            {mode === "even" ? <span className="selected-badge">✓ SELECTED</span> : null}
            <span className={`chevron${mode === "even" ? " chevron--up" : ""}`}>▼</span>
          </div>
        </div>
        {mode === "even" ? (
          <div className="pay-section__body">
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                How many people?
              </p>
              <div className="people-picker">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setPartySize(Math.max(1, partySize - 1))}
                  disabled={partySize <= 1}
                >−</button>
                <span className="people-picker__count">{partySize === 1 ? "1 person" : `${partySize} people`}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setPartySize(partySize + 1)}
                >+</button>
              </div>
              {evenAmount > 0 ? (
                <p className="people-picker__each" style={{ marginTop: 12 }}>
                  Each person pays {formatCurrency(evenAmount)}
                </p>
              ) : null}
            </div>
            <TipSelector
              tipRate={tipRate}
              setTipRate={(r) => { setTipRate(r); setIsCustomTip(false); }}
              isCustom={isCustomTip}
              customTip={customTip}
              setCustomTip={setCustomTip}
              customTipMode={customTipMode}
              setCustomTipMode={(m) => { setCustomTipMode(m); setCustomTip(""); }}
              onCustomSelect={() => setIsCustomTip(true)}
              baseCents={evenAmount}
            />
            <TotalBreakdown preTax={preTaxBase} tax={taxCents} tip={tipCents} total={totalCents} />
          </div>
        ) : null}
      </div>

      {/* Pay for My Items */}
      <div className={`pay-section${mode === "by_item" ? " pay-section--selected" : ""}`}>
        <div
          className="pay-section__header"
          role="button"
          tabIndex={0}
          onClick={() => setMode("by_item")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setMode("by_item"); }}
        >
          <div>
            <span className="pay-section__title">Pay for My Items</span>
            <span className="pay-section__subtitle">Only pay for what you ordered</span>
          </div>
          <div className="pay-section__header-right">
            {mode === "by_item" ? <span className="selected-badge">✓ SELECTED</span> : null}
            <span className={`chevron${mode === "by_item" ? " chevron--up" : ""}`}>▼</span>
          </div>
        </div>
        {mode === "by_item" ? (
          <div className="pay-section__body">
            {rootLines.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>No items on the tab yet.</p>
            ) : (
              <div className="line-list">
                {rootLines.map((line) => {
                  const amount = lineWithChildrenGross(check?.lines ?? [], line.id);
                  const selected = selectedLineIds.includes(line.id);
                  const done = line.assignmentStatus === "fully_assigned";
                  return (
                    <label
                      key={line.id}
                      className={done ? "line-card line-card--done" : selected ? "line-card line-card--selected" : "line-card"}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: done ? "not-allowed" : "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={done}
                          onChange={() => toggleLine(line.id)}
                          style={{ accentColor: "var(--gold)" }}
                        />
                        <span style={{ fontSize: 14 }}>{line.name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{formatCurrency(amount)}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {byItemAmount > 0 ? (
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold-text)", textAlign: "center" }}>
                My total: {formatCurrency(byItemAmount)}
              </div>
            ) : null}
            <TipSelector
              tipRate={tipRate}
              setTipRate={(r) => { setTipRate(r); setIsCustomTip(false); }}
              isCustom={isCustomTip}
              customTip={customTip}
              setCustomTip={setCustomTip}
              customTipMode={customTipMode}
              setCustomTipMode={(m) => { setCustomTipMode(m); setCustomTip(""); }}
              onCustomSelect={() => setIsCustomTip(true)}
              baseCents={byItemAmount}
            />
            <TotalBreakdown preTax={preTaxBase} tax={taxCents} tip={tipCents} total={totalCents} />
          </div>
        ) : null}
      </div>

      {/* Custom Amount */}
      <div className={`pay-section${mode === "custom_amount" ? " pay-section--selected" : ""}`}>
        <div
          className="pay-section__header"
          role="button"
          tabIndex={0}
          onClick={() => setMode("custom_amount")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setMode("custom_amount"); }}
        >
          <div>
            <span className="pay-section__title">Custom Amount</span>
            <span className="pay-section__subtitle">Enter exactly what you want to pay</span>
          </div>
          <div className="pay-section__header-right">
            {mode === "custom_amount" ? <span className="selected-badge">✓ SELECTED</span> : null}
            <span className={`chevron${mode === "custom_amount" ? " chevron--up" : ""}`}>▼</span>
          </div>
        </div>
        {mode === "custom_amount" ? (
          <div className="pay-section__body">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="custom-amount-toggle">
                <button
                  type="button"
                  className={`custom-amount-toggle__btn${customAmountMode === "dollar" ? " custom-amount-toggle__btn--active" : ""}`}
                  onClick={() => { setCustomAmountMode("dollar"); setCustomAmount(""); }}
                >$</button>
                <button
                  type="button"
                  className={`custom-amount-toggle__btn${customAmountMode === "percent" ? " custom-amount-toggle__btn--active" : ""}`}
                  onClick={() => { setCustomAmountMode("percent"); setCustomAmount(""); }}
                >%</button>
              </div>
              <input
                type="number"
                inputMode="decimal"
                className="input"
                placeholder={customAmountMode === "dollar" ? "0.00" : "0"}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="0"
                max={customAmountMode === "percent" ? "100" : undefined}
                step={customAmountMode === "dollar" ? "0.01" : "1"}
                style={{ flex: 1, fontSize: 24, fontWeight: 800 }}
              />
            </div>
            {customAmountMode === "percent" && customAmountCents > 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                = {formatCurrency(customAmountCents)} of {formatCurrency(remainingCents)}
              </p>
            ) : null}
            <TipSelector
              tipRate={tipRate}
              setTipRate={(r) => { setTipRate(r); setIsCustomTip(false); }}
              isCustom={isCustomTip}
              customTip={customTip}
              setCustomTip={setCustomTip}
              customTipMode={customTipMode}
              setCustomTipMode={(m) => { setCustomTipMode(m); setCustomTip(""); }}
              onCustomSelect={() => setIsCustomTip(true)}
              baseCents={customAmountCents}
            />
            <TotalBreakdown preTax={preTaxBase} tax={taxCents} tip={tipCents} total={totalCents} />
          </div>
        ) : null}
      </div>

      {/* Payment Method Selector */}
      <div className="pay-method-section">
        <p className="pay-section-label">PAY WITH</p>
        <div className="pay-method-tiles">
          <button
            type="button"
            className={`pay-method-tile${payMethod === "apple" ? " pay-method-tile--selected" : ""}`}
            onClick={() => setPayMethod("apple")}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>&#63743;</span>
            <span>Apple Pay</span>
          </button>
          <button
            type="button"
            className={`pay-method-tile${payMethod === "google" ? " pay-method-tile--selected" : ""}`}
            onClick={() => setPayMethod("google")}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M43.6 20H24v8h11.3C33.6 32.5 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 13 5 4 14 4 24s9 19 20 19c10 0 19-7 19-19 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5c-7.7 0-14.3 4.2-17.7 9.7z"/>
              <path fill="#FBBC05" d="M24 43c5.2 0 9.7-1.7 13-4.7l-6-5c-1.9 1.3-4.3 2.1-7 2.1-5.2 0-9.5-3.5-11.1-8.2l-6.5 5C6 38.2 14.5 43 24 43z"/>
              <path fill="#EA4335" d="M43.6 20H24v8h11.3c-.8 2.2-2.3 4-4.3 5.3l6 5c3.5-3.2 5.6-8 5.6-14.3 0-1.3-.1-2.7-.4-4z"/>
            </svg>
            <span>Google Pay</span>
          </button>
          <button
            type="button"
            className={`pay-method-tile${payMethod === "card" ? " pay-method-tile--selected" : ""}`}
            onClick={() => setPayMethod("card")}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>💳</span>
            <span>Card</span>
          </button>
        </div>

        {/* Receipt contact */}
        <div className="receipt-row">
          <input
            type="text"
            className="input receipt-input"
            placeholder="Email or phone for receipt"
            value={receiptContact}
            onChange={(e) => setReceiptContact(e.target.value)}
            inputMode="email"
          />
          <label className="receipt-consent">
            <input
              type="checkbox"
              checked={receiptConsent}
              onChange={(e) => setReceiptConsent(e.target.checked)}
              style={{ accentColor: "var(--gold)", width: 15, height: 15, flexShrink: 0, marginTop: 1 }}
            />
            <span>
              I consent to receive my receipt at the contact provided. By submitting, I agree to Black+Blue&apos;s{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="receipt-consent__link">Terms</a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="receipt-consent__link">Privacy Policy</a>.
              Standard messaging rates may apply.
            </span>
          </label>
        </div>
      </div>

      {errorMessage ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--red)", textAlign: "center" }}>{errorMessage}</p>
      ) : null}

      {/* Sticky Pay CTA */}
      <div className="pay-cta-bar">
        <button
          type="button"
          className="bb-btn-gold"
          disabled={!canPay}
          onClick={() => startTransition(() => void handlePay())}
        >
          {isPending ? (
            <span className="spinner" />
          ) : totalCents > 0 && payMethod ? (
            <>Pay {formatCurrency(totalCents)} · {payMethod === "apple" ? "Apple Pay" : payMethod === "google" ? "Google Pay" : "Credit / Debit Card"}</>
          ) : totalCents > 0 ? (
            <>Select a payment method above</>
          ) : (
            <>Add items to your order first</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Tip Selector ──────────────────────────────────────────── */
function TipSelector(props: {
  tipRate: number;
  setTipRate: (r: number) => void;
  isCustom: boolean;
  customTip: string;
  setCustomTip: (v: string) => void;
  customTipMode: "dollar" | "percent";
  setCustomTipMode: (m: "dollar" | "percent") => void;
  onCustomSelect: () => void;
  baseCents: number;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Tip
      </p>
      <div className="tip-row">
        {TIP_OPTIONS.map((opt) =>
          opt.value === -1 ? (
            <button
              key="custom"
              type="button"
              className={`tip-btn${props.isCustom ? " tip-btn--active" : ""}`}
              onClick={props.onCustomSelect}
            >
              Custom
            </button>
          ) : (
            <button
              key={opt.label}
              type="button"
              className={`tip-btn${!props.isCustom && props.tipRate === opt.value ? " tip-btn--active" : ""}`}
              onClick={() => props.setTipRate(opt.value)}
            >
              {opt.label}
            </button>
          )
        )}
      </div>
      {props.isCustom ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="custom-amount-toggle">
            <button
              type="button"
              className={`custom-amount-toggle__btn${props.customTipMode === "dollar" ? " custom-amount-toggle__btn--active" : ""}`}
              onClick={() => props.setCustomTipMode("dollar")}
            >$</button>
            <button
              type="button"
              className={`custom-amount-toggle__btn${props.customTipMode === "percent" ? " custom-amount-toggle__btn--active" : ""}`}
              onClick={() => props.setCustomTipMode("percent")}
            >%</button>
          </div>
          <input
            type="number"
            inputMode="decimal"
            className="input"
            style={{ flex: 1 }}
            placeholder={props.customTipMode === "dollar" ? "0.00" : "0"}
            value={props.customTip}
            onChange={(e) => props.setCustomTip(e.target.value)}
            min="0"
            max={props.customTipMode === "percent" ? "100" : undefined}
            step={props.customTipMode === "dollar" ? "0.01" : "1"}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ─── Total Breakdown ────────────────────────────────────────── */
function TotalBreakdown({ preTax, tax, tip, total }: { preTax: number; tax: number; tip: number; total: number }) {
  if (preTax <= 0) return null;
  return (
    <div style={{ display: "grid", gap: 0, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
      <div className="bill-summary-row">
        <span>Subtotal</span>
        <span>{formatCurrency(preTax)}</span>
      </div>
      <div className="bill-summary-row">
        <span>Tax</span>
        <span>{formatCurrency(tax)}</span>
      </div>
      <div className="bill-summary-row">
        <span>Tip</span>
        <span>{formatCurrency(tip)}</span>
      </div>
      <div className="bill-summary-row bill-summary-row--total">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
