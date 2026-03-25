"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GetSessionStatusResponse, Payer } from "@taps/contracts";
import { createPayer, fetchGuestSummary, isApiError, splitByItem, splitCustomAmount, splitEvenly } from "../lib/api-client";
import {
  childLines,
  formatCurrency,
  lineWithChildrenGross,
  rootPayableLines,
  titleCaseStatus
} from "../lib/format";
import { SectionCard } from "./section-card";
import { StaleCheckBanner } from "./stale-check-banner";
import { StatusPill } from "./status-pill";

type SplitMode = "even" | "by_item" | "custom_amount";

export function SplitFlow(props: {
  publicToken: string;
  initialSummary: GetSessionStatusResponse;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(props.initialSummary);
  const [mode, setMode] = useState<SplitMode>("even");
  const [newPayerName, setNewPayerName] = useState("You");
  const [selectedPayerId, setSelectedPayerId] = useState(summary.payers?.find((payer) => payer.status !== "left")?.id ?? "");
  const [partySize, setPartySize] = useState(Math.max(summary.payers?.length ?? 0, 1));
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [staleMessage, setStaleMessage] = useState<string | undefined>();
  const [submitState, setSubmitState] = useState<"idle" | "identifying" | "building">("idle");
  const [isPending, startTransition] = useTransition();

  const check = summary.check;
  const rootLines = useMemo(() => rootPayableLines(check?.lines ?? []), [check?.lines]);
  const selectedByItemAmount = useMemo(
    () => selectedLineIds.reduce((sum, lineId) => sum + lineWithChildrenGross(check?.lines ?? [], lineId), 0),
    [check?.lines, selectedLineIds]
  );
  const estimatedEvenSplitAmount =
    check && partySize > 0 ? Math.max(Math.ceil(check.remainingBalanceCents / Math.max(partySize, 1)), 0) : 0;
  const customAmountCents = Math.max(Math.round(Number(customAmount || 0) * 100), 0);
  const ctaAmountCents =
    mode === "even" ? estimatedEvenSplitAmount : mode === "by_item" ? selectedByItemAmount : customAmountCents;
  const unassignedCount = summary.check?.assignmentSummary.unassignedLineItemIds.length ?? 0;
  const tinyCount = summary.check?.assignmentSummary.unassignedTinyItemIds.length ?? 0;

  async function refreshSummary() {
    const nextSummary = await fetchGuestSummary(props.publicToken);
    setSummary(nextSummary);
    return nextSummary;
  }

  async function ensureCurrentPayer(): Promise<Payer> {
    const existing = summary.payers?.find((payer) => payer.id === selectedPayerId);
    if (existing) {
      return existing;
    }

    const fallbackName = newPayerName.trim() || "You";
    const payer = await createPayer(props.publicToken, { displayName: fallbackName });
    const nextSummary = await refreshSummary();
    setSelectedPayerId(payer.id);
    setPartySize(Math.max(nextSummary.payers?.length ?? 0, partySize));
    return payer;
  }

  async function ensureEvenSplitParticipants(currentPayer: Payer): Promise<void> {
    const latestSummary = await refreshSummary();
    const existingPayers = latestSummary.payers ?? [];
    const desiredPartySize = Math.max(partySize, 1);

    if (existingPayers.some((payer) => payer.id === currentPayer.id) && existingPayers.length >= desiredPartySize) {
      return;
    }

    let currentCount = existingPayers.length;
    while (currentCount < desiredPartySize) {
      currentCount += 1;
      await createPayer(props.publicToken, { displayName: currentCount === 1 ? "You" : `Guest ${currentCount}` });
    }
    await refreshSummary();
  }

  function toggleLine(lineId: string) {
    setSelectedLineIds((current) =>
      current.includes(lineId) ? current.filter((candidate) => candidate !== lineId) : [...current, lineId]
    );
  }

  async function submit() {
    if (!check) {
      return;
    }

    setErrorMessage(undefined);
    setStaleMessage(undefined);

    try {
      setSubmitState("identifying");
      const currentPayer = await ensureCurrentPayer();
      setSubmitState("building");
      let response;

      if (mode === "even") {
        await ensureEvenSplitParticipants(currentPayer);
        const refreshed = await refreshSummary();
        if (!refreshed.check) {
          throw new Error("Current check is unavailable.");
        }
        response = await splitEvenly(props.publicToken, {
          checkVersion: refreshed.check.version
        });
      } else if (mode === "by_item") {
        if (selectedLineIds.length === 0) {
          setErrorMessage("Choose at least one line before you continue.");
          setSubmitState("idle");
          return;
        }
        response = await splitByItem(props.publicToken, {
          payerId: currentPayer.id,
          checkVersion: check.version,
          lineItemIds: selectedLineIds
        });
      } else {
        if (!Number.isFinite(customAmountCents) || customAmountCents <= 0) {
          setErrorMessage("Enter a valid amount to contribute.");
          setSubmitState("idle");
          return;
        }
        response = await splitCustomAmount(props.publicToken, {
          payerId: currentPayer.id,
          checkVersion: check.version,
          amountCents: customAmountCents
        });
      }

      const payerAmountCents = response.allocationPlan.entries
        .filter((entry) => entry.payerId === currentPayer.id)
        .reduce((sum, entry) => sum + entry.assignedCents, 0);

      router.push(
        `/session/${props.publicToken}/pay?payerId=${encodeURIComponent(currentPayer.id)}&planId=${encodeURIComponent(
          response.allocationPlan.id
        )}&amountCents=${payerAmountCents}&checkVersion=${response.check.version}&mode=${mode}`
      );
    } catch (error) {
      if (isApiError(error) && error.code === "STALE_CHECK_VERSION") {
        const refreshed = await refreshSummary();
        setStaleMessage(
          `The bill changed to version ${refreshed.settlement?.checkVersion ?? refreshed.check?.version ?? "new"}. Review the latest balance before paying.`
        );
        setSubmitState("idle");
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "Unable to build your payment right now.");
    } finally {
      setSubmitState("idle");
    }
  }

  const ctaLabel =
    submitState === "identifying"
      ? "Getting your payer ready..."
      : submitState === "building"
        ? "Building your share..."
        : mode === "even"
          ? `Review ${formatCurrency(estimatedEvenSplitAmount)}`
          : mode === "by_item"
            ? selectedLineIds.length
              ? `Review ${formatCurrency(selectedByItemAmount)}`
              : "Choose items to review"
            : customAmountCents > 0
              ? `Review ${formatCurrency(customAmountCents)}`
              : "Enter your amount";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {staleMessage ? <StaleCheckBanner message={staleMessage} /> : null}

      <SectionCard eyebrow="Table Summary" title="What still needs to be covered">
        <div className="stat-grid">
          <article className="stat-card">
            <p className="stat-kicker">Left on table</p>
            <p className="stat-value">{formatCurrency(summary.settlement?.remainingBalanceCents ?? 0)}</p>
            <p className="stat-detail">This is the balance still left on the table.</p>
          </article>
          <article className="stat-card">
            <p className="stat-kicker">Still unclaimed</p>
            <p className="stat-value">{unassignedCount}</p>
            <p className="stat-detail">Unassigned lines keep the table open until someone claims them.</p>
          </article>
          <article className="stat-card">
            <p className="stat-kicker">Small extras</p>
            <p className="stat-value">{tinyCount}</p>
            <p className="stat-detail">Modifiers and condiments stay visible until they are covered.</p>
          </article>
          <article className="stat-card">
            <p className="stat-kicker">Assignment</p>
            <p className="stat-value" style={{ fontSize: "1.2rem" }}>
              {titleCaseStatus(summary.settlement?.assignmentCompleteness)}
            </p>
            <p className="stat-detail">Nothing gets hidden just because it is small.</p>
          </article>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Split Mode" title="How do you want to pay?">
        <div style={{ display: "grid", gap: 12 }}>
          <ModeButton
            active={mode === "even"}
            label="Split evenly"
            detail="Use the payer records already on this table and divide the current balance."
            onClick={() => setMode("even")}
          />
          <ModeButton
            active={mode === "by_item"}
            label="Pay by item"
            detail="Claim dishes directly. Attached modifiers follow the parent item automatically."
            onClick={() => setMode("by_item")}
          />
          <ModeButton
            active={mode === "custom_amount"}
            label="Enter a custom amount"
            detail="Contribute a precise amount while the remaining table balance stays visible."
            onClick={() => setMode("custom_amount")}
          />
        </div>
      </SectionCard>

      {mode === "even" ? (
        <SectionCard eyebrow="Even Split" title="How many people are splitting?">
          <label className="field-stack" style={{ maxWidth: 320 }}>
            <span>Total payers at the table</span>
            <input
              type="number"
              min={1}
              value={partySize}
              onChange={(event) => setPartySize(Math.max(Number(event.target.value) || 1, 1))}
              className="input-control"
            />
          </label>
          <p className="stat-detail" style={{ margin: 0 }}>
            Estimated share: {formatCurrency(estimatedEvenSplitAmount)} per payer.
          </p>
        </SectionCard>
      ) : null}

      {mode === "by_item" ? (
        <SectionCard eyebrow="Items" title="Choose the lines you are covering">
          <div className="line-list">
            {rootLines.map((line) => {
              const children = childLines(check?.lines ?? [], line.id);
              const selected = selectedLineIds.includes(line.id);
              const lineAmount = lineWithChildrenGross(check?.lines ?? [], line.id);
              const isDone = line.assignmentStatus === "fully_assigned" && children.every((child) => child.assignmentStatus === "fully_assigned");
              return (
                <label
                  key={line.id}
                  className={
                    isDone
                      ? "line-card line-card--done"
                      : selected
                        ? "line-card line-card--selected"
                        : line.assignmentStatus !== "fully_assigned"
                          ? "line-card line-card--warn"
                          : "line-card"
                  }
                >
                  <span className="inline-row">
                    <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={isDone}
                        onChange={() => toggleLine(line.id)}
                      />
                      <strong>{line.name}</strong>
                    </span>
                    <strong>{formatCurrency(lineAmount)}</strong>
                  </span>
                  <div className="line-meta">
                    <StatusPill value={line.assignmentStatus} />
                    {isDone ? <span className="muted">Already covered</span> : null}
                  </div>
                  {children.length ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {children.map((child) => (
                        <span key={child.id} className="stat-detail">
                          {child.name} / {formatCurrency(child.grossCents)} / {titleCaseStatus(child.assignmentStatus)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </label>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      {mode === "custom_amount" ? (
        <SectionCard eyebrow="Custom Amount" title="Enter what you want to contribute">
          <label className="field-stack" style={{ maxWidth: 320 }}>
            <span>Your amount</span>
            <input
              inputMode="decimal"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder="12.00"
              className="input-control"
            />
          </label>
          <p className="stat-detail" style={{ margin: 0 }}>
            After this payment, the table would still show {formatCurrency(Math.max((summary.settlement?.remainingBalanceCents ?? 0) - customAmountCents, 0))} remaining.
          </p>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="You" title="Who is paying this share">
        <div style={{ display: "grid", gap: 12 }}>
          {summary.payers?.length ? (
            <label className="field-stack">
              <span>Choose your payer record</span>
              <select
                value={selectedPayerId}
                onChange={(event) => setSelectedPayerId(event.target.value)}
                className="select-control"
              >
                <option value="">Create a new payer</option>
                {summary.payers.map((payer) => (
                  <option key={payer.id} value={payer.id}>
                    {payer.displayName} ({titleCaseStatus(payer.status)})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field-stack">
            <span>Your display name</span>
            <input
              value={newPayerName}
              onChange={(event) => setNewPayerName(event.target.value)}
              placeholder="Alex"
              className="input-control"
            />
          </label>
          <p className="stat-detail" style={{ margin: 0 }}>
            This name only helps keep the table readable for the group.
          </p>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Your Share" title={ctaAmountCents > 0 ? `Review ${formatCurrency(ctaAmountCents)}` : "Choose a share to review"}>
        <div className="stat-grid">
          <article className="stat-card">
            <p className="stat-kicker">Your amount</p>
            <p className="stat-value">{formatCurrency(ctaAmountCents)}</p>
            <p className="stat-detail">This is what you are about to review before payment.</p>
          </article>
          <article className="stat-card">
            <p className="stat-kicker">Table after you</p>
            <p className="stat-value">
              {formatCurrency(Math.max((summary.settlement?.remainingBalanceCents ?? 0) - ctaAmountCents, 0))}
            </p>
            <p className="stat-detail">The rest of the table can stay open even when your own share is done.</p>
          </article>
        </div>
      </SectionCard>

      {errorMessage ? (
        <SectionCard tone="warn" eyebrow="Can't continue yet" title="We need one quick fix">
          <p className="stat-detail warn-text" style={{ margin: 0 }}>
            {errorMessage}
          </p>
        </SectionCard>
      ) : null}

      <div className="sticky-cta">
        <button
          type="button"
          onClick={() => startTransition(() => void submit())}
          disabled={isPending || !check || ctaAmountCents <= 0}
          className="cta-primary"
          style={{
            width: "100%",
            opacity: isPending || !check || ctaAmountCents <= 0 ? 0.72 : 1,
            cursor: isPending ? "progress" : ctaAmountCents <= 0 ? "not-allowed" : "pointer"
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function ModeButton(props: { active: boolean; label: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={props.onClick} className={props.active ? "mode-button mode-button--active" : "mode-button"}>
      <strong>{props.label}</strong>
      <span className="stat-detail">{props.detail}</span>
    </button>
  );
}
