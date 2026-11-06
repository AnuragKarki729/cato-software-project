import { Link } from 'react-router-dom';

export default function Brand({ light = false }) {
  return <Link to="/" className={`inline-flex shrink-0 items-center gap-2 text-[20px] font-semibold ${light ? 'text-white' : 'text-ink'}`} aria-label="Cato home">
    <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-brand-500"><span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-ink" /></span>Cato
  </Link>;
}
