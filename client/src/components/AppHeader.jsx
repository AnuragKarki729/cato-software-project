// Figma "Navbar" (desktop) and bottom tab bar (mobile), for the logged-in pages.
// Added with Responsibilities 2 and 5 — Nusrat Begam (6638009); uses the shared auth
// context from Responsibility 7. Other pages can reuse it: <AppHeader />.
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Bookmark, Compass, Inbox, LogOut, Search, Send, ShieldCheck, User, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Button, Dialog, Logo } from './ui/primitives.jsx';

const LINKS = {
  applicant: [
    { to: '/profile', label: 'My profile', short: 'Profile', icon: User, match: ['/profile'] },
    { to: '/invitations', label: 'Invitations', short: 'Invitations', icon: Inbox, match: ['/invitations'] },
    { to: '/feed', label: 'Video feed', short: 'Feed', icon: Video, match: ['/feed'] },
  ],
  recruiter: [
    { to: '/find', label: 'Find candidates', short: 'Search', icon: Search, match: ['/find', '/results', '/role/'] },
    // Responsibility 3: browsing, as opposed to searching.
    { to: '/explore', label: 'Explore', short: 'Explore', icon: Compass, match: ['/explore'] },
    { to: '/sent-invitations', label: 'Sent invitations', short: 'Sent', icon: Send, match: ['/sent-invitations'] },
    { to: '/saved', label: 'Saved', short: 'Saved', icon: Bookmark, match: ['/saved'] },
  ],
};

// What each role is told about privacy. It used to be a card taking up a quarter of My
// profile, which is a lot of page for something read once; it lives in the header now, where
// it is always to hand and in the way of nothing.
const PDPA = {
  applicant: [
    'Recruiters on Cato can see your profile, your videos and your resume.',
    'Your email address is never shown on your profile.',
    'You can remove your resume or any video at any time, and recruiters lose access with it.',
  ],
  recruiter: [
    "Candidates' videos and resumes are for recruiters on Cato only.",
    'Downloading or sharing them outside Cato is not allowed.',
    'Candidates can withdraw a video or resume at any time, and your access to it ends.',
  ],
};

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [privacy, setPrivacy] = useState(false);
  if (!user) return null;

  const links = LINKS[user.role] || [];
  const isActive = (link) => link.match.some((prefix) => pathname.startsWith(prefix));
  const role = user.role === 'recruiter' ? `Recruiter${user.company_name ? ` · ${user.company_name}` : ''}` : 'Applicant';

  async function handleLogout() {
    setBusy(true);
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <header className="ui-header">
        <div className="ui-header__left">
          <Logo />
          <nav className="ui-header__links" aria-label="Main navigation">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className={`ui-header__link${isActive(link) ? ' is-active' : ''}`}
                aria-current={isActive(link) ? 'page' : undefined}>{link.label}</Link>
            ))}
          </nav>
        </div>
        <div className="ui-header__right">
          <Link className="ui-icon-btn ui-icon-btn--md" to={user.role === 'recruiter' ? '/sent-invitations' : '/invitations'} aria-label="Notifications">
            <Bell aria-hidden="true" />
          </Link>
          {/* The label goes on a narrow screen and the shield stays, like the rest of the
              header's text. */}
          <button type="button" className="ui-header__pdpa" onClick={() => setPrivacy(true)}
            aria-label="Privacy (PDPA)" title="Privacy (PDPA)">
            <ShieldCheck aria-hidden="true" /><span>PDPA</span>
          </button>
          <div className="ui-header__person">
            <Avatar name={user.name} />
            <span className="ui-header__name">{user.name}<span>{role}</span></span>
          </div>
          <Button variant="ghost" size="sm" icon={LogOut} className="ui-header__logout" disabled={busy} onClick={handleLogout}>
            {busy ? 'Logging out…' : 'Log out'}
          </Button>
          <details className="ui-header__menu">
            <summary aria-label="Account menu"><Avatar name={user.name} /></summary>
            <div className="ui-header__menu-panel">
              <p><strong>{user.name}</strong><br /><span className="ui-text-xs ui-text-muted">{role}</span></p>
              <Button variant="ghost" size="sm" icon={LogOut} block disabled={busy} onClick={handleLogout}>Log out</Button>
            </div>
          </details>
        </div>
      </header>
      {error && <p className="ui-header__error" role="alert">{error}</p>}
      {privacy && (
        <Dialog label="Privacy (PDPA)" onClose={() => setPrivacy(false)}>
          <h2 className="ui-h5">Privacy (PDPA)</h2>
          {(PDPA[user.role] || []).map((line) => <p className="ui-text-soft" key={line}>{line}</p>)}
          <div className="ui-dialog__actions">
            <Button variant="secondary" size="md" onClick={() => setPrivacy(false)}>Close</Button>
          </div>
        </Dialog>
      )}
      <nav className="ui-tabbar" aria-label="Main navigation">
        {links.map(({ icon: Icon, ...link }) => (
          <Link key={link.to} to={link.to} className={isActive(link) ? 'is-active' : undefined} aria-current={isActive(link) ? 'page' : undefined}>
            <span><Icon aria-hidden="true" /></span>{link.short}
          </Link>
        ))}
      </nav>
    </>
  );
}
