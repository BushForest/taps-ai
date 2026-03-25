import type {
  AnalyticsProviderContract,
  LoyaltyProviderContract,
  NfcRegistryContract,
  NotificationProviderContract,
  PaymentProviderContract,
  PosProviderContract
} from "@taps/contracts";

export interface ProviderRegistry {
  pos: Record<string, PosProviderContract>;
  payments: Record<string, PaymentProviderContract>;
  loyalty: Record<string, LoyaltyProviderContract>;
  notifications: Record<string, NotificationProviderContract>;
  analytics: Record<string, AnalyticsProviderContract>;
  nfc: Record<string, NfcRegistryContract>;
}

export function createProviderRegistry(): ProviderRegistry {
  return {
    pos: {},
    payments: {},
    loyalty: {},
    notifications: {},
    analytics: {},
    nfc: {}
  };
}

export function requireProvider<T>(providers: Record<string, T>, providerKey: string, domain: string): T {
  const provider = providers[providerKey];

  if (!provider) {
    throw new Error(`Missing ${domain} provider "${providerKey}"`);
  }

  return provider;
}
