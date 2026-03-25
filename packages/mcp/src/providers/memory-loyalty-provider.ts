import type { LoyaltyProfile, LoyaltyProviderContract } from "@taps/contracts";
import { createMcpTool, okResponse } from "../runtime/mcp-tool";

export function createMemoryLoyaltyProvider(): LoyaltyProviderContract {
  const profiles = new Map<string, LoyaltyProfile>();

  return {
    lookupCustomer: createMcpTool(async (request) =>
      okResponse(request, profiles.get(request.input.phoneE164) ?? null)
    ),
    createCustomer: createMcpTool(async (request) => {
      const profile: LoyaltyProfile = {
        id: crypto.randomUUID(),
        restaurantId: request.input.restaurantId,
        phoneE164: request.input.phoneE164,
        status: "active",
        pointsBalance: 0
      };

      profiles.set(profile.phoneE164, profile);
      return okResponse(request, profile);
    }),
    awardPoints: createMcpTool(async (request) => {
      const profile = [...profiles.values()].find((candidate) => candidate.id === request.input.profileId);

      if (!profile) {
        throw new Error(`Loyalty profile ${request.input.profileId} not found`);
      }

      const pointsAwarded = Math.floor(request.input.spendCents / 100);
      profile.pointsBalance += pointsAwarded;

      return okResponse(request, {
        pointsAwarded,
        newBalance: profile.pointsBalance
      });
    })
  };
}
