"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Route } from "next";

export function AuthHeaderBtn({ token }: { token: string }) {
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    const mode = document.cookie.split("; ").find((r) => r.startsWith("taps_demo_member_mode="))?.split("=")[1];
    if (mode === "member") {
      const raw = document.cookie.split("; ").find((r) => r.startsWith("taps_demo_member_name="))?.split("=")[1];
      const name = raw ? decodeURIComponent(raw) : "";
      setInitials(name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "ME");
    }
  }, []);

  if (initials !== null) {
    return (
      <Link href={`/session/${token}/profile` as Route} className="btn-profile-avatar">
        {initials}
      </Link>
    );
  }

  return (
    <Link href={`/session/${token}/signin` as Route} className="btn-sign-in">
      Sign In
    </Link>
  );
}
