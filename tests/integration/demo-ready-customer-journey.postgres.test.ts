import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { checkSnapshots, diningSessions, paymentAttempts } from "@taps/db";
import { createApp } from "../../apps/api/src/bootstrap/create-app";
import { createPgMemDb } from "../helpers/pg-mem";

function parseJson<T>(payload: string): T {
  return JSON.parse(payload) as T;
}

describe("Demo-ready customer journey with Postgres-backed repositories", () => {
  let app: FastifyInstance | undefined;
  let disposeDb: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }

    if (disposeDb) {
      await disposeDb();
      disposeDb = undefined;
    }
  });

  it("persists the full guest journey and preserves versioned check history", async () => {
    const { db, dispose } = await createPgMemDb();
    disposeDb = dispose;

    const created = await createApp(undefined, {
      dataStoreDriver: "postgres",
      dbClient: db
    });
    app = created.app;

    const tapResponse = await app.inject({
      method: "POST",
      url: "/public/taps/demo-table-12/session"
    });
    expect(tapResponse.statusCode).toBe(200);
    const tapBody = parseJson<{
      access: { session: { id: string; publicToken: string } };
      check: { id: string; version: number; totalCents: number };
    }>(tapResponse.payload);

    const publicToken = tapBody.access.session.publicToken;
    const initialCheckId = tapBody.check.id;

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
        checkVersion: tapBody.check.version
      }
    });
    expect(allocationResponse.statusCode).toBe(200);
    const allocationBody = parseJson<{
      allocationPlan: { id: string };
      check: { assignmentSummary: { completeness: string } };
    }>(allocationResponse.payload);

    expect(allocationBody.check.assignmentSummary.completeness).toBe("fully_assigned");

    const intentResponse = await app.inject({
      method: "POST",
      url: `/public/sessions/${publicToken}/payments/intents`,
      payload: {
        payerId: payer.id,
        allocationPlanId: allocationBody.allocationPlan.id,
        checkVersion: tapBody.check.version,
        amountCents: tapBody.check.totalCents,
        tipCents: 0
      }
    });
    expect(intentResponse.statusCode).toBe(200);
    const intentBody = parseJson<{
      paymentAttempt: { id: string; status: string };
    }>(intentResponse.payload);
    expect(intentBody.paymentAttempt.status).toBe("intent_created");

    const captureResponse = await app.inject({
      method: "POST",
      url: `/public/sessions/${publicToken}/payments/${intentBody.paymentAttempt.id}/capture`
    });
    expect(captureResponse.statusCode).toBe(200);
    const captureBody = parseJson<{
      paymentAttempt: { id: string; status: string };
      check: { id: string; version: number; remainingBalanceCents: number };
      session: { id: string; status: string };
    }>(captureResponse.payload);

    expect(captureBody.paymentAttempt.status).toBe("reconciled");
    expect(captureBody.check.remainingBalanceCents).toBe(0);
    expect(captureBody.session.status).toBe("closed");
    expect(captureBody.check.id).not.toBe(initialCheckId);
    expect(captureBody.check.version).toBeGreaterThan(tapBody.check.version);

    const loyaltyResponse = await app.inject({
      method: "POST",
      url: `/public/sessions/${publicToken}/loyalty`,
      payload: {
        payerId: payer.id,
        phoneNumber: "(555) 123-4567"
      }
    });
    expect(loyaltyResponse.statusCode).toBe(200);
    const loyaltyBody = parseJson<{ profile: { pointsBalance: number } }>(loyaltyResponse.payload);
    expect(loyaltyBody.profile.pointsBalance).toBe(54);

    const sessionRows = await db.select().from(diningSessions).where(eq(diningSessions.id, captureBody.session.id));
    const checkRows = await db.select().from(checkSnapshots).where(eq(checkSnapshots.sessionId, captureBody.session.id));
    const paymentRows = await db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.sessionId, captureBody.session.id));

    expect(sessionRows).toHaveLength(1);
    expect(checkRows.length).toBeGreaterThanOrEqual(2);
    expect(paymentRows).toHaveLength(1);
    expect(paymentRows[0]?.status).toBe("reconciled");
    expect(checkRows.some((row) => row.id === initialCheckId)).toBe(true);
    expect(checkRows.some((row) => row.id === captureBody.check.id)).toBe(true);
  });

  it("locks the prior public session on clear and issues a new session on the next tap", async () => {
    const { db, dispose } = await createPgMemDb();
    disposeDb = dispose;

    const created = await createApp(undefined, {
      dataStoreDriver: "postgres",
      dbClient: db
    });
    app = created.app;

    const firstTap = await app.inject({
      method: "POST",
      url: "/public/taps/demo-table-12/session"
    });
    expect(firstTap.statusCode).toBe(200);
    const firstBody = parseJson<{ access: { session: { id: string; publicToken: string } } }>(firstTap.payload);

    const clearResponse = await app.inject({
      method: "POST",
      url: `/admin/sessions/${firstBody.access.session.id}/clear`
    });
    expect(clearResponse.statusCode).toBe(200);

    const oldStatus = await app.inject({
      method: "GET",
      url: `/public/sessions/${firstBody.access.session.publicToken}/status`
    });
    expect(oldStatus.statusCode).toBe(200);
    const oldStatusBody = parseJson<{
      access: { publicAccessAllowed: boolean; reason?: string; session: { status: string } };
    }>(oldStatus.payload);
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
