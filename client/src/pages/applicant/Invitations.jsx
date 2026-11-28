// Figma "P6 · Invitations". UI by Nusrat Begam (6638009).
// Data: GET /api/invitations/received and POST /api/invitations/{id}/accept|decline
// (Responsibility 8, Siwakorn P.). Until those routes exist the page shows the design's sample
// invitations, and says so.
import { useCallback, useEffect, useState } from 'react';
import { Calendar, Check, CircleAlert, Info } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import { Avatar, Badge, Button, Dialog, Toast } from '../../components/ui/primitives.jsx';
import { routeMissing, sampleInvitations } from '../../data/samples.js';
import { shortDate } from '../../utils/format.js';

// Matches the server (schemas/invitation.py): the default reason and the length limit.
const DEFAULT_REASON = "I don't think I fit well into this role.";
const MAX_REASON = 200;
const STATUS = { pending: ['warning', 'Pending'], accepted: ['success', 'Accepted'], declined: ['danger', 'Declined'], expired: ['neutral', 'Expired'] };
const POINTS = [
  'Each company has one invitation open at a time. If you decline, they may ask again.',
  'Accept to share your email with that company. They contact you outside Cato.',
  'Declining can include a short reason for the company. Leave it blank and they read a polite default.',
  'Invitations expire after 14 days without an answer.',
];

function footnote(invitation) {
  if (invitation.status === 'accepted') return `You accepted on ${shortDate(invitation.date)} · ${invitation.company} can now see your email`;
  if (invitation.status === 'declined') return `You declined on ${shortDate(invitation.date)}`;
  if (invitation.status === 'expired') return `Expired · received ${shortDate(invitation.date)}`;
  return `Received ${shortDate(invitation.date)}`;
}

export default function Invitations() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [sample, setSample] = useState(false);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let active = true;
    api.get('/invitations/received')
      .then((items) => { if (active) setList(items); })
      .catch((err) => {
        if (!active) return;
        if (routeMissing(err)) { setList(sampleInvitations(user.email)); setSample(true); } else setError(err.message);
      });
    return () => { active = false; };
  }, [user.email]);

  // Declining asks for an optional reason first (a small dialog); blank gets the default.
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState('');

  async function answer(invitation, status, why) {
    const today = new Date().toISOString().slice(0, 10);
    if (sample) {
      setList((items) => items.map((i) => (i.id === invitation.id ? { ...i, status, date: today } : i)));
      setToast({ title: status === 'accepted' ? 'Accepted (sample)' : 'Declined (sample)', message: 'Invitations are not connected yet (Responsibility 8), so this is not saved.' });
      return;
    }
    try {
      const updated = status === 'accepted'
        ? await api.post(`/invitations/${invitation.id}/accept`)
        : await api.post(`/invitations/${invitation.id}/decline`, { reason: (why || '').trim() || null });
      setList((items) => items.map((i) => (i.id === invitation.id ? { ...i, ...updated } : i)));
      setToast({ title: status === 'accepted' ? 'Invitation accepted' : 'Invitation declined',
        message: status === 'accepted'
          ? `${invitation.company} can now see your email, and you can reach ${invitation.recruiter} at theirs.`
          : `${invitation.company} will see: “${updated.decline_reason}”` });
    } catch (err) {
      setToast({ title: 'Could not answer', message: err.message, tone: 'error' });
    }
  }

  const pending = list?.filter((i) => i.status === 'pending') ?? [];
  const answered = list?.filter((i) => i.status !== 'pending') ?? [];
  const shown = tab === 'pending' ? pending : tab === 'answered' ? answered : list ?? [];
  const tabs = [['all', 'All', list?.length ?? 0], ['pending', 'Pending', pending.length], ['answered', 'Answered', answered.length]];

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main">
        <div className="in-header">
          <div className="fc-heading">
            <h1 className="ui-h2">Invitations</h1>
            <p className="ui-lead">Recruiters whose filters matched your profile. Accepting shares your email with that company.</p>
          </div>
          <div className="in-tabs" role="tablist" aria-label="Filter invitations">
            {tabs.map(([key, label, n]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : undefined} onClick={() => setTab(key)}>
                {label} {n}
              </button>
            ))}
          </div>
        </div>
        {sample && <p className="ui-alert ui-alert--info"><Info />Sample invitations from the design. Receiving and answering invitations is Responsibility 8 and not connected yet.</p>}
        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

        <div className="pf-columns">
          <div className="in-list" role="tabpanel">
            {!list && !error && [0, 1].map((i) => <span key={i} className="ui-skeleton" style={{ height: 222, borderRadius: 12 }} />)}
            {list && shown.length === 0 && (
              <section className="ui-card ui-empty">
                <h2 className="ui-h5">{tab === 'pending' ? 'No pending invitations' : 'No invitations yet'}</h2>
                <p className="ui-text-soft">When a recruiter’s filters match your profile and they invite you, it shows up here.</p>
              </section>
            )}
            {shown.map((invitation) => {
              const [tone, label] = STATUS[invitation.status] || STATUS.pending;
              return (
                <article key={invitation.id} className={`ui-card in-card${invitation.status === 'pending' ? ' is-pending' : ''}`}>
                  <div className="in-card__head">
                    <Avatar name={invitation.company} size="md" />
                    <div><p className="ui-h5">{invitation.company}</p><p className="ui-text-soft">{invitation.recruiter}{invitation.team ? ` · ${invitation.team}` : ''}</p></div>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <p className="in-card__message">“{invitation.message}”</p>
                  {/* Accepted: both sides can now reach each other. The recruiter sees this
                      applicant's email in their Sent invitations; this is the other half. */}
                  {invitation.status === 'declined' && invitation.decline_reason && (
                    <p className="in-card__reason">Your reason: “{invitation.decline_reason}”</p>
                  )}
                  {invitation.status === 'accepted' && invitation.recruiter_email && (
                    <p className="in-card__contact">
                      Email {invitation.recruiter} at <a href={`mailto:${invitation.recruiter_email}`}>{invitation.recruiter_email}</a>
                    </p>
                  )}
                  <div className="in-card__foot">
                    <span className="ui-text-muted"><Calendar aria-hidden="true" />{footnote(invitation)}</span>
                    {invitation.status === 'pending' && (
                      <div className="in-card__actions">
                        <Button variant="secondary" size="md" onClick={() => { setReason(''); setDeclining(invitation); }}>Decline</Button>
                        <Button variant="accent" size="md" icon={Check} onClick={() => answer(invitation, 'accepted')}>Accept</Button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="pf-sidebar">
            <section className="ui-card">
              <div className="pf-privacy__head"><Info aria-hidden="true" /><h2 className="ui-h5">How invitations work</h2></div>
              <ul className="in-points">{POINTS.map((p) => <li key={p}><Check aria-hidden="true" />{p}</li>)}</ul>
            </section>
            <section className="ui-card">
              <h2 className="ui-h5">Get more invitations</h2>
              <p className="ui-text-soft">Profiles with a pitch, five or more skills and a resume rank higher in recruiter searches.</p>
              <div><Button variant="secondary" size="sm" to="/profile/edit">Improve my profile</Button></div>
            </section>
          </aside>
        </div>
      </main>
      {declining && (
        <Dialog label={`Decline ${declining.company}?`} onClose={() => setDeclining(null)}>
          <form className="in-decline" onSubmit={(event) => { event.preventDefault(); const inv = declining; setDeclining(null); answer(inv, 'declined', reason); }}>
            <h2 className="ui-h5">Decline {declining.company}?</h2>
            <p className="ui-text-soft">You can tell them why. It is optional: left blank, they read “{DEFAULT_REASON}”</p>
            <div className="ui-field">
              <label className="ui-label" htmlFor="decline-reason">Reason (optional)</label>
              <textarea id="decline-reason" className="ui-control in-decline__reason" rows={3} maxLength={MAX_REASON}
                placeholder={DEFAULT_REASON} value={reason} autoFocus onChange={(event) => setReason(event.target.value)} />
              <p className="ui-help">{reason.length} / {MAX_REASON}</p>
            </div>
            <div className="ui-dialog__actions">
              <Button variant="secondary" size="md" onClick={() => setDeclining(null)}>Cancel</Button>
              <Button type="submit" variant="primary" size="md">Decline</Button>
            </div>
          </form>
        </Dialog>
      )}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
