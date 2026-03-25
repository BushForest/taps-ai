const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type FeatureFlags = {
  menu_ordering?: boolean;
  kitchen_submit?: boolean;
  live_bill?: boolean;
  pay_tab?: boolean;
  request_server?: boolean;
  loyalty?: boolean;
  phone_otp?: boolean;
  email_auth?: boolean;
  social_auth?: boolean;
  guest_checkout?: boolean;
  apple_pay?: boolean;
  google_pay?: boolean;
  samsung_pay?: boolean;
  [key: string]: boolean | undefined;
};

const DEFAULT_FLAGS: Required<FeatureFlags> = {
  menu_ordering: true,
  kitchen_submit: true,
  live_bill: true,
  pay_tab: true,
  request_server: true,
  loyalty: true,
  phone_otp: true,
  email_auth: true,
  social_auth: true,
  guest_checkout: true,
  apple_pay: true,
  google_pay: true,
  samsung_pay: true,
};

export async function getFeatureFlags(restaurantId: string): Promise<FeatureFlags> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/restaurants/${restaurantId}/flags`, {
      cache: "no-store",
    });
    if (!response.ok) return { ...DEFAULT_FLAGS };
    const data = (await response.json()) as { flags?: Record<string, boolean> };
    return { ...DEFAULT_FLAGS, ...data.flags };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}
