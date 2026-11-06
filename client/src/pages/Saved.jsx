// Responsibility 6: Saved searches and bookmarks — Aye Myo Myat (6837919)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Saved() {
  const [searches, setSearches] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    Promise.all([api.get('/saved/searches'), api.get('/saved/bookmarks')])
      .then(([s, b]) => { if (active) { setSearches(s); setBookmarks(b); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function perform(action) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function removeSearch(item) {
    if (!window.confirm(`Delete saved search “${item.name}”?`)) return;
    perform(async () => {
      await api.delete(`/saved/searches/${item.id}`);
      setSearches(items => items.filter(search => search.id !== item.id)); setNotice('Search deleted.');
    });
  }
  function run(item) {
    perform(async () => {
      const filters = await api.post(`/saved/searches/${item.id}/run`);
      navigate('/find', { state: { savedSearch: filters, savedSearchName: item.name } });
    });
  }
  function removeBookmark(item) {
    perform(async () => {
      await api.delete(`/saved/bookmarks/${item.id}`);
      setBookmarks(items => items.filter(bookmark => bookmark.id !== item.id)); setNotice('Bookmark removed.');
    });
  }
  if (loading) return <p role="status">Loading your saved items…</p>;
  return <section className="space-y-6">
    <div><p className="text-sm font-semibold text-brand-700">Your recruiter workspace</p><h1>Saved searches & applicants</h1><p className="mt-2 text-ink-soft">Keep useful filters and return to candidates you want to meet.</p></div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-brand-700">{notice}</p>}
    <div className="grid items-start gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <section className="card space-y-4"><h2>Saved searches <span className="text-ink-muted">({searches.length})</span></h2>
          {searches.length === 0 ? <p className="text-sm text-ink-muted">No saved searches yet. Use Save search on Find candidates to save your filters.</p> : <ul className="space-y-3">{searches.map(item => <li key={item.id} className="rounded-lg border border-line p-4">
            <h3 className="font-semibold break-words">{item.name}</h3><p className="mt-1 text-sm text-ink-soft">{item.field_of_study || 'Any field'} · {item.min_year === 5 ? 'Graduated' : `Year ${item.min_year}+`} · GPA {item.min_gpa}+ · {item.min_internships}+ internships</p>
            <p className="mt-1 text-xs text-ink-muted">{item.skills.join(', ') || 'Any skills'}</p>
            <div className="mt-3 flex gap-2"><button className="btn-primary" disabled={busy} onClick={() => run(item)}>Run search</button><button className="btn-secondary" disabled={busy} onClick={() => removeSearch(item)}>Delete</button></div>
          </li>)}</ul>}
        </section>
      </div>
      <section className="card space-y-4"><h2>Bookmarked applicants <span className="text-ink-muted">({bookmarks.length})</span></h2>
        {bookmarks.length === 0 ? <p className="text-sm text-ink-muted">No bookmarks yet. Use Bookmark applicant on a candidate profile.</p> : <ul className="space-y-3">{bookmarks.map(item => <li key={item.id} className="rounded-lg border border-line p-4">
          <Link className="font-semibold text-brand-700 hover:underline" to={`/applicants/${item.applicant_id}`}>{item.name}</Link>
          <p className="mt-1 text-sm text-ink-soft">{item.field_of_study || 'Profile not completed'}{item.year ? ` · ${item.year === 5 ? 'Graduated' : `Year ${item.year}`}` : ''}</p>
          <div className="mt-3 flex gap-2"><Link className="btn-primary" to={`/applicants/${item.applicant_id}`}>Open profile</Link><button className="btn-secondary" disabled={busy} onClick={() => removeBookmark(item)}>Remove</button></div>
        </li>)}</ul>}
      </section>
    </div>
  </section>;
}
