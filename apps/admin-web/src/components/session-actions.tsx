"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ApiError, clearSession, closeSession } from "../lib/api-client";

function ActionButton(props: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "secondary" | "warning";
}) {
  const className =
    props.tone === "warning"
      ? "admin-action-button admin-action-button--warning"
      : "admin-action-button admin-action-button--secondary";

  return (
    <button type="button" onClick={props.onClick} disabled={props.disabled} className={className}>
      {props.label}
    </button>
  );
}

export function SessionActions(props: { sessionId: string; closeBlocked?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"clear" | "close" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const run = (action: "clear" | "close") => {
    setMessage(null);
    setPendingAction(action);

    startTransition(async () => {
      try {
        if (action === "clear") {
          await clearSession(props.sessionId);
          setMessage("Table cleared and guest access locked immediately.");
        } else {
          await closeSession(props.sessionId);
          setMessage("Session closed successfully.");
        }
        setMessageTone("success");
        router.refresh();
      } catch (error) {
        setMessageTone("error");

        if (error instanceof ApiError) {
          setMessage(error.message);
          setPendingAction(null);
          return;
        }

        setMessage("Action failed. Refresh and inspect the latest session state.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="admin-action-stack">
      <ActionButton
        label={isPending && pendingAction === "clear" ? "Clearing table..." : "Clear table now"}
        onClick={() => run("clear")}
        disabled={isPending}
        tone="warning"
      />
      <p className="admin-action-hint">Use this when service is over. It immediately hides the old guest session from the table.</p>
      <ActionButton
        label={isPending && pendingAction === "close" ? "Closing session..." : "Close session"}
        onClick={() => run("close")}
        disabled={isPending || props.closeBlocked}
        tone="secondary"
      />
      {props.closeBlocked ? (
        <p className="admin-action-hint">Close stays disabled until the table passes the close validator.</p>
      ) : null}
      {message ? (
        <p className={messageTone === "success" ? "admin-action-message admin-action-message--success" : "admin-action-message admin-action-message--error"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
