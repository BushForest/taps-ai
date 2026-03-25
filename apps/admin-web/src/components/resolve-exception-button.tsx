"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ApiError, resolveException } from "../lib/api-client";

export function ResolveExceptionButton(props: { exceptionId: string; disabled?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        disabled={isPending || props.disabled}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            try {
              await resolveException(props.exceptionId);
              setMessage("Exception marked resolved.");
              router.refresh();
            } catch (error) {
              if (error instanceof ApiError) {
                setMessage(error.message);
                return;
              }

              setMessage("Unable to resolve exception.");
            }
          })
        }
        style={{
          borderRadius: 12,
          border: "1px solid #355f7c",
          background: "#f2f8fc",
          color: "#214e6e",
          padding: "10px 14px",
          fontWeight: 600,
          cursor: isPending || props.disabled ? "not-allowed" : "pointer",
          opacity: isPending || props.disabled ? 0.6 : 1
        }}
      >
        {isPending ? "Resolving..." : "Resolve"}
      </button>
      {message ? <p style={{ margin: 0, fontSize: 13, color: "#526072" }}>{message}</p> : null}
    </div>
  );
}
