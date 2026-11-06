// Responsibility 6: Saved searches and bookmarks — Aye Myo Myat (6837919)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const empty = { name: '', field_of_study: '', min_year: 1, min_internships: 0, min_gpa: 0, skills: [] };
const fieldClass = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2';
export default function Saved() {
  const [searches, setSearches] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [options, setOptions] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState('');
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    Promise.all([api.get('/saved/searches'), api.get('/saved/bookmarks'), api.get('/options'), api.get('/saved/candidates')])
      .then(([s, b, o, c]) => { if (active) { setSearches(s); setBookmarks(b); setOptions(o); setCandidates(c); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function perform(action) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function update(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: ['min_year', 'min_internships', 'min_gpa'].includes(name) ? Number(value) : value }));
  }
  function save(event) {
    event.preventDefault();
    perform(async () => {
      const item = await api.post('/saved/searches', { ...form, field_of_study: form.field_of_study || null });
      setSearches(items => [item, ...items]); setForm(empty); setNotice('Search saved.');
    });
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
  function addBookmark(event) {
    event.preventDefault();
    perform(async () => {
      const item = await api.post('/saved/bookmarks', { applicant_id: Number(candidateId) });
      setBookmarks(items => items.some(old => old.id === item.id) ? items : [item, ...items]);
      setCandidateId(''); setNotice('Applicant bookmarked.');
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
        <section className="card space-y-4"><h2>Save a search</h2>
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={busy || !options} className="space-y-4 disabled:opacity-60">
              <label className="block text-sm font-medium">Search name<input className={fieldClass} name="name" placeholder="e.g. React graduates" required maxLength={100} value={form.name} onChange={update} /></label>
              <label className="block text-sm font-medium">Field of study<select className={fieldClass} name="field_of_study" value={form.field_of_study} onChange={update}><option value="">Any field</option>{options?.fields_of_study.map(field => <option key={field}>{field}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">Minimum year<select className={fieldClass} name="min_year" value={form.min_year} onChange={update}>{options?.years.map(year => <option key={year} value={year}>{year === 5 ? 'Graduated' : `Year ${year}`}</option>)}</select></label>
                <label className="block text-sm font-medium">Minimum GPA<select className={fieldClass} name="min_gpa" value={form.min_gpa} onChange={update}>{[0, 1, 1.5, 2, 2.5, 3, 3.25, 3.5, 3.75, 4].map(gpa => <option key={gpa} value={gpa}>{gpa === 0 ? 'Any GPA' : gpa.toFixed(2)}</option>)}</select></label>
              </div>
              <label className="block text-sm font-medium">Minimum internships<select className={fieldClass} name="min_internships" value={form.min_internships} onChange={update}>{[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n === 0 ? 'No minimum' : `${n}+`}</option>)}</select></label>
              <fieldset><legend className="mb-2 text-sm font-medium">Required skills</legend><div className="grid grid-cols-2 gap-2">{options?.skills.map(skill => <label key={skill} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.skills.includes(skill)} onChange={event => setForm(previous => ({ ...previous, skills: event.target.checked ? [...previous.skills, skill] : previous.skills.filter(s => s !== skill) }))} />{skill}</label>)}</div></fieldset>
              <button className="btn-primary w-full">{busy ? 'Working…' : 'Save search'}</button>
            </fieldset>
          </form>
        </section>
        <section className="card space-y-4"><h2>Saved searches <span className="text-ink-muted">({searches.length})</span></h2>
          {searches.length === 0 ? <p className="text-sm text-ink-muted">No saved searches yet. Save your first set of filters above.</p> : <ul className="space-y-3">{searches.map(item => <li key={item.id} className="rounded-lg border border-line p-4">
            <h3 className="font-semibold break-words">{item.name}</h3><p className="mt-1 text-sm text-ink-soft">{item.field_of_study || 'Any field'} · {item.min_year === 5 ? 'Graduated' : `Year ${item.min_year}+`} · GPA {item.min_gpa}+ · {item.min_internships}+ internships</p>
            <p className="mt-1 text-xs text-ink-muted">{item.skills.join(', ') || 'Any skills'}</p>
            <div className="mt-3 flex gap-2"><button className="btn-primary" disabled={busy} onClick={() => run(item)}>Run search</button><button className="btn-secondary" disabled={busy} onClick={() => removeSearch(item)}>Delete</button></div>
          </li>)}</ul>}
        </section>
      </div>
      <section className="card space-y-4"><h2>Bookmarked applicants <span className="text-ink-muted">({bookmarks.length})</span></h2>
        <form onSubmit={addBookmark} className="space-y-2"><label className="block text-sm font-medium">Choose an applicant<select className={fieldClass} required value={candidateId} onChange={event => setCandidateId(event.target.value)} disabled={busy}><option value="">Select an applicant</option>{candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label><button className="btn-secondary" disabled={busy || !candidateId}>Bookmark applicant</button></form>
        {bookmarks.length === 0 ? <p className="text-sm text-ink-muted">No bookmarks yet. Save an applicant here or from their profile.</p> : <ul className="space-y-3">{bookmarks.map(item => <li key={item.id} className="rounded-lg border border-line p-4">
          <Link className="font-semibold text-brand-700 hover:underline" to={`/applicants/${item.applicant_id}`}>{item.name}</Link>
          <p className="mt-1 text-sm text-ink-soft">{item.field_of_study || 'Profile not completed'}{item.year ? ` · ${item.year === 5 ? 'Graduated' : `Year ${item.year}`}` : ''}</p>
          <div className="mt-3 flex gap-2"><Link className="btn-primary" to={`/applicants/${item.applicant_id}`}>Open profile</Link><button className="btn-secondary" disabled={busy} onClick={() => removeBookmark(item)}>Remove</button></div>
        </li>)}</ul>}
      </section>
    </div>
  </section>;
}
