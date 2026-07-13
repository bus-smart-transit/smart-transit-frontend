import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import { UserIcon, CoinIcon, ChevronDownIcon } from "../../components/Icons.jsx";
import { REWARDS_POINTS, REWARDS_TIER } from "../../data/sampleData.js";
import "./ProfilePage.css";

const PROFILE = {
  name: "Joshua Galo",
  email: "joshuagalo@gmail.com",
  phone: "0926 718 2727",
};

export default function ProfilePage() {
  const [securityOpen, setSecurityOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="profile-page">
        <div className="profile-cards">
          <div className="profile-card">
            <div className="profile-card__avatar">{PROFILE.name.charAt(0)}</div>
            <div>
              <p className="profile-card__name">{PROFILE.name}</p>
              <p className="profile-card__detail">{PROFILE.email}</p>
              <p className="profile-card__detail">{PROFILE.phone}</p>
            </div>
          </div>

          <div className="profile-card profile-card--rewards">
            <div>
              <p className="profile-card__rewards-label">
                <CoinIcon size={16} /> Rewards Points
              </p>
              <p className="profile-card__rewards-value">
                {REWARDS_POINTS.toLocaleString()}
              </p>
              <p className="profile-card__rewards-tier">{REWARDS_TIER}</p>
            </div>
            <Link to="/rewards" className="profile-card__rewards-link">
              View Rewards
            </Link>
          </div>
        </div>

        <section className="profile-settings">
          <p className="profile-settings__label">ACCOUNT SETTINGS</p>

          <button
            className="profile-settings__row"
            onClick={() => setSecurityOpen((open) => !open)}
            aria-expanded={securityOpen}
          >
            <span className="profile-settings__row-icon">
              <UserIcon size={18} />
            </span>
            <span className="profile-settings__row-label">Security</span>
            <ChevronDownIcon
              size={16}
              className={securityOpen ? "profile-settings__chevron--open" : ""}
            />
          </button>

          {securityOpen && (
            <form
              className="profile-security-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <label>
                Current Password
                <input type="password" placeholder="Enter current password" />
              </label>
              <label>
                New Password
                <input type="password" placeholder="Enter new password" />
              </label>
              <label>
                Confirm New Password
                <input type="password" placeholder="Re-enter new password" />
              </label>
              <button type="submit">Update Password</button>
              <p className="profile-security-form__note">
                Frontend only for now — this doesn't change a real password yet.
              </p>
            </form>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
