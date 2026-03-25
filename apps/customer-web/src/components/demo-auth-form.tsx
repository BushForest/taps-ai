"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemoAuthForm(props: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("Alex");
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("demo-password");
  const [submitting, setSubmitting] = useState(false);

  function writeCookie(name: string, value: string) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax`;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    writeCookie("taps_demo_member_mode", "member");
    writeCookie("taps_demo_member_name", props.mode === "signup" ? name.trim() || "Alex" : name.trim() || "Alex");
    writeCookie("taps_demo_member_email", email.trim() || "alex@example.com");

    router.push("/account");
  }

  return (
    <form onSubmit={submit} className="auth-form">
      {props.mode === "signup" ? (
        <label className="field-stack">
          <span>Your name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-control"
            placeholder="Alex"
          />
        </label>
      ) : null}

      <label className="field-stack">
        <span>Email</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input-control"
          inputMode="email"
          autoComplete="email"
          placeholder="alex@example.com"
        />
      </label>

      <label className="field-stack">
        <span>Password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input-control"
          type="password"
          autoComplete={props.mode === "signup" ? "new-password" : "current-password"}
          placeholder="demo-password"
        />
      </label>

      <button type="submit" className="cta-primary" disabled={submitting}>
        {submitting ? "Opening your account..." : props.mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
