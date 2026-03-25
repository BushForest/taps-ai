"use client";

import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import type { GetSessionStatusResponse } from "@taps/contracts";
import { createPaymentIntent, capturePayment, fetchGuestSummary, isApiError } from "../lib/api-client";
import { formatCurrency, titleCaseStatus } from "../lib/format";
import { isStripeClientReady, stripePromise } from "../lib/stripe";
import { SectionCard } from "./section-card";
import { StaleCheckBanner } from "./stale-check-banner";
import { StatusPill } from "./status-pill";
import { StripePaymentForm } from "./stripe-payment-form";

type ProcessingStage = "idle" | "creating" | "confirming" | "capturing" | "finalizing";

const STAGE_LABELS: Record<Exclude<ProcessingStage, "idle">, string> = {
  creating: "Preparing secure checkout",
  confirming: "Confirming your card",
  capturing: "Finalizing with the restaurant",
  finalizing: "Wrapping up your share"
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function PaymentReview(props: {
  publicToken: string;
  payerId: string;
  allocationPlanId: string;
  amountCents: number;
  checkVersion: number;
  mode: string;
  initialSummary: GetSessionStatusResponse;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(props.initialSummary);
  const [tipAmount, setTipAmount] = useState("0.00");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [staleMessage, setStaleMessage] = useState<string | undefined>();
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [stripeCheckout, setStripeCheckout] = useState<
    | {
        paymentAttemptId: string;
        clientSecret: string;
      }
    | undefined
  >();

  const payer = summary.payers?.find((candidate) => candidate.id === props.payerId);
  const currentVersion = summary.settlement?.checkVersion ?? summary.check?.version;
  const isStale = currentVersion !== undefined && currentVersion !== props.checkVersion;
  const tipCents = Math.max(Math.round(Number(tipAmount || 0) * 100), 0);
  const tableRemaining = summary.settlement?.remainingBalanceCents ?? 0;
  const remainingAfterYourPayment = Math.max(tableRemaining - props.amountCents, 0);
  const totalChargeCents = props.amountCents + tipCents;

  async function refreshSummary() {
    const next = await fetchGuestSummary(props.publicToken);
    setSummary(next);
    return next;
  }

  function resetStripeCheckout() {
    setStripeCheckout(undefined);
  }

  async function finalizeCapturedPayment(paymentAttemptId: string) {
    setStage("capturing");
    await wait(220);
    const capture = await capturePayment(props.publicToken, paymentAttemptId);

    setStage("finalizing");
    await wait(240);
    router.push(
      `/session/${props.publicToken}/result?payerId=${encodeURIComponent(props.payerId)}&paymentAttemptId=${encodeURIComponent(
        paymentAttemptId
      )}&paymentStatus=${encodeURIComponent(capture.paymentAttempt.status)}&amountCents=${props.amountCents}&tipCents=${tipCents}`
    );
  }

  async function beginPayment() {
    if (!summary.check) {
      return;
    }

    setErrorMessage(undefined);
    setStaleMessage(undefined);

    if (isStale) {
      setStaleMessage("This bill changed after you built your split. Go back and rebuild your payment with the latest version.");
      return;
    }

    try {
      setStage("creating");
      await wait(180);
      const intent = await createPaymentIntent(props.publicToken, {
        payerId: props.payerId,
        allocationPlanId: props.allocationPlanId,
        checkVersion: props.checkVersion,
        amountCents: props.amountCents,
        tipCents
      });

      if (intent.paymentAttempt.provider === "stripe") {
        if (!intent.clientSecret) {
          throw new Error("Stripe returned no client secret for this payment intent.");
        }

        if (!isStripeClientReady()) {
          throw new Error("The guest app is missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for Stripe checkout.");
        }

        setStripeCheckout({
          paymentAttemptId: intent.paymentAttempt.id,
          clientSecret: intent.clientSecret
        });
        setStage("idle");
        return;
      }

      await finalizeCapturedPayment(intent.paymentAttempt.id);
    } catch (error) {
      if (isApiError(error) && error.code === "STALE_CHECK_VERSION") {
        const refreshed = await refreshSummary();
        setStaleMessage(
          `The bill is now version ${refreshed.settlement?.checkVersion ?? refreshed.check?.version ?? "new"}. Rebuild your split before continuing.`
        );
        resetStripeCheckout();
        setStage("idle");
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "Unable to prepare payment.");
      resetStripeCheckout();
      setStage("idle");
    }
  }

  async function handleStripeConfirmed(result: { paymentIntentId?: string; status: string }) {
    if (!stripeCheckout) {
      throw new Error("Stripe checkout is no longer active. Start this payment again.");
    }

    setErrorMessage(undefined);
    setStage("confirming");
    await wait(180);

    if (!["requires_capture", "processing", "succeeded"].includes(result.status)) {
      resetStripeCheckout();
      setStage("idle");
      throw new Error("Stripe did not move this payment into a capturable state.");
    }

    try {
      await finalizeCapturedPayment(stripeCheckout.paymentAttemptId);
    } catch (error) {
      if (isApiError(error) && error.code === "STALE_CHECK_VERSION") {
        const refreshed = await refreshSummary();
        setStaleMessage(
          `The bill is now version ${refreshed.settlement?.checkVersion ?? refreshed.check?.version ?? "new"}. Rebuild your split before continuing.`
        );
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Unable to finish Stripe capture.");
      }

      resetStripeCheckout();
      setStage("idle");
      throw error instanceof Error ? error : new Error("Unable to finish Stripe capture.");
    }
  }

  function handleStripeFailure(message: string) {
    setErrorMessage(message);
    resetStripeCheckout();
    setStage("idle");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {stage !== "idle" ? (
        <div className="processing-overlay" role="status" aria-live="polite">
          <div className="processing-card">
            <div className="spinner" />
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: "1.35rem" }}>{STAGE_LABELS[stage]}</strong>
              <p className="stat-detail" style={{ margin: 0 }}>
                Stay on this screen for a moment while we finish your payment.
              </p>
            </div>
            <div className="progress-steps">
              {(["creating", "confirming", "capturing", "finalizing"] as const).map((candidate) => (
                <div
                  key={candidate}
                  className={
                    candidate === stage
                      ? "progress-step progress-step--active"
                      : (candidate === "creating" && stage !== "creating") ||
                          (candidate === "confirming" &&
                            (stage === "capturing" || stage === "finalizing")) ||
                          (candidate === "capturing" && stage === "finalizing")
                        ? "progress-step progress-step--done"
                        : "progress-step"
                  }
                >
                  {STAGE_LABELS[candidate]}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isStale || staleMessage ? (
        <StaleCheckBanner
          title="This payment needs a refresh"
          message={
            staleMessage ??
            "The bill changed since this split was created. Go back so you do not pay against an outdated balance."
          }
        />
      ) : null}

      <SectionCard eyebrow="Your Share" title={`Pay ${formatCurrency(totalChargeCents)}`}>
        <div className="inline-row">
          <div style={{ display: "grid", gap: 6 }}>
            <span className="muted">Payer</span>
            <strong>{payer?.displayName ?? "Current guest"}</strong>
          </div>
          <StatusPill value={summary.session?.status ?? "active"} />
        </div>
        <div className="stat-grid">
          <article className="stat-card">
            <p className="stat-kicker">You are paying</p>
            <p className="stat-value">{formatCurrency(props.amountCents)}</p>
            <p className="stat-detail">This is your assigned share before tip.</p>
          </article>
          <article className="stat-card">
            <p className="stat-kicker">Table after you</p>
            <p className="stat-value">{formatCurrency(remainingAfterYourPayment)}</p>
            <p className="stat-detail">
              {remainingAfterYourPayment > 0 ? "The table may still stay open after your payment." : "Your payment should finish the table balance."}
            </p>
          </article>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div className="inline-row">
            <span className="muted">Split mode</span>
            <strong>{titleCaseStatus(props.mode)}</strong>
          </div>
          <div className="inline-row">
            <span className="muted">Current table balance</span>
            <strong>{formatCurrency(tableRemaining)}</strong>
          </div>
          <div className="inline-row">
            <span className="muted">Check version</span>
            <strong>v{currentVersion ?? props.checkVersion}</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Optional" title="Add a tip">
        <label className="field-stack" style={{ maxWidth: 320 }}>
          <span>Tip amount</span>
          <input
            inputMode="decimal"
            value={tipAmount}
            onChange={(event) => {
              setTipAmount(event.target.value);
              if (stripeCheckout) {
                resetStripeCheckout();
              }
            }}
            className="input-control"
          />
        </label>
        <p className="stat-detail" style={{ margin: 0 }}>
          Tips are processed with this payment, but they do not reduce the table balance.
        </p>
      </SectionCard>

      {summary.settlement && !summary.settlement.tableCloseable ? (
        <SectionCard tone="warn" eyebrow="Heads Up" title="You can finish your share without finishing the table">
          <p className="stat-detail warn-text" style={{ margin: 0 }}>
            Your payment being complete is separate from the table being done. Remaining balance, unassigned items, or other pending payments can still keep the session open.
          </p>
        </SectionCard>
      ) : null}

      {stripeCheckout ? (
        <SectionCard eyebrow="Secure Checkout" title="Enter your card">
          <p className="stat-detail" style={{ margin: 0 }}>
            This is a real Stripe test-mode payment. Use a Stripe test card here, then Taps will capture the authorized amount and sync it into the session ledger.
          </p>
          <Elements
            key={stripeCheckout.paymentAttemptId}
            stripe={stripePromise}
            options={{
              clientSecret: stripeCheckout.clientSecret,
              appearance: {
                theme: "flat",
                variables: {
                  colorPrimary: "#1f1914",
                  colorBackground: "#fdf8f0",
                  colorText: "#201712",
                  colorDanger: "#8c372b",
                  colorSuccess: "#315339",
                  borderRadius: "16px",
                  fontFamily: "Manrope, system-ui, sans-serif",
                  spacingUnit: "4px"
                }
              }
            }}
          >
            <StripePaymentForm
              amountCents={totalChargeCents}
              payerName={payer?.displayName}
              disabled={stage !== "idle"}
              onConfirmed={handleStripeConfirmed}
              onFailure={handleStripeFailure}
              onRestart={() => {
                resetStripeCheckout();
                setErrorMessage(undefined);
                setStaleMessage(undefined);
              }}
            />
          </Elements>
        </SectionCard>
      ) : (
        <button
          type="button"
          onClick={() => void beginPayment()}
          disabled={stage !== "idle" || isStale}
          className="cta-primary"
          style={{
            width: "100%",
            opacity: stage !== "idle" || isStale ? 0.72 : 1,
            cursor: stage !== "idle" ? "progress" : isStale ? "not-allowed" : "pointer"
          }}
        >
          {stage !== "idle" ? STAGE_LABELS[stage] : `Continue with ${formatCurrency(totalChargeCents)}`}
        </button>
      )}

      {errorMessage ? (
        <SectionCard tone="warn" eyebrow="Payment Error" title="We could not finish that payment">
          <p className="stat-detail warn-text" style={{ margin: 0 }}>
            {errorMessage}
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}
