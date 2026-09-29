import PublicLayout from "../PublicLayout.jsx";

const PHOTO = "/images/auth-road.jpg";

// Card layout shared by Login and Signup: the form on one side, a rounded photo on the
// other, with a headline over the photo. The photo is hidden on small screens so the
// form gets the full width.
export default function AuthCard({ photoSide = "right", title, text, tagline, children }) {
  const photo = (
    <div className="relative hidden min-h-[560px] overflow-hidden rounded-2xl bg-navy-900 lg:block">
      <img src={PHOTO} alt="Tree-lined provincial highway in the Philippines" className="absolute inset-0 h-full w-full object-cover object-[78%_center]" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 from-10% via-navy-950/50 via-35% to-transparent to-60%" />
      <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
        <h2 className="font-display text-3xl font-extrabold uppercase leading-[1.05] tracking-tight text-white xl:text-4xl">
          {title}
        </h2>
        {text && <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-200">{text}</p>}
        {tagline && <p className="mt-4 text-sm text-slate-300">{tagline}</p>}
      </div>
    </div>
  );

  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10 sm:px-8 sm:py-14">
        <div className="grid w-full max-w-5xl grid-cols-1 items-stretch gap-8 rounded-[2rem] bg-teal-50/70 p-5 ring-1 ring-teal-100 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
          {photoSide === "left" && photo}
          <div className="flex min-w-0 items-center justify-center py-2 lg:py-6">
            <div className="w-full max-w-sm">{children}</div>
          </div>
          {photoSide === "right" && photo}
        </div>
      </div>
    </PublicLayout>
  );
}
