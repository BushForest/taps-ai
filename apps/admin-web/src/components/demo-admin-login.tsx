"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemoAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("ops@commonhouse.demo");
  const [password, setPassword] = useState("demo-password");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    document.cookie = "taps_demo_admin=1; path=/; max-age=2592000; SameSite=Lax";
    document.cookie = `taps_demo_admin_email=${encodeURIComponent(email)}; path=/; max-age=2592000; SameSite=Lax`;
    router.push("/restaurants/rest_demo");
  }

  return (
    <form onSubmit={submit} className="admin-order-editor">
      <label className="admin-field">
        <span>Email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="admin-field">
        <span>Password</span>
        <input
          value={password}
          type="password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button type="submit" className="admin-action-button admin-action-button--secondary" disabled={submitting}>
        {submitting ? "Opening workspace..." : "Sign in to ops"}
      </button>
    </form>
  );
}
