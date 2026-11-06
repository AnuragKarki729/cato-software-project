// Responsibility 7 — Aye Myo Myat (6837919)
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';

const APPLICANT_LINKS = [['/profile', 'My profile'], ['/invitations', 'Invitations'], ['/feed', 'Video feed']];
const RECRUITER_LINKS = [['/find', 'Find candidates'], ['/sent-invitations', 'Sent invitations'], ['/saved', 'Saved'], ['/feed', 'Video feed']];
export default function NavBar({ user }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function handleLogout() {
    setBusy(true); setError('');
    try { await logout(); navigate('/login', { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const links = user.role === 'recruiter' ? RECRUITER_LINKS : APPLICANT_LINKS;
  const initials = user.name.trim().split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase();
  return <header className="border-b border-line bg-surface">
    <nav aria-label="Main navigation" className="flex h-14 items-center gap-6 px-4 sm:px-7">
      <Brand />
      <div className="hidden h-full items-center gap-6 lg:flex">{links.map(([to,label]) => <NavLink key={to} to={to} className={({isActive}) => `flex h-full items-center border-b-2 text-xs ${isActive ? 'border-brand-500 text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>{label}</NavLink>)}</div>
      <span className="flex-1" />
      <Link className="text-ink-soft" to={user.role === 'recruiter' ? '/sent-invitations' : '/invitations'} aria-label="Notifications"><Icon name="bell" className="h-4 w-4" /></Link>
      <div className="hidden items-center gap-2 lg:flex"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[10px] font-medium text-brand-700">{initials}</span><span className="text-[12px] leading-4">{user.name}<span className="block text-[10px] text-ink-muted">{user.role === 'recruiter' ? `Recruiter${user.company_name ? ` · ${user.company_name}` : ''}` : 'Applicant'}</span></span></div>
      <button className="hidden items-center gap-1.5 text-xs disabled:opacity-50 lg:flex" disabled={busy} onClick={handleLogout}><Icon name="logout" className="h-4 w-4" />{busy ? 'Logging out…' : 'Log out'}</button>
      <details className="relative lg:hidden"><summary aria-label="Account menu" className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full bg-brand-50 text-[10px] font-medium text-brand-700">{initials}</summary><div className="absolute top-10 right-0 z-20 w-56 rounded-lg border border-line bg-surface p-3 shadow-lg"><p className="mb-2 border-b border-line pb-2 text-sm font-medium">{user.name}</p>{links.map(([to,label]) => <Link key={to} to={to} className="block rounded px-2 py-2 text-sm hover:bg-page" onClick={event => { event.currentTarget.closest('details').open = false; }}>{label}</Link>)}<button className="mt-2 flex w-full items-center gap-2 border-t border-line px-2 pt-3 text-sm disabled:opacity-50" disabled={busy} onClick={handleLogout}><Icon name="logout" />Log out</button></div></details>
    </nav>
    {error && <p className="px-4 pb-3 text-xs text-red-600" role="alert">{error}</p>}
  </header>;
}
