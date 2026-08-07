import { Mail, Phone, MapPin, Calendar, LogOut, Award, Pencil } from "lucide-react";
import { useAuth } from "../../../api/hooks/useAuth"; // src/components/Passenger/Profile/ → src/api/hooks/useAuth

/**
 * Reads the already-fetched profile out of AuthContext — no separate
 * fetch happens here. AuthProvider owns the single getProfile() call;
 * this component just renders whatever it stored.
 *
 * Actual shape returned by GET /passengers/profile (passenger_users
 * fields flat, users fields nested under `user`):
 * {
 *   name: string,
 *   birthdate: string,
 *   phone_num: string,
 *   address: string,
 *   reward_points: number,
 *   user: {
 *     email: string,
 *     username: string,
 *     role: string,
 *   }
 * }
 */
export default function Profile() {
    const { user, isLoading, logout } = useAuth();

    if (isLoading) {
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                <div className="h-1.5 bg-slate-800" />
                <div className="animate-pulse space-y-4 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-slate-800" />
                        <div className="space-y-2">
                            <div className="h-4 w-32 rounded bg-slate-800" />
                            <div className="h-3 w-24 rounded bg-slate-800" />
                        </div>
                    </div>
                    <div className="h-3 w-full rounded bg-slate-800" />
                    <div className="h-3 w-3/4 rounded bg-slate-800" />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
                <p className="text-slate-400">
                    Profile information isn't available right now. Try refreshing the page.
                </p>
            </div>
        );
    }

    const initials = (user.name || user.user?.username || "?")
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const formattedBirthdate = user.birthdate
        ? new Date(user.birthdate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : null;

    // Reward points are promoted to a badge near the header instead of
    // sitting in this list — it's the one stat worth surfacing, not burying.
    const fields = [
        { icon: Mail, label: "Email", value: user.user?.email },
        { icon: Phone, label: "Phone", value: user.phone_num, mono: true },
        { icon: MapPin, label: "Address", value: user.address },
        { icon: Calendar, label: "Date of birth", value: formattedBirthdate },
    ].filter((field) => field.value);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {/* Fare-card stripe */}
            <div className="h-1.5 bg-linear-to-r from-blue-500 via-indigo-500 to-sky-400" />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-lg font-semibold text-white">
                            {initials}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-100">
                                {user.name || user.user?.username || "Passenger"}
                            </h2>
                            {user.user?.username && (
                                <p className="mt-0.5 text-sm text-slate-500">@{user.user.username}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                        {user.reward_points != null && (
                            <span className="font-data inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                                <Award className="h-3.5 w-3.5" />
                                {user.reward_points} pts
                            </span>
                        )}
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                        </button>
                    </div>
                </div>

                {/* Ticket-stub divider — notches sit exactly on the card edge and
            get clipped by the card's own overflow-hidden, mimicking a
            perforated stub. -mx-6 cancels this wrapper's padding so the
            dashed line spans the full card width. */}
                <div className="relative -mx-6 my-6">
                    <div className="border-t border-dashed border-slate-700" />
                    <span className="absolute left-0 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
                    <span className="absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
                </div>

                {/* Details */}
                <dl className="space-y-3">
                    {fields.length === 0 ? (
                        <p className="text-sm text-slate-500">No additional details on file yet.</p>
                    ) : (
                        fields.map(({ icon: Icon, label, value, mono }) => (
                            <div key={label} className="flex items-center gap-3">
                                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                                <dt className="w-28 shrink-0 text-sm text-slate-500">{label}</dt>
                                <dd className={["text-sm text-slate-200", mono ? "font-data" : ""].join(" ")}>{value}</dd>
                            </div>
                        ))
                    )}
                </dl>

                {/* Footer action */}
                <div className="mt-6 border-t border-slate-800 pt-4">
                    <button
                        type="button"
                        onClick={logout}
                        className="inline-flex items-center gap-1.5 text-sm text-red-400 transition hover:text-red-300"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}