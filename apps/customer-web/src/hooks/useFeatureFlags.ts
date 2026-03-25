"use client";

import { useEffect, useState } from "react";
import type { FeatureFlags } from "../lib/feature-flags";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const REFRESH_INTERVAL_MS = 30_000;

const DEFAULT_FLAGS: FeatureFlags = {
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

export function useFeatureFlags(restaurantId: string = "rest_demo"): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    let mounted = true;

    async function fetchFlags() {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/restaurants/${restaurantId}/flags`);
        if (!res.ok || !mounted) return;
        const data = (await res.json()) as { flags?: Record<string, boolean> };
        if (mounted) setFlags({ ...DEFAULT_FLAGS, ...data.flags });
      } catch {
        // keep defaults on error
      }
    }

    void fetchFlags();
    const interval = setInterval(() => void fetchFlags(), REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId]);

  return flags;
}
