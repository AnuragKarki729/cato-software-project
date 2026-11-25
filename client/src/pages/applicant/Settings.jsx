// Responsibility 2 (issue #5) — the applicant's privacy settings.
//
// Two controls, both saved through PUT /api/profiles/me/privacy:
//   Hide my profile    takes them out of the recruiters' ranked results and Explore, and out
//                      of the other applicants' video feed
//   Blocked companies  those recruiters only, matched on the company name
//
// Nothing is deleted by either of them and an invitation already sent still stands, which the
// page says rather than leaving the applicant to guess.
import { useEffect, useState } from 'react';
import { Ban, CircleAlert, EyeOff, Plus, X } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import { Button, Checkbox, TextField, Toast } from '../../components/ui/primitives.jsx';

export default function Settings() {
  const [hidden, setHidden] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [company, setCompany] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
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
  }, []);

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
          <p className="ui-text-soft">Who can find you on Cato. Nothing here deletes your profile, your resume or your videos.</p>
        </div>

        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}
        {!loaded && <span className="ui-skeleton st-skeleton" />}

        {loaded && (
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
      </main>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
