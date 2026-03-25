import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/bootstrap/create-app";

function parseJson<T>(payload: string): T {
  return JSON.parse(payload) as T;
}

describe("Demo-ready customer journey", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("completes one guest journey from NFC tap through payment, loyalty, and session close", async () => {
    const created = await createApp();
    app = created.app;

    const tapResponse = await app.inject({
      method: "POST",
      url: "/public/taps/demo-table-test/session"
    });
    expect(tapResponse.statusCode).toBe(200);
    const tapBody = parseJson<{
      access: { session: { id: string; publicToken: string; status: string } };
      check: { version: number; totalCents: number };
    }>(tapResponse.payload);

    const publicToken = tapBody.access.session.publicToken;
    const checkVersion = tapBody.check.version;
    const totalCents = tapBody.check.totalCents;

    const payerResponse = await app.inject({
      method: "POST",
      url: `/public/sessions/${publicToken}/payers`,
      payload: {
        displayName: "Alex"
      }
    });
    expect(payerResponse.statusCode).toBe(200);
    const payer = parseJson<{ id: string }>(payerResponse.payload);

    const allocationResponse = await app.inject({
      method: "POST",
      url: `/public/sessions/${publicToken}/allocations/even`,
      payload: {
        checkVersion
      }
    });
    expect(allocationResponse.statusCode).toBe(200);
    const allocationBody = parseJson<{
      allocationPlan: { id: string };
      closeValidation: { canClose: boolean };
      check: { assignmentSummary: { completeness: string } };
    }>(allocationResponse.payload);

    expect(allocationBody.closeValidation.canClose).toBe(true);
    expect(allocationBody.check.assignmentSummary.completeness).toBe("fully_assigned");

    const intentResponse = await app.inject({
      method: "POST",
      url: `/public/sessions/${publicToken}/payments/intents`,
      payload: {
        payerId: payer.id,
        allocationPlanId: allocationBody.allocationPlan.id,
        checkVersion,
        amountCents: totalCents,
        tipCents: 0
      }
    });
    expect(intentResponse.statusCode).toBe(200);
    const intentBody = parseJson<{
      paymentAttempt: { id: string; status: string };
      clientSecret?: string;
    }>(intentResponse.payload);

    expect(intentBody.paymentAttempt.status).toBe("intent_created");
    expect(intentBody.clientSecret).toBeTruthy();

    const captureResponse = await app.inject({
      method: "POST",
      url: `/public/sessions/${publicToken}/payments/${intentBody.paymentAttempt.id}/capture`
    });
    expect(captureResponse.statusCode).toBe(200);
    const captureBody = parseJson<{
      paymentAttempt: { status: string };
      check: { remainingBalanceCents: number };
      session: { status: string };
      closeValidation?: { canClose: boolean };
    }>(captureResponse.payload);

    expect(captureBody.paymentAttempt.status).toBe("reconciled");
    expect(captureBody.check.remainingBalanceCents).toBe(0);
    expect(captureBody.closeValidation?.canClose).toBe(true);
    expect(captureBody.session.status).toBe("closed");

    const loyaltyResponse = await app.inject({
      method: "POST",
      url: `/public/sessions/${publicToken}/loyalty`,
      payload: {
        payerId: payer.id,
        phoneNumber: "(555) 123-4567"
      }
    });
    expect(loyaltyResponse.statusCode).toBe(200);
    const loyaltyBody = parseJson<{ profile: { phoneE164: string; pointsBalance: number } }>(loyaltyResponse.payload);

    expect(loyaltyBody.profile.phoneE164).toBe("+15551234567");
    expect(loyaltyBody.profile.pointsBalance).toBe(54);

    const statusResponse = await app.inject({
      method: "GET",
      url: `/public/sessions/${publicToken}/status`
    });
    expect(statusResponse.statusCode).toBe(200);
    const statusBody = parseJson<{ access: { publicAccessAllowed: boolean; session: { status: string } } }>(
      statusResponse.payload
    );

    expect(statusBody.access.publicAccessAllowed).toBe(true);
    expect(statusBody.access.session.status).toBe("closed");
  });

  it("locks the old public session on table clear and rotates to a new session on the next tap", async () => {
    const created = await createApp();
    app = created.app;

    const firstTap = await app.inject({
      method: "POST",
      url: "/public/taps/demo-table-12/session"
    });
    const firstBody = parseJson<{ access: { session: { id: string; publicToken: string } } }>(firstTap.payload);

    const clearResponse = await app.inject({
      method: "POST",
      url: `/admin/sessions/${firstBody.access.session.id}/clear`
    });
    expect(clearResponse.statusCode).toBe(200);

    const oldStatusResponse = await app.inject({
      method: "GET",
      url: `/public/sessions/${firstBody.access.session.publicToken}/status`
    });
    expect(oldStatusResponse.statusCode).toBe(200);
    const oldStatusBody = parseJson<{
      access: { publicAccessAllowed: boolean; reason?: string; session: { status: string } };
    }>(oldStatusResponse.payload);

    expect(oldStatusBody.access.publicAccessAllowed).toBe(false);
    expect(oldStatusBody.access.reason).toBe("cleared");
    expect(oldStatusBody.access.session.status).toBe("cleared_locked");

    const secondTap = await app.inject({
      method: "POST",
      url: "/public/taps/demo-table-12/session"
    });
    expect(secondTap.statusCode).toBe(200);
    const secondBody = parseJson<{
      access: { session: { id: string; publicToken: string } };
      check: { totalCents: number; remainingBalanceCents: number };
    }>(secondTap.payload);

    expect(secondBody.access.session.id).not.toBe(firstBody.access.session.id);
    expect(secondBody.access.session.publicToken).not.toBe(firstBody.access.session.publicToken);
    expect(secondBody.check.totalCents).toBe(0);
    expect(secondBody.check.remainingBalanceCents).toBe(0);
  });
});
