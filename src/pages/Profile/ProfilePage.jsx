import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import FormInput from "../../components/ui/FormInput.jsx";
import Toggle from "../../components/ui/Toggle.jsx";
import { UserIcon, CoinIcon, ChevronDownIcon, LockIcon, BellIcon, GearIcon, LogoutIcon } from "../../components/Icons.jsx";
import { TERMINALS } from "../../data/sampleData.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRewards } from "../../context/RewardsContext.jsx";
import { getCurrentTier } from "../../utils/rewards.js";

const SECTIONS = [
  { key: "edit", label: "Edit Profile", icon: UserIcon },
  { key: "password", label: "Change Password", icon: LockIcon },
  { key: "notifications", label: "Notification Settings", icon: BellIcon },
  { key: "preferences", label: "Account Preferences", icon: GearIcon },
];

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const { points } = useRewards();
  const tier = getCurrentTier(points);
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState("edit");

  const [profileForm, setProfileForm] = useState({
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    push: false,
    promos: false,
  });

  const [preferences, setPreferences] = useState({
    language: "English",
    defaultTerminal: TERMINALS[0],
  });
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const toggleSection = (key) => setOpenSection((current) => (current === key ? "" : key));

  const handleProfileSave = (event) => {
    event.preventDefault();
    const [firstName, ...rest] = profileForm.fullName.trim().split(" ");
    updateProfile({
      name: profileForm.fullName.trim(),
      firstName: firstName || profileForm.fullName.trim(),
      lastName: rest.join(" "),
      email: profileForm.email.trim(),
      phone: profileForm.phone,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handlePasswordSave = (event) => {
    event.preventDefault();
    setPasswordError("");
    if (passwordForm.next.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordSaved(true);
    setPasswordForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPasswordSaved(false), 2500);
  };

  const handlePreferencesSave = (event) => {
    event.preventDefault();
    setPreferencesSaved(true);
    setTimeout(() => setPreferencesSaved(false), 2500);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-stretch">
          <Card className="flex items-center gap-4 p-6">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-400 font-display text-2xl font-bold text-navy-900">
              {user?.name?.charAt(0) ?? "U"}
            </span>
            <div>
              <p className="font-display text-lg font-bold text-navy-950">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <p className="text-sm text-slate-500">{user?.phone}</p>
            </div>
          </Card>

          <Card className="flex items-center justify-between gap-6 !bg-navy-900 p-6 text-white sm:min-w-[16rem]">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-navy-200">
                <CoinIcon size={14} /> Rewards Points
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{points.toLocaleString()}</p>
              <p className="text-xs text-teal-300">{tier.label}</p>
            </div>
            <Link to="/rewards" className="text-xs font-semibold text-teal-300 hover:underline">
              View Rewards
            </Link>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <p className="border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Account Settings
          </p>

          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const isOpen = openSection === key;
            return (
              <div key={key} className="border-b border-slate-100 last:border-b-0">
                <button
                  className="flex w-full items-center gap-3 px-6 py-4 text-left"
                  onClick={() => toggleSection(key)}
                  aria-expanded={isOpen}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-800">
                    <Icon size={17} />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-navy-950">{label}</span>
                  <ChevronDownIcon
                    size={16}
                    className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6">
                    {key === "edit" && (
                      <form className="max-w-md space-y-4" onSubmit={handleProfileSave}>
                        <FormInput
                          label="Full Name"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                        />
                        <FormInput
                          label="Email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                        />
                        <FormInput
                          label="Phone Number"
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        />
                        <div className="flex items-center gap-3">
                          <Button type="submit" variant="primary">
                            Save Changes
                          </Button>
                          {profileSaved && (
                            <span className="text-sm font-medium text-teal-600">Profile updated.</span>
                          )}
                        </div>
                      </form>
                    )}

                    {key === "password" && (
                      <form className="max-w-md space-y-4" onSubmit={handlePasswordSave}>
                        <FormInput
                          label="Current Password"
                          type="password"
                          placeholder="Enter current password"
                          value={passwordForm.current}
                          onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                        />
                        <FormInput
                          label="New Password"
                          type="password"
                          placeholder="Enter new password"
                          value={passwordForm.next}
                          onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
                        />
                        <FormInput
                          label="Confirm New Password"
                          type="password"
                          placeholder="Re-enter new password"
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                        />
                        {passwordError && (
                          <p className="text-sm font-medium text-red-600">{passwordError}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <Button type="submit" variant="primary">
                            Update Password
                          </Button>
                          {passwordSaved && (
                            <span className="text-sm font-medium text-teal-600">Password updated.</span>
                          )}
                        </div>
                      </form>
                    )}

                    {key === "notifications" && (
                      <div className="max-w-md divide-y divide-slate-100">
                        <Toggle
                          label="Email notifications"
                          description="Booking confirmations and receipts"
                          checked={notifications.email}
                          onChange={(v) => setNotifications((p) => ({ ...p, email: v }))}
                        />
                        <Toggle
                          label="SMS notifications"
                          description="Trip reminders sent to your phone"
                          checked={notifications.sms}
                          onChange={(v) => setNotifications((p) => ({ ...p, sms: v }))}
                        />
                        <Toggle
                          label="Push notifications"
                          description="Live bus status alerts"
                          checked={notifications.push}
                          onChange={(v) => setNotifications((p) => ({ ...p, push: v }))}
                        />
                        <Toggle
                          label="Promotional offers"
                          description="News about rewards and discounts"
                          checked={notifications.promos}
                          onChange={(v) => setNotifications((p) => ({ ...p, promos: v }))}
                        />
                      </div>
                    )}

                    {key === "preferences" && (
                      <form className="max-w-md space-y-4" onSubmit={handlePreferencesSave}>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-navy-900">Preferred Language</span>
                          <select
                            value={preferences.language}
                            onChange={(e) => setPreferences((p) => ({ ...p, language: e.target.value }))}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                          >
                            <option>English</option>
                            <option>Filipino</option>
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-navy-900">Default Terminal</span>
                          <select
                            value={preferences.defaultTerminal}
                            onChange={(e) =>
                              setPreferences((p) => ({ ...p, defaultTerminal: e.target.value }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                          >
                            {TERMINALS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex items-center gap-3">
                          <Button type="submit" variant="primary">
                            Save Preferences
                          </Button>
                          {preferencesSaved && (
                            <span className="text-sm font-medium text-teal-600">Preferences saved.</span>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        <Button
          variant="outline"
          onClick={handleLogout}
          className="!border-red-300 !text-red-600 hover:!bg-red-600 hover:!text-white"
        >
          <LogoutIcon size={18} />
          Logout
        </Button>
      </div>
    </DashboardLayout>
  );
}
