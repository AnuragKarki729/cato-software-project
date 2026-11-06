// Responsibility 7 — Aye Myo Myat (6837919)
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
  const links = !user ? [] : user.role === 'recruiter' ? RECRUITER_LINKS : APPLICANT_LINKS;
  return <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-4 border-b border-line bg-surface px-6 py-3">
    <Link to="/" className="text-xl font-bold text-brand-700">Cato</Link>
    {links.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'underline underline-offset-4' : ''}`}>{label}</NavLink>)}
    <span className="flex-1" />
    {user ? <><span className="text-sm text-ink-muted">{user.name}</span><button className="btn-secondary" disabled={busy} onClick={handleLogout}>{busy ? 'Logging out…' : 'Log out'}</button></>
      : <><Link className="nav-link" to="/login">Log in</Link><Link className="btn-primary" to="/signup">Sign up</Link></>}
    {error && <p className="w-full text-sm text-red-600" role="alert">{error}</p>}
  </nav>;
}
