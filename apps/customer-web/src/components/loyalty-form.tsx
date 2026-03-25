"use client";

import { useMemo, useState, useTransition } from "react";
import type { GetSessionStatusResponse } from "@taps/contracts";
import { attachLoyalty } from "../lib/api-client";
import { titleCaseStatus } from "../lib/format";
import { SectionCard } from "./section-card";

export function LoyaltyForm(props: {
  publicToken: string;
  initialSummary: GetSessionStatusResponse;
  defaultPayerId?: string;
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPayerId, setSelectedPayerId] = useState(
    props.defaultPayerId ?? props.initialSummary.payers?.find((payer) => payer.status === "completed")?.id ?? ""
  );
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const selectedPayer = useMemo(
    () => props.initialSummary.payers?.find((payer) => payer.id === selectedPayerId),
    [props.initialSummary.payers, selectedPayerId]
  );

  async function submit() {
    setErrorMessage(undefined);
    setSuccessMessage(undefined);

    if (!phoneNumber.trim()) {
      setErrorMessage("Enter a phone number to attach loyalty.");
      return;
    }

    try {
      const response = await attachLoyalty(props.publicToken, {
        payerId: selectedPayerId || undefined,
        phoneNumber: phoneNumber.trim()
      });
      setSuccessMessage(
        `Linked ${response.profile.phoneE164}. Current points balance: ${response.profile.pointsBalance}.`
      );
      setPhoneNumber("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to attach loyalty.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="detail-list">
        <div className="detail-row">
          <span className="detail-row__label">Attach to</span>
          <span className="detail-row__value">
            {selectedPayer ? selectedPayer.displayName : "Entire session"}
          </span>
        </div>
        <p className="stat-detail" style={{ margin: 0 }}>
          Points post after a successful payment. This step never reopens the table.
        </p>
      </div>

      <label className="field-stack">
        <span>Choose payer record</span>
        <select
          value={selectedPayerId}
          onChange={(event) => setSelectedPayerId(event.target.value)}
          className="select-control"
        >
          <option value="">Attach to the visit without a specific payer</option>
          {props.initialSummary.payers?.map((payer) => (
            <option key={payer.id} value={payer.id}>
              {payer.displayName} ({titleCaseStatus(payer.status)})
            </option>
          ))}
        </select>
      </label>

      <label className="field-stack">
        <span>Phone number</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          placeholder="(555) 555-5555"
          className="input-control"
        />
      </label>

      {selectedPayer ? (
        <div className="soft-chip-row">
          <span className="soft-chip">{selectedPayer.displayName}</span>
          <span className="soft-chip">{titleCaseStatus(selectedPayer.status)}</span>
          {selectedPayer.phoneE164 ? <span className="soft-chip">{selectedPayer.phoneE164}</span> : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => startTransition(() => void submit())}
        disabled={isPending}
        className="cta-primary"
        style={{
          width: "100%",
          opacity: isPending ? 0.78 : 1,
          cursor: isPending ? "progress" : "pointer"
        }}
      >
        {isPending ? "Saving phone..." : "Save phone to loyalty"}
      </button>

      {successMessage ? (
        <SectionCard tone="success" eyebrow="Saved" title="Loyalty attached">
          <p className="stat-detail success-text" style={{ margin: 0 }}>
            {successMessage}
          </p>
        </SectionCard>
      ) : null}

      {errorMessage ? (
        <SectionCard tone="warn" eyebrow="Could Not Attach" title="We need one quick fix">
          <p className="stat-detail warn-text" style={{ margin: 0 }}>
            {errorMessage}
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}
