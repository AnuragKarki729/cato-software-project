// Responsibility 6 — Aye Myo Myat (6837919). Data comes from the existing models/services.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

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
    perform(async () => { await api.delete(`/saved/searches/${item.id}`); setSearches(items => items.filter(search => search.id !== item.id)); setNotice('Search deleted.'); });
  }
  function run(item) {
    perform(async () => {
      const filters = await api.post(`/saved/searches/${item.id}/run`);
      navigate('/find', { state: { savedSearch: filters, savedSearchName: item.name } });
    });
  }
  function removeBookmark(item) {
    perform(async () => { await api.delete(`/saved/bookmarks/${item.id}`); setBookmarks(items => items.filter(bookmark => bookmark.id !== item.id)); setNotice('Bookmark removed.'); });
  }
  function invite(item) {
    perform(async () => {
      try { await api.post('/invitations', { applicant_id: item.applicant_id }); }
      catch (err) { if (err.status === 501) throw new Error('Invitations are not available yet. Please try again later.'); throw err; }
      setBookmarks(items => items.map(bookmark => bookmark.id === item.id ? { ...bookmark, invited: true } : bookmark));
      setNotice(`Invitation sent to ${item.name}.`);
    });
  }
  if (loading) return <p role="status" className="text-sm text-ink-muted">Loading your saved items…</p>;
  return <section>
    <h1 className="text-[26px] leading-8">Saved</h1>
    <p className="mt-1 text-[14px] leading-5 text-ink-soft">Run a saved search again in one click, or come back to candidates you bookmarked.</p>
    {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-brand-700">{notice}</p>}
    <section className="mt-6" aria-label="Saved searches">
      <h2 className="text-[18px] font-semibold">Saved searches ({searches.length})</h2>
      {searches.length === 0 ? <p className="mt-3 rounded-lg border border-line bg-surface p-5 text-sm text-ink-muted">No saved searches yet. Use Save search on Find candidates to save your filters.</p> :
      <ul className="mt-3 space-y-2.5">{searches.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-nowrap">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600"><Icon name="sliders" className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><h3 className="text-[13px] font-semibold break-words">{item.name}</h3><p className="mt-1 text-xs leading-4 text-ink-soft">{searchSummary(item)}</p></div>
        <div className="flex w-full items-center justify-end gap-3 pl-12 text-xs sm:w-auto sm:pl-0">
          <span className="text-[10px] whitespace-nowrap text-ink-muted">{item.match_count} {item.match_count === 1 ? 'match' : 'matches'}</span>
          <button className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-300 bg-surface px-2.5 text-xs whitespace-nowrap shadow-xs disabled:opacity-50" disabled={busy} onClick={() => run(item)}><Icon name="search" className="h-3.5 w-3.5" />Run search</button>
          <button type="button" aria-label={`Delete saved search ${item.name}`} className="p-2 text-ink-soft hover:text-red-600 disabled:opacity-50" disabled={busy} onClick={() => removeSearch(item)}><Icon name="trash" className="h-4 w-4" /></button>
        </div>
      </li>)}</ul>}
    </section>
    <section className="mt-5" aria-label="Bookmarked candidates">
      <h2 className="text-[18px] font-semibold">Bookmarked candidates ({bookmarks.length})</h2>
      {bookmarks.length === 0 ? <p className="mt-3 rounded-lg border border-line bg-surface p-5 text-sm text-ink-muted">No bookmarks yet. Use Bookmark applicant on a candidate profile.</p> :
      <ul className="mt-3 space-y-2.5">{bookmarks.map(item => <li key={item.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-xs lg:flex-nowrap">
        <PitchPreview item={item} />
        <div className="min-w-[150px] flex-1"><Link className="text-[16px] font-semibold hover:text-brand-700" to={`/applicants/${item.applicant_id}`}>{item.name}</Link>
          <p className="mt-1.5 text-xs leading-5 text-ink-soft">{item.field_of_study || 'Profile not completed'}{item.year ? ` · ${item.year === 5 ? 'Graduated' : `Year ${item.year}`}` : ''}{item.gpa != null ? ` · GPA ${item.gpa.toFixed(2)}` : ''}{item.internships != null ? ` · ${item.internships} ${item.internships === 1 ? 'internship' : 'internships'}` : ''}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">{item.skills.map(skill => <span key={skill} className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] leading-3 ${item.matched_skills.includes(skill) ? 'border-emerald-200 bg-brand-50 text-brand-700' : 'border-line bg-slate-100 text-ink-soft'}`}>{item.matched_skills.includes(skill) && <Icon name="check" className="h-3 w-3" />}{skill}</span>)}{item.required_skills_count > 0 && <span className="ml-1 text-[10px] text-ink-muted">{item.matched_skills.length} of {item.required_skills_count} required skills</span>}</div>
          {item.meets_requirements === false && <p className="mt-1 text-[10px] text-amber-700">Does not meet your current search requirements.</p>}
        </div>
        <div className="ml-auto flex w-full items-center justify-between gap-5 sm:w-auto lg:ml-0">
          <div className="w-[136px] shrink-0"><p className="text-[10px] tracking-widest text-ink-muted">MATCH SCORE</p>{item.match_score == null ? <p className="mt-1 text-[11px] text-ink-muted">Run a search to see a score.</p> : <><p className="mt-1 text-ink-muted"><strong className="text-[26px] leading-7 text-ink">{Math.round(item.match_score)}</strong><span className="text-xs"> / 100</span></p><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(0,Math.min(100,item.match_score))}%` }} /></div></>}</div>
          <div className="flex flex-col items-end gap-1.5"><div className="flex items-center gap-2"><button type="button" aria-label={`Remove bookmark for ${item.name}`} title="Remove bookmark" className="p-1.5 text-ink-soft disabled:opacity-50" disabled={busy} onClick={() => removeBookmark(item)}><Icon name="bookmark" className="h-4 w-4" /></button><button className="inline-flex h-7 items-center gap-1 rounded-md bg-ink px-2.5 text-xs text-white disabled:opacity-50" disabled={busy || item.invited} onClick={() => invite(item)}><Icon name={item.invited ? 'check' : 'send'} className="h-3.5 w-3.5" />{item.invited ? 'Invited' : 'Invite'}</button></div><Link className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-surface px-3 text-xs" to={`/applicants/${item.applicant_id}`}>View profile</Link></div>
        </div>
      </li>)}</ul>}
    </section>
  </section>;
}

function searchSummary(item) {
  return [item.field_of_study || 'Any field', item.min_year === 5 ? 'Graduated' : `Year ${item.min_year}+`, `GPA ${item.min_gpa.toFixed(2)}+`, `${item.min_internships}+ internship${item.min_internships === 1 ? '' : 's'}`, item.skills.join(', ')].filter(Boolean).join(' · ');
}

function PitchPreview({ item }) {
  const video = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  async function toggle() {
    if (!video.current) return;
    try { if (video.current.paused) await video.current.play(); else video.current.pause(); }
    catch { setFailed(true); }
  }
  const duration = item.pitch_duration != null ? `${Math.floor(item.pitch_duration / 60)}:${String(Math.floor(item.pitch_duration % 60)).padStart(2,'0')}` : '';
  return <div className="group relative flex h-[78px] w-[136px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-slate-800 via-slate-800 to-slate-950 text-white">
    {item.pitch_url && !failed ? <>
      <video ref={video} aria-label={`${item.name} pitch video`} src={item.pitch_url} playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      <button type="button" aria-label={`${playing ? 'Pause' : 'Play'} pitch for ${item.name}`} onClick={toggle} className={`absolute inset-0 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-brand-500 ${playing ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : ''}`}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-ink">{playing ? <span className="text-[12px] font-semibold">Ⅱ</span> : <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-ink" />}</span></button>
      {duration && <span className="pointer-events-none absolute right-1 bottom-1 rounded bg-slate-950/80 px-1 text-[8px]">{duration}</span>}
    </> : <><span className="text-2xl font-semibold text-slate-600">{item.name.split(/\s+/).slice(0,2).map(word => word[0]).join('')}</span><span className="absolute right-1 bottom-1 rounded bg-slate-950/80 px-1 text-[8px] text-slate-200">{failed ? 'Preview unavailable' : 'No pitch yet'}</span></>}
    <span className="pointer-events-none absolute top-2 left-2 rounded-sm bg-brand-500 px-1 py-0.5 text-[9px] leading-3 text-ink">Saved</span>
  </div>;
}
