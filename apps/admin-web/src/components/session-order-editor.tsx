"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CheckLineItem, MenuSnapshot } from "@taps/contracts";
import { addSessionItem, ApiError, applySessionCredit, voidSessionLine } from "../lib/api-client";
import { formatCurrency, titleCaseStatus } from "../lib/format";

export function SessionOrderEditor(props: {
  sessionId: string;
  menu: MenuSnapshot;
  lines: CheckLineItem[];
}) {
  const router = useRouter();
  const [selectedMenuItemId, setSelectedMenuItemId] = useState(
    props.menu.items.find((item) => item.availability !== "hidden")?.id ?? ""
  );
  const [quantity, setQuantity] = useState("1");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditLabel, setCreditLabel] = useState("House credit");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();

  const availableItems = useMemo(
    () => props.menu.items.filter((item) => item.availability !== "hidden"),
    [props.menu.items]
  );

  const actionableLines = useMemo(
    () =>
      props.lines.filter(
        (line) =>
          !line.parentLineId &&
          !["voided", "cancelled", "transferred", "paid"].includes(line.status)
      ),
    [props.lines]
  );

  function run(task: () => Promise<void>) {
    setMessage(null);
    startTransition(async () => {
      try {
        await task();
        setMessageTone("success");
        router.refresh();
      } catch (error) {
        setMessageTone("error");
        setMessage(error instanceof ApiError ? error.message : "That admin action failed.");
      }
    });
  }

  function addItem() {
    if (!selectedMenuItemId) {
      setMessageTone("error");
      setMessage("Choose a menu item first.");
      return;
    }

    const parsedQuantity = Math.max(Number(quantity) || 1, 1);
    run(async () => {
      await addSessionItem(props.sessionId, {
        menuItemId: selectedMenuItemId,
        quantity: parsedQuantity
      });
      const selectedItem = availableItems.find((item) => item.id === selectedMenuItemId);
      setMessage(`Added ${parsedQuantity} x ${selectedItem?.name ?? "menu item"} to the check.`);
    });
  }

  function applyCredit() {
    const amountCents = Math.round(Number(creditAmount || 0) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setMessageTone("error");
      setMessage("Enter a positive credit amount.");
      return;
    }

    run(async () => {
      await applySessionCredit(props.sessionId, {
        amountCents,
        label: creditLabel.trim() || undefined
      });
      setMessage(`Applied ${formatCurrency(amountCents)} credit to the table.`);
      setCreditAmount("");
    });
  }

  function voidLine(line: CheckLineItem) {
    run(async () => {
      await voidSessionLine(props.sessionId, line.id, {
        reason: `Voided in demo ops by admin for ${line.name}`
      });
      setMessage(`Voided ${line.name} from the check.`);
    });
  }

  return (
    <div className="admin-order-editor">
      <section className="admin-order-editor__panel">
        <div className="admin-order-editor__header">
          <div>
            <p className="admin-order-editor__eyebrow">Edit Order</p>
            <h3 className="admin-order-editor__title">Add a menu item</h3>
          </div>
          <span className="admin-order-editor__badge">Demo-safe POS mutation</span>
        </div>
        <div className="admin-order-editor__controls">
          <label className="admin-field">
            <span>Menu item</span>
            <select
              value={selectedMenuItemId}
              onChange={(event) => setSelectedMenuItemId(event.target.value)}
            >
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatCurrency(item.basePriceCents)})
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field admin-field--small">
            <span>Qty</span>
            <input
              value={quantity}
              inputMode="numeric"
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={isPending}
          className="admin-action-button admin-action-button--secondary"
        >
          {isPending ? "Updating check..." : "Add item to check"}
        </button>
      </section>

      <section className="admin-order-editor__panel">
        <div className="admin-order-editor__header">
          <div>
            <p className="admin-order-editor__eyebrow">Guest Recovery</p>
            <h3 className="admin-order-editor__title">Apply a credit</h3>
          </div>
          <span className="admin-order-editor__badge">Reduces total immediately</span>
        </div>
        <div className="admin-order-editor__controls">
          <label className="admin-field admin-field--small">
            <span>Amount</span>
            <input
              value={creditAmount}
              inputMode="decimal"
              placeholder="10.00"
              onChange={(event) => setCreditAmount(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Label</span>
            <input
              value={creditLabel}
              placeholder="House credit"
              onChange={(event) => setCreditLabel(event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={applyCredit}
          disabled={isPending}
          className="admin-action-button admin-action-button--secondary"
        >
          {isPending ? "Applying credit..." : "Apply credit"}
        </button>
      </section>

      <section className="admin-order-editor__panel">
        <div className="admin-order-editor__header">
          <div>
            <p className="admin-order-editor__eyebrow">Line Actions</p>
            <h3 className="admin-order-editor__title">Void an item</h3>
          </div>
          <span className="admin-order-editor__badge">{actionableLines.length} open line(s)</span>
        </div>
        <div className="admin-order-editor__line-list">
          {actionableLines.length ? (
            actionableLines.map((line) => (
              <div key={line.id} className="admin-order-editor__line-row">
                <div>
                  <strong>{line.name}</strong>
                  <p className="admin-row-meta">
                    {formatCurrency(line.grossCents)} | {titleCaseStatus(line.kind)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => voidLine(line)}
                  disabled={isPending}
                  className="admin-action-button admin-action-button--secondary admin-action-button--inline"
                >
                  Void
                </button>
              </div>
            ))
          ) : (
            <p className="admin-note">No editable open lines remain on this check.</p>
          )}
        </div>
      </section>

      {message ? (
        <p className={messageTone === "success" ? "admin-action-message admin-action-message--success" : "admin-action-message admin-action-message--error"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
