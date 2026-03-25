import Link from "next/link";
import { use } from "react";
import type { Route } from "next";

export default function EditProfilePage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);

  return (
    <div className="subprofile-page">
      <div className="subprofile-header">
        <Link href={`/session/${publicToken}/profile` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="subprofile-header__title">Edit Profile</span>
        <button type="button" className="subprofile-save-btn">Save</button>
      </div>

      <div className="subprofile-body">
        <div className="profile-avatar-edit">
          <div className="profile-avatar">JD</div>
          <button type="button" className="profile-change-photo">Change Photo</button>
        </div>

        <div className="subprofile-form">
          <div className="form-field">
            <label className="form-field__label">First Name</label>
            <input className="input" type="text" defaultValue="John" />
          </div>
          <div className="form-field">
            <label className="form-field__label">Last Name</label>
            <input className="input" type="text" defaultValue="Doe" />
          </div>
          <div className="form-field">
            <label className="form-field__label">Email</label>
            <input className="input" type="email" defaultValue="john.doe@email.com" />
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

        <button type="button" className="subprofile-delete-btn">Delete Account</button>
      </div>
    </div>
  );
}
