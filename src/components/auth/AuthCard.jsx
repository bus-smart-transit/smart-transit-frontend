import PublicLayout from "../PublicLayout.jsx";

// Shared layout for Login and Signup: the form in a single centered white card.
// `wide` gives Signup room for two columns so it fits without scrolling.
export default function AuthCard({ wide = false, children }) {
  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-8 sm:px-8">
        <div
          className={`w-full rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-200/70 motion-safe:animate-fade-up sm:p-8 ${
            wide ? "max-w-4xl lg:px-10" : "max-w-lg sm:p-10"
          }`}
        >
          {children}
        </div>
      </div>
    </PublicLayout>
  );
}
