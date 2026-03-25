import type { AppContainer } from "../../bootstrap/create-container";

export async function runPaymentReconciliationWorker(container: AppContainer, paymentAttemptId: string) {
  const paymentAttempt = await container.repositories.paymentAttempts.findById(paymentAttemptId);
  if (!paymentAttempt) {
    throw new Error(`Payment attempt ${paymentAttemptId} not found`);
  }

  const session = await container.repositories.sessions.findById(paymentAttempt.sessionId);
  if (!session) {
    throw new Error(`Session ${paymentAttempt.sessionId} not found`);
  }

  const latestCheck =
    await container.repositories.checks.findLatestBySession(session.id) ??
    (await container.agents.checkAgent.fetchOrCreateOpenCheck(
      container.restaurantConfig.posProviderKey,
      {
        correlationId: `recon_fetch_${paymentAttemptId}`,
        restaurantId: session.restaurantId,
        actor: {
          type: "system",
          id: "payment_reconciliation_worker"
        }
      },
      session,
      false
    ));

  await container.agents.posAgent.attachPayment(
    container.restaurantConfig.posProviderKey,
    {
      correlationId: `recon_attach_${paymentAttemptId}`,
      restaurantId: session.restaurantId,
      actor: {
        type: "system",
        id: "payment_reconciliation_worker"
      }
    },
    latestCheck.posCheckId,
    paymentAttempt.id,
    paymentAttempt.amountCents,
    paymentAttempt.tipCents
  );

  const reconciled = await container.agents.paymentAgent.reconcilePaymentState({
    paymentAttemptId,
    resolved: true,
    loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
    context: {
      correlationId: `recon_${paymentAttemptId}`,
      restaurantId: session.restaurantId,
      actor: {
        type: "system",
        id: "payment_reconciliation_worker"
      }
    }
  });

  const openExceptions = await container.repositories.exceptions.listOpenBySession(session.id);
  for (const exception of openExceptions.filter((candidate) => candidate.paymentAttemptId === paymentAttemptId)) {
    await container.repositories.exceptions.resolve(exception.id, new Date().toISOString());
  }

  const refreshed = (await container.agents.checkAgent.refreshCheckSnapshot(
    container.restaurantConfig.posProviderKey,
    {
      correlationId: `recon_refresh_${paymentAttemptId}`,
      restaurantId: session.restaurantId,
      actor: {
        type: "system",
        id: "payment_reconciliation_worker"
      }
    },
    session
  )).snapshot;
  const latestPlan = await container.repositories.plans.findLatestBySession(session.id);
  const normalizedCheck = container.agents.checkAgent.buildGuestCheckSnapshot(refreshed, latestPlan);
  await container.agents.sessionAgent.syncSettlementState(session.id, {
    amountPaidCents: normalizedCheck.amountPaidCents,
    remainingBalanceCents: normalizedCheck.remainingBalanceCents,
    hasPendingPayments: (await container.repositories.paymentAttempts.listPendingBySession(session.id)).length > 0
  }, {
    actorType: "system",
    actorId: "payment_reconciliation_worker"
  });

  return reconciled;
}
