"use client";

import { useState, useTransition } from "react";
import { updateRestaurantFlags } from "../lib/api-client";

const FLAG_DEFINITIONS = [
  {
    key: "digital_menu",
    name: "Digital Menu",
    description: "Show the menu tab so guests can browse items from their table.",
  },
  {
    key: "kitchen_ordering",
    name: "Order from Table",
    description: "Allow guests to send orders directly to the kitchen via NFC scan.",
  },
  {
    key: "split_payments",
    name: "Split Payments",
    description: "Enable split-by-item, split-evenly, and custom-amount payment flows.",
  },
  {
    key: "tipping",
    name: "Tip Selection",
    description: "Show tip percentage and custom dollar tip selector on the Pay tab.",
  },
  {
    key: "server_request",
    name: "Request Server Button",
    description: "Show the 'Call Server' button so guests can request assistance.",
  },
  {
    key: "wallet_pay",
    name: "Wallet Pay (Apple / Google)",
    description: "Display Apple Pay and Google Pay buttons in the payment flow.",
  },
] as const;

type FlagKey = (typeof FLAG_DEFINITIONS)[number]["key"];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="toggle" style={{ opacity: disabled ? 0.5 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle__track" />
      <span className="toggle__thumb" />
    </label>
  );
}

export function FeatureFlagsPanel({
  restaurantId,
  initialFlags,
}: {
  restaurantId: string;
  initialFlags: Record<string, boolean>;
}) {
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(key: FlagKey, value: boolean) {
    const next = { ...flags, [key]: value };
    setFlags(next);
    setSaveMsg(null);
    setError(null);

    startTransition(async () => {
      try {
        const result = await updateRestaurantFlags(restaurantId, next);
        setFlags(result.flags ?? next);
        setSaveMsg("Saved");
        setTimeout(() => setSaveMsg(null), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
        setFlags(flags);
      }
    });
  }

  return (
    <div className="ops-card">
      <div className="ops-card__header">
        <p className="ops-card__eyebrow">Live Controls · {restaurantId}</p>
        <h2 className="ops-card__title" style={{ fontSize: "1.1rem" }}>
          Restaurant Feature Flags
        </h2>
        {saveMsg && (
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--green)" }}>
            {saveMsg}
          </span>
        )}
        {error && (
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--red)" }}>
            {error}
          </span>
        )}
      </div>

      <div className="ops-card__body">
        <div className="flag-list">
          {FLAG_DEFINITIONS.map((def) => (
            <div key={def.key} className="flag-row">
              <div className="flag-row__info">
                <span className="flag-row__name">{def.name}</span>
                <span className="flag-row__desc">{def.description}</span>
              </div>
              <Toggle
                checked={flags[def.key] ?? false}
                onChange={(v) => handleToggle(def.key, v)}
                disabled={isPending}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
