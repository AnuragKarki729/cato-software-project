// Responsibility 6 — Aye Myo Myat (6837919)
// Reuse on candidate cards and profiles: <BookmarkButton applicantId={userId} />.
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function BookmarkButton({ applicantId }) {
  const [bookmark, setBookmark] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setBusy(true); setBookmark(null); setError('');
    api.get('/saved/bookmarks').then(items => {
      if (active) setBookmark(items.find(item => item.applicant_id === Number(applicantId)) || null);
    }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [applicantId]);
  async function toggle() {
    setBusy(true); setError('');
    try {
      if (bookmark) { await api.delete(`/saved/bookmarks/${bookmark.id}`); setBookmark(null); }
      else setBookmark(await api.post('/saved/bookmarks', { applicant_id: Number(applicantId) }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div><button type="button" className="btn-secondary" aria-pressed={!!bookmark} disabled={busy} onClick={toggle}>{busy ? 'Working…' : bookmark ? 'Remove bookmark' : 'Bookmark applicant'}</button>{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}</div>;
}
