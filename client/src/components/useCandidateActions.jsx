// Invite (Figma "P9b · Invite dialog") and Bookmark ("Overlay · Bookmarked / Bookmark removed")
// for every page that lists candidates. UI by Nusrat Begam (6638009).
// The calls follow the planned API: POST /api/invitations (Responsibility 8, Siwakorn P.) and
// POST/DELETE /api/saved/bookmarks (Responsibility 6, Aye Myo Myat). Until those routes are live
// the toast says so; nothing pretends to be sent or saved.
import { useCallback, useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Dialog, Toast } from './ui/primitives.jsx';

// A route that is not mounted yet answers 404 "Not Found" (or 405/501).
const notBuilt = (err) => err.status === 501 || err.status === 405 || (err.status === 404 && err.message === 'Not Found');

export default function useCandidateActions() {
  const { user } = useAuth();
  const [inviting, setInviting] = useState(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [invited, setInvited] = useState(() => new Set());
  const [bookmarks, setBookmarks] = useState(() => new Map()); // applicant id -> bookmark id
  const closeToast = useCallback(() => setToast(null), []);
  const company = user?.company_name || 'Our company';

  async function sendInvitation() {
    const candidate = inviting;
    setSending(true);
    try {
      await api.post('/invitations', { applicant_id: candidate.applicant_id });
      setInvited((set) => new Set(set).add(candidate.applicant_id));
      setToast({ title: 'Invitation sent', message: `${candidate.name} will see it on their Invitations page.` });
    } catch (err) {
      setToast(notBuilt(err)
        ? { title: 'Invitation not sent', message: 'Invitations are not connected yet (Responsibility 8).', tone: 'error' }
        : { title: 'Invitation not sent', message: err.message, tone: 'error' });
    } finally {
      setSending(false);
      setInviting(null);
    }
  }

  async function toggleBookmark(candidate) {
    const existing = bookmarks.get(candidate.applicant_id);
    try {
      if (existing) {
        await api.delete(`/saved/bookmarks/${existing}`);
        setBookmarks((map) => { const next = new Map(map); next.delete(candidate.applicant_id); return next; });
        setToast({ title: 'Bookmark removed', message: `${candidate.name} is no longer in Saved.` });
      } else {
        const saved = await api.post('/saved/bookmarks', { applicant_id: candidate.applicant_id });
        setBookmarks((map) => new Map(map).set(candidate.applicant_id, saved.id));
        setToast({ title: 'Bookmarked', message: `Find ${candidate.name} any time in Saved.` });
      }
    } catch (err) {
      setToast(notBuilt(err)
        ? { title: 'Not bookmarked', message: 'Bookmarks are not connected yet (Responsibility 6).', tone: 'error' }
        : { title: 'Not bookmarked', message: err.message, tone: 'error' });
    }
  }

  const ui = (
    <>
      {inviting && (
        <Dialog label={`Invite ${inviting.name}?`} onClose={() => !sending && setInviting(null)} className="ui-dialog iv-dialog">
          <div className="iv-dialog__head">
            <span className="iv-dialog__icon"><Send aria-hidden="true" /></span>
            <div>
              <h2 className="ui-h5">Invite {inviting.name}?</h2>
              <p className="ui-text-soft">They will receive this message on their Invitations page. You can invite each applicant once.</p>
            </div>
          </div>
          <div className="iv-dialog__message">
            <p className="ui-score__label">Message</p>
            <p className="ui-text-soft">“{company} is interested in you and is sending this invitation to {inviting.name}’s email about a job vacancy.”</p>
          </div>
          <div className="ui-dialog__actions">
            <Button variant="secondary" size="md" onClick={() => setInviting(null)} disabled={sending}>Cancel</Button>
            <Button variant="primary" size="md" icon={Send} onClick={sendInvitation} disabled={sending}>{sending ? 'Sending…' : 'Send invitation'}</Button>
          </div>
        </Dialog>
      )}
      <Toast toast={toast} onClose={closeToast} />
    </>
  );

  return {
    invite: setInviting,
    toggleBookmark,
    isInvited: (id) => invited.has(id),
    isBookmarked: (id) => bookmarks.has(id),
    notify: setToast,
    ui,
  };
}
