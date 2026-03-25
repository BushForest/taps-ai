"use client";

import { type FormEvent, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { formatCurrency } from "../lib/format";

export function StripePaymentForm(props: {
  amountCents: number;
  payerName?: string;
  disabled?: boolean;
  onConfirmed: (result: { paymentIntentId?: string; status: string }) => Promise<void>;
  onFailure: (message: string) => void;
  onRestart: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [localError, setLocalError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements || submitting || props.disabled) {
      return;
    }

    setLocalError(undefined);
    setSubmitting(true);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required"
    });

    if (result.error) {
      const message = result.error.message ?? "Stripe could not confirm this card. Try another test card.";
      setLocalError(message);
      props.onFailure(message);
      setSubmitting(false);
      return;
    }

    if (!result.paymentIntent?.status) {
      const message = "Stripe did not return a payment status for this payment.";
      setLocalError(message);
      props.onFailure(message);
      setSubmitting(false);
      return;
    }

    try {
      await props.onConfirmed({
        paymentIntentId: result.paymentIntent.id,
        status: result.paymentIntent.status
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to finish this Stripe payment.";
      setLocalError(message);
      props.onFailure(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isSubmitDisabled = !stripe || !elements || submitting || props.disabled;

  return (
    <form onSubmit={handleSubmit} className="field-stack">
      <div className="soft-chip-row">
        <span className="soft-chip">Stripe test mode</span>
        <span className="soft-chip">Secure card entry</span>
        {props.payerName ? <span className="soft-chip">{props.payerName}</span> : null}
      </div>
      <div className="payment-element-shell">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <p className="stat-detail" style={{ margin: 0 }}>
        Your card is authorized with Stripe first, then Taps captures only the amount shown here: {formatCurrency(props.amountCents)}.
      </p>
      {localError ? (
        <p className="stat-detail warn-text" style={{ margin: 0 }}>
          {localError}
        </p>
      ) : null}
      <div className="cta-stack">
        <button
          type="submit"
          className="cta-primary"
          disabled={isSubmitDisabled}
          style={{
            width: "100%",
            opacity: isSubmitDisabled ? 0.72 : 1,
            cursor: isSubmitDisabled ? "progress" : "pointer"
          }}
        >
          {submitting ? "Confirming card…" : `Pay ${formatCurrency(props.amountCents)}`}
        </button>
        <button type="button" className="cta-secondary" onClick={props.onRestart} disabled={submitting}>
          Start again
        </button>
      </div>
    </form>
  );
}
