"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax`;
}

function getCookie(name: string) {
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1];
}

export default function EditProfilePage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");
  const [email, setEmail] = useState("john.doe@email.com");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedName = getCookie("taps_demo_member_name");
    const storedEmail = getCookie("taps_demo_member_email");
    if (storedName) {
      const decoded = decodeURIComponent(storedName);
      const parts = decoded.split(" ");
      setFirstName(parts[0] ?? "John");
      setLastName(parts.slice(1).join(" ") || "Doe");
    }
    if (storedEmail) setEmail(decodeURIComponent(storedEmail));
  }, []);

  function handleSave() {
    writeCookie("taps_demo_member_name", `${firstName} ${lastName}`);
    writeCookie("taps_demo_member_email", email);
    router.push(`/session/${publicToken}/profile` as Route);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleDeleteAccount() {
    document.cookie = "taps_demo_member_mode=; path=/; max-age=0";
    document.cookie = "taps_demo_member_name=; path=/; max-age=0";
    document.cookie = "taps_demo_member_email=; path=/; max-age=0";
    window.location.href = `/session/${publicToken}/menu`;
  }

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="subprofile-page">
      <div className="subprofile-header">
        <Link href={`/session/${publicToken}/profile` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="subprofile-header__title">Edit Profile</span>
        <button type="button" className="subprofile-save-btn" onClick={handleSave}>Save</button>
      </div>

      <div className="subprofile-body">
        <div className="profile-avatar-edit">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              initials
            )}
          </div>
          <button type="button" className="profile-change-photo" onClick={() => fileInputRef.current?.click()}>
            Change Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />
        </div>

        <div className="subprofile-form">
          <div className="form-field">
            <label className="form-field__label">First Name</label>
            <input className="input" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-field__label">Last Name</label>
            <input className="input" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-field__label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-field__label">Phone</label>
            <input className="input" type="tel" defaultValue="+1 (416) 555-0123" />
          </div>
          <div className="form-field">
            <label className="form-field__label">Date of Birth</label>
            <input className="input" type="text" defaultValue="March 15, 1990" />
          </div>
        </div>

        <button type="button" className="subprofile-delete-btn" onClick={handleDeleteAccount}>Delete Account</button>
      </div>
    </div>
  );
}
