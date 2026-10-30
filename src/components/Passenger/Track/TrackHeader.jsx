import { Link } from 'react-router-dom'
import BrandLogo from '../../ui/BrandLogo'

/** The plain header of the public tracking pages: brand on the left, page title on the right. */
export default function TrackHeader({ title = 'Track my bus' }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="inline-flex items-center" aria-label="SmartTransit home">
          <BrandLogo className="h-10" alt="" />
        </Link>
        <h1 className="text-sm font-semibold text-slate-600 sm:text-base">{title}</h1>
      </div>
    </header>
  )
}
