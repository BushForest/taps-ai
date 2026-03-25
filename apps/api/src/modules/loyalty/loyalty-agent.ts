import type { CorrelationContext, LoyaltyProfile } from "@taps/contracts";
import type { ProviderRegistry } from "@taps/mcp";
import { requireProvider } from "@taps/mcp";
import { normalizePhoneNumber } from "@taps/domain";
import { newId } from "../../lib/idempotency";
import type { AuditRepository, LoyaltyProfileRepository, PayerRepository, PaymentAttemptRepository } from "../repositories";

export class LoyaltyAgent {
  constructor(
    private readonly profiles: LoyaltyProfileRepository,
    private readonly audit: AuditRepository,
    private readonly providers: ProviderRegistry,
    private readonly payers: PayerRepository,
    private readonly payments: PaymentAttemptRepository
  ) {}

  async attachLoyaltyToSession(input: {
    loyaltyProviderKey: string;
    context: CorrelationContext;
    sessionId: string;
    payerId?: string;
    phoneNumber: string;
  }): Promise<LoyaltyProfile> {
    const phoneE164 = normalizePhoneNumber(input.phoneNumber);
    const provider = requireProvider(this.providers.loyalty, input.loyaltyProviderKey, "loyalty");
    const local = await this.profiles.findByPhone(input.context.restaurantId, phoneE164);
    const profile = local ?? (await this.lookupOrCreateProfile(provider, input.context, input.loyaltyProviderKey, phoneE164));
    const saved = await this.profiles.save(profile);
    if (input.payerId) {
      const payer = await this.payers.findById(input.payerId);
      if (payer) {
        await this.payers.save({
          ...payer,
          phoneE164,
          loyaltyProfileId: saved.id
        });
      }
    }

    if (input.payerId) {
      await this.awardPointsForCommittedPayments({
        loyaltyProviderKey: input.loyaltyProviderKey,
        context: input.context,
        sessionId: input.sessionId,
        payerId: input.payerId
      });
    }

    await this.audit.record({
      id: newId("audit"),
      restaurantId: input.context.restaurantId,
      sessionId: input.sessionId,
      actorType: input.context.actor.type,
      actorId: input.context.actor.id,
      action: "loyalty.attached_to_session",
      subjectType: "loyalty_profile",
      subjectId: saved.id,
      correlationId: input.context.correlationId,
      payload: {
        payerId: input.payerId,
        phoneE164
      },
      createdAt: new Date().toISOString()
    });

    return (await this.profiles.findById(saved.id)) ?? saved;
  }

  async awardPointsForCommittedPayments(input: {
    loyaltyProviderKey: string;
    context: CorrelationContext;
    sessionId: string;
    payerId: string;
  }): Promise<number> {
    const payer = await this.payers.findById(input.payerId);
    if (!payer?.loyaltyProfileId) {
      return 0;
    }

    const profile = await this.profiles.findById(payer.loyaltyProfileId);
    if (!profile) {
      return 0;
    }

    const provider = requireProvider(this.providers.loyalty, input.loyaltyProviderKey, "loyalty");
    const eligiblePayments = (await this.payments.listBySession(input.sessionId)).filter(
      (payment) =>
        payment.payerId === payer.id &&
        payment.status === "reconciled" &&
        !payment.loyaltyAwardedAt &&
        payment.amountCents > 0
    );

    let totalPointsAwarded = 0;
    let latestBalance = profile.pointsBalance;

    for (const payment of eligiblePayments) {
      const response =
        input.loyaltyProviderKey === "memory"
          ? {
              ok: true,
              output: {
                pointsAwarded: Math.floor(payment.amountCents / 100),
                newBalance: latestBalance + Math.floor(payment.amountCents / 100)
              }
            }
          : await provider.awardPoints.execute({
              provider: input.loyaltyProviderKey,
              action: "award_points",
              version: "1",
              timeoutMs: 3000,
              context: input.context,
              idempotencyKey: `loyalty:${payment.id}`,
              input: {
                restaurantId: input.context.restaurantId,
                profileId: profile.id,
                sessionId: payment.sessionId,
                spendCents: payment.amountCents
              }
            });

      if (!response.ok || !response.output) {
        continue;
      }

      latestBalance = response.output.newBalance;
      totalPointsAwarded += response.output.pointsAwarded;

      await this.payments.save({
        ...payment,
        loyaltyAwardedAt: new Date().toISOString(),
        loyaltyPointsAwarded: response.output.pointsAwarded
      });

      await this.audit.record({
        id: newId("audit"),
        restaurantId: input.context.restaurantId,
        sessionId: input.sessionId,
        actorType: input.context.actor.type,
        actorId: input.context.actor.id,
        action: "loyalty.points_awarded",
        subjectType: "payment_attempt",
        subjectId: payment.id,
        idempotencyKey: `loyalty:${payment.id}`,
        correlationId: input.context.correlationId,
        payload: {
          payerId: payer.id,
          profileId: profile.id,
          spendCents: payment.amountCents,
          pointsAwarded: response.output.pointsAwarded
        },
        createdAt: new Date().toISOString()
      });
    }

    if (totalPointsAwarded > 0) {
      await this.profiles.save({
        ...profile,
        pointsBalance: latestBalance
      });
    }

    return totalPointsAwarded;
  }

  private async lookupOrCreateProfile(
    provider: ProviderRegistry["loyalty"][string],
    context: CorrelationContext,
    loyaltyProviderKey: string,
    phoneE164: string
  ): Promise<LoyaltyProfile> {
    const lookup = await provider.lookupCustomer.execute({
      provider: loyaltyProviderKey,
      action: "lookup_customer_by_phone",
      version: "1",
      timeoutMs: 3000,
      context,
      input: {
        restaurantId: context.restaurantId,
        phoneE164
      }
    });

    if (lookup.ok && lookup.output) {
      return lookup.output;
    }

    return (
      await provider.createCustomer.execute({
        provider: loyaltyProviderKey,
        action: "create_customer_profile",
        version: "1",
        timeoutMs: 3000,
        context,
        input: {
          restaurantId: context.restaurantId,
          phoneE164
        }
      })
    ).output!;
  }
}
