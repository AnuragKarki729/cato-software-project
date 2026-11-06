// Responsibility 7 — Aye Myo Myat (6837919). Based on supplied desktop/mobile frames.
import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';

export default function AuthLayout({ signup = false, children }) {
  return <div className="min-h-screen bg-page lg:grid lg:grid-cols-[39%_61%]">
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden"><Brand /><Link className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs" to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Sign up'}</Link></header>
    <aside className="hidden min-h-screen flex-col bg-ink px-12 py-12 text-white lg:flex">
      <Brand light />
      <div className="flex flex-1 flex-col justify-center py-12">
        <h2 className="max-w-[390px] text-[26px] leading-[1.2] font-semibold tracking-tight">{signup ? 'Your next role starts with a 30-second hello.' : 'Welcome back to better hiring.'}</h2>
        <p className="mt-5 max-w-[390px] text-[16px] leading-6 text-slate-300">{signup ? 'One profile, one pitch, and recruiters who hire on skills and fit.' : 'Pick up where you left off: new invitations, fresh pitches and your saved searches.'}</p>
        <ul className="mt-5 space-y-5 text-[14px]">{['Fixed filters, no guesswork', 'A score breakdown for every match', 'You decide who sees your data'].map(text => <li key={text} className="flex items-center gap-2"><Icon name="circleCheck" className="h-4 w-4 text-brand-500" />{text}</li>)}</ul>
      </div>
      <div>
        <div role="img" aria-label="Illustration of an applicant pitch video" className="relative flex h-[156px] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-slate-800 via-slate-800 to-slate-950">
          <span className="absolute top-2 left-2 rounded-sm bg-brand-500 px-1 text-[11px] text-ink">Pitch</span>
          <span className="absolute top-7 text-[28px] font-semibold text-slate-600">NB</span>
          <span className="relative mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><span className="ml-1 h-0 w-0 border-y-[8px] border-l-[12px] border-y-transparent border-l-ink" /></span>
          <span className="absolute right-2 bottom-2 rounded bg-slate-950 px-1 text-[10px]">0:28</span>
        </div>
        <p className="mt-3 text-[12px] text-slate-300">Recruiters watch your pitch before they read your CV.</p>
      </div>
    </aside>
    <div className="flex items-center justify-center px-4 py-6 lg:px-10 lg:py-12"><div className="w-full max-w-[442px]">{children}</div></div>
  </div>;
}

export function AuthField({ label, icon, hint, ...props }) {
  return <label className="block text-[12px] font-medium leading-4">{label}<span className="relative mt-1 block"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted"><Icon name={icon} className="h-4 w-4" /></span><input {...props} className="h-9 w-full rounded-[5px] border border-slate-300 bg-surface pr-3 pl-8 text-[12px] font-normal text-ink shadow-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" /></span>{hint && <span className="mt-1 block text-[10px] font-normal text-ink-muted">{hint}</span>}</label>;
}
