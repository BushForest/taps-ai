"use client";

import { useRouter } from "next/navigation";

export function AccountActions() {
  const router = useRouter();

  function clearCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }

  function signOut() {
    clearCookie("taps_demo_member_mode");
    clearCookie("taps_demo_member_name");
    clearCookie("taps_demo_member_email");
    router.push("/restaurants/rest_demo");
  }

  return (
    <button type="button" onClick={signOut} className="cta-secondary">
      Sign out
    </button>
  );
}
