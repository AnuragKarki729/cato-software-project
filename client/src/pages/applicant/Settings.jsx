// Responsibility 2 (issue #5) — the applicant's privacy settings.
//
// Two controls, both saved through PUT /api/profiles/me/privacy:
//   Hide my profile    takes them out of the recruiters' ranked results and Explore, and out
//                      of the other applicants' video feed
//   Blocked companies  those recruiters only, matched on the company name
//
// Nothing is deleted by either of them and an invitation already sent still stands, which the
// page says rather than leaving the applicant to guess.
//
// Both roles: "Delete account" (DELETE /api/auth/me) at the bottom, behind the password. Recruiters
// see only that, since visibility is an applicant's setting.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, CircleAlert, EyeOff, Plus, Trash2, X } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import { Button, Checkbox, Dialog, TextField, Toast } from '../../components/ui/primitives.jsx';

function DeleteAccount({ isApplicant }) {
  const { forget } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.delete('/auth/me', { password });
      forget();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const close = () => { if (!busy) { setOpen(false); setPassword(''); setError(''); } };
  const gone = isApplicant
    ? 'your profile, resume, videos and invitations'
    : 'your saved searches, bookmarks, search filter and the invitations you sent';

  return (
    <section className="ui-card st-card st-danger">
      <div className="st-card__head">
        <span className="st-card__icon"><Trash2 aria-hidden="true" /></span>
        <div>
          <h2 className="ui-h5">Delete account</h2>
          <p className="ui-text-soft">Permanently deletes your account and {gone}. This cannot be undone.</p>
        </div>
      </div>
      <div><Button variant="secondary" size="md" icon={Trash2} className="st-danger__button" onClick={() => setOpen(true)}>Delete my account</Button></div>
      {open && (
        <Dialog label="Delete your account?" onClose={close}>
          <form className="st-danger__form" onSubmit={remove}>
            <h2 className="ui-h5">Delete your account?</h2>
            <p className="ui-text-soft">This deletes {gone}, for good. Enter your password to confirm.</p>
            <TextField label="Password" type="password" value={password} autoFocus autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)} error={error || undefined} disabled={busy} />
            <div className="ui-dialog__actions">
              <Button variant="secondary" size="md" onClick={close} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" icon={Trash2} className="st-danger__confirm" disabled={busy || !password}>
                {busy ? 'Deleting…' : 'Delete forever'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isApplicant = user?.role === 'applicant';
  const [hidden, setHidden] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [company, setCompany] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!isApplicant) { setLoaded(true); return undefined; }  // recruiters have no profile to load
    let active = true;
    api.get('/profiles/me')
      .then((profile) => {
        if (!active) return;
        setHidden(!!profile.hidden);
        setBlocked(profile.blocked_companies || []);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [isApplicant]);

  // Saved as one object, so the toggle and the list cannot disagree with what is stored.
  async function save(next) {
    setSaving(true);
    setError('');
    try {
      const saved = await api.put('/profiles/me/privacy', next);
      setHidden(!!saved.hidden);
      setBlocked(saved.blocked_companies || []);
      setToast({ title: 'Settings saved', message: saved.hidden
        ? 'Your profile is hidden from everyone.'
        : 'Your profile is visible to recruiters.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function addCompany(event) {
    event.preventDefault();
    const name = company.trim();
    if (!name) return;
    // The server deduplicates too; this is so the field clears and nothing flashes in twice.
    const already = blocked.some((c) => c.toLowerCase() === name.toLowerCase());
    setCompany('');
    if (already) return;
    save({ hidden, blocked_companies: [...blocked, name] });
  }

  const removeCompany = (name) =>
    save({ hidden, blocked_companies: blocked.filter((c) => c !== name) });

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main st-main">
        <div className="st-head">
          <h1 className="ui-h3">Settings</h1>
          <p className="ui-text-soft">{isApplicant
            ? 'Who can find you on Cato, and your account.'
            : 'Your account.'}</p>
        </div>

        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}
        {!loaded && <span className="ui-skeleton st-skeleton" />}

        {loaded && isApplicant && (
          <>
            <section className="ui-card st-card">
              <div className="st-card__head">
                <span className="st-card__icon"><EyeOff aria-hidden="true" /></span>
                <div>
                  <h2 className="ui-h5">Profile visibility</h2>
                  <p className="ui-text-soft">
                    While you are hidden, recruiters do not see you in their search results or on
                    Explore, and other applicants do not see your pitch in the video feed.
                    Invitations you have already received still work.
                  </p>
                </div>
              </div>
              <Checkbox
                label="Hide my profile"
                description="Turn this off whenever you want to be found again."
                checked={hidden}
                disabled={saving}
                onChange={(next) => { setHidden(next); save({ hidden: next, blocked_companies: blocked }); }}
              />
              <p className={`st-state${hidden ? ' is-hidden' : ''}`} aria-live="polite">
                {hidden ? 'Hidden — nobody can find you right now.' : 'Visible — recruiters can find you.'}
              </p>
            </section>

            <section className="ui-card st-card">
              <div className="st-card__head">
                <span className="st-card__icon"><Ban aria-hidden="true" /></span>
                <div>
                  <h2 className="ui-h5">Blocked companies</h2>
                  <p className="ui-text-soft">
                    Recruiters from these companies will not see your profile and cannot invite
                    you. Everyone else still can. Type the company name as it appears on their
                    account.
                  </p>
                </div>
              </div>

              <form className="st-add" onSubmit={addCompany}>
                <TextField label="Company name" placeholder="e.g. Agoda" value={company}
                  onChange={(event) => setCompany(event.target.value)} disabled={saving} />
                <Button variant="secondary" size="md" icon={Plus} type="submit" disabled={saving || !company.trim()}>
                  Block
                </Button>
              </form>

              {blocked.length === 0
                ? <p className="ui-text-muted">You have not blocked any companies.</p>
                : (
                  <ul className="st-blocked" aria-label="Blocked companies">
                    {blocked.map((name) => (
                      <li key={name}>
                        <span>{name}</span>
                        <button type="button" onClick={() => removeCompany(name)} disabled={saving}
                          aria-label={`Unblock ${name}`}><X aria-hidden="true" /></button>
                      </li>
                    ))}
                  </ul>
                )}
            </section>
          </>
        )}
        {loaded && <DeleteAccount isApplicant={isApplicant} />}
      </main>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
