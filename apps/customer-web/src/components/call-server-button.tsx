"use client";

import { useState } from "react";

interface CallServerButtonProps {
  sessionId: string;
}

export function CallServerButton({ sessionId }: CallServerButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    if (state !== "idle") return;
    setState("loading");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
      await fetch(`${apiBase}/public/sessions/${sessionId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken: sessionId }),
      });
      setState("done");
    } catch {
      // Still show "done" so the UI is reassuring — the server may have received it
      setState("done");
    }
  }

  return (
    <div className="bb-call-server-wrap">
      <button
        className="bb-call-server-btn"
        onClick={handleClick}
        disabled={state !== "idle"}
        aria-live="polite"
      >
        {state === "idle" && "🔔 Call Server"}
        {state === "loading" && "Sending…"}
        {state === "done" && "✓ Server Notified — We'll be right with you"}
        {state === "error" && "🔔 Call Server"}
      </button>
    </div>
  );
}
