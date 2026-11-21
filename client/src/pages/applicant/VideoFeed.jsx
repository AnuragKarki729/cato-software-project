// Responsibility 3 (optional) — Anurag Karki (6838852): feed data from GET /api/feed, 10 per page.
// UI from Figma "P11 · Video feed" (recruiter view, applicant view, next pitch) — Nusrat Begam (6638009).
// Recruiters can rank the pitches for a search with the matching endpoint (Responsibility 5).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, ChevronDown, ChevronUp, CircleAlert, Play, Send } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import useCandidateActions from '../../components/useCandidateActions.jsx';
import { Button, IconButton, SelectField } from '../../components/ui/primitives.jsx';
import { SAMPLE_SEARCHES, routeMissing } from '../../data/samples.js';
import { duration, gpaLabel, initials, internshipsLabel, score, yearLabel } from '../../utils/format.js';
import { fromApi, toQuery } from '../../utils/filters.js';

const PAGE_SIZE = 10;
const NEWEST = 'newest';

const fromFeed = (item) => ({ key: `v${item.id}`, applicant_id: item.applicant_id, name: item.name, url: item.url, seconds: item.duration_seconds });
const fromMatch = (r) => ({
  key: `m${r.applicant_id}`, applicant_id: r.applicant_id, name: r.name, url: r.pitch_url, seconds: r.pitch_duration,
  score: r.match_score, details: { field_of_study: r.field_of_study, year: r.year, gpa: r.gpa, internships: r.internships, skills: r.skills },
});

export default function VideoFeed() {
  const { user } = useAuth();
  const recruiter = user.role === 'recruiter';
  const actions = useCandidateActions();
  const [mode, setMode] = useState(NEWEST);
  const [searches, setSearches] = useState([]);
  const [items, setItems] = useState([]);
  const [details, setDetails] = useState({});
  const [index, setIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const videoRef = useRef(null);

  // Newest first: Anurag's paged feed.
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || mode !== NEWEST) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const response = await api.get(`/feed?page=${pageRef.current}`);
      setItems((previous) => [...previous, ...response.map(fromFeed)]);
      pageRef.current += 1;
      setHasMore(response.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoaded(true);
    }
  }, [hasMore, mode]);

  useEffect(() => { loadMore(); }, [loadMore]);

  // Recruiters: searches to rank the feed for (saved searches, or the design's samples).
  useEffect(() => {
    if (!recruiter) return undefined;
    let active = true;
    const current = api.get('/matching/results?limit=1').then((page) => [{ id: 'current', name: 'My current search', filter: fromApi(page.filter) }]).catch(() => []);
    const saved = api.get('/saved/searches').then((list) => list.map((s) => ({ id: `s${s.id}`, name: s.name, filter: fromApi(s) })))
      .catch((err) => (routeMissing(err) ? SAMPLE_SEARCHES : []));
    Promise.all([current, saved]).then(([a, b]) => { if (active) setSearches([...a, ...b]); });
    return () => { active = false; };
  }, [recruiter]);

  async function changeMode(value) {
    setMode(value);
    setIndex(0);
    setPlaying(false);
    setItems([]);
    setError('');
    if (value === NEWEST) {
      pageRef.current = 1;
      setHasMore(true);
      setLoaded(false);
      return;
    }
    const search = searches.find((s) => s.id === value);
    setLoading(true);
    try {
      const page = await api.get(`/matching/results?limit=50&${toQuery(search.filter)}`);
      setItems(page.results.filter((r) => r.pitch_url).map(fromMatch));
      setHasMore(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  // Profile details (field, year, GPA, skills) for the pitch on screen and the next three.
  const visible = useMemo(() => items.slice(index, index + 4), [items, index]);
  useEffect(() => {
    visible.filter((item) => !item.details && !details[item.applicant_id]).forEach((item) => {
      api.get(`/profiles/${item.applicant_id}`)
        .then((p) => setDetails((all) => ({ ...all, [item.applicant_id]: p })))
        .catch(() => setDetails((all) => ({ ...all, [item.applicant_id]: {} })));
    });
  }, [visible, details]);

  const current = items[index];
  const info = current ? current.details || details[current.applicant_id] || {} : {};
  const upNext = items.slice(index + 1, index + 4);

  const go = useCallback((step) => {
    setPlaying(false);
    setIndex((i) => {
      const next = Math.max(0, Math.min(items.length - 1, i + step));
      if (next >= items.length - 3) loadMore();
      return next;
    });
  }, [items.length, loadMore]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play().catch(() => {}); setPlaying(true); } else { video.pause(); setPlaying(false); }
  }, []);

  // Keyboard: ↑ ↓ previous/next, Space play/pause, B bookmark and I invite (recruiters).
  useEffect(() => {
    function onKey(event) {
      if (event.target.closest('input, select, textarea, button, a, [role="dialog"]')) return;
      if (event.key === 'ArrowDown') { event.preventDefault(); go(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); go(-1); }
      else if (event.key === ' ') { event.preventDefault(); togglePlay(); }
      else if (recruiter && current && event.key.toLowerCase() === 'b') actions.toggleBookmark(current);
      else if (recruiter && current && event.key.toLowerCase() === 'i' && !actions.isInvited(current.applicant_id)) actions.invite(current);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, togglePlay, recruiter, current, actions]);

  const shortcuts = [['↑ ↓', 'Previous or next pitch'], ['Space', 'Play or pause'], ...(recruiter ? [['B', 'Bookmark'], ['I', 'Invite']] : [])];
  const modeOptions = recruiter ? [{ value: NEWEST, label: 'Newest first' }, ...searches.map((s) => ({ value: s.id, label: s.name }))] : [{ value: NEWEST, label: 'Newest first' }];

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main vf-main">
        <aside className="vf-side">
          <section className="ui-card">
            <h1 className="ui-h4">Your feed</h1>
            <p className="ui-text-soft">
              {recruiter ? 'Pitches ranked by match score for the search you pick. Applicants see each other’s pitches newest first, without scores.'
                : 'The newest pitches from other applicants. See how others present themselves.'}
            </p>
            <SelectField label={recruiter ? 'Ranked for' : 'Sorted by'} value={mode} onChange={changeMode} options={modeOptions} />
          </section>
          <section className="ui-card">
            <h2 className="ui-h4">Keyboard</h2>
            {shortcuts.map(([key, label]) => <p className="vf-key" key={key}><kbd>{key}</kbd><span className="ui-text-soft">{label}</span></p>)}
          </section>
        </aside>

        <div className="vf-stage">
          {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}
          {!current && loaded && !loading && !error && (
            <section className="ui-card ui-empty vf-card vf-card--empty"><p className="ui-h5">No pitches yet</p><p className="ui-text-soft">{mode === NEWEST ? 'Pitch videos show up here as applicants upload them.' : 'Nobody who matches this search has a pitch video yet.'}</p></section>
          )}
          {!current && (loading || !loaded) && <span className="ui-skeleton vf-card" />}
          {current && (
            <article className="vf-card" aria-label={`${current.name}'s pitch`}>
              <span className="vf-card__initials" aria-hidden="true">{initials(current.name)}</span>
              <video key={current.key} ref={videoRef} src={`${current.url}#t=0.1`} playsInline preload="metadata" onClick={togglePlay}
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} aria-label={`${current.name}'s pitch video`} />
              <span className="vf-card__shade" aria-hidden="true" />
              {!playing && <button type="button" className="ui-poster__play vf-card__play" onClick={togglePlay} aria-label="Play pitch"><Play fill="currentColor" strokeWidth={0} /></button>}
              <div className="vf-card__top">
                <span className="lp-feed__kind">Pitch · {duration(current.seconds)}</span>
                {recruiter && current.score !== undefined && <span className="lp-pill"><strong>{score(current.score)}</strong> match</span>}
              </div>
              <div className="vf-card__details">
                <p className="lp-feed__name">{current.name}</p>
                {info.field_of_study && <p className="lp-feed__meta">{info.field_of_study} · {yearLabel(info.year)} · GPA {gpaLabel(info.gpa)} · {internshipsLabel(info.internships)}</p>}
                {info.skills?.length > 0 && <div className="lp-feed__skills">{info.skills.slice(0, 4).map((s) => <span key={s}>{s}</span>)}</div>}
                <div className="lp-feed__actions">
                  {recruiter && (actions.isInvited(current.applicant_id)
                    ? <Button variant="secondary" size="md" icon={Check} disabled className="lp-feed__invite">Invited</Button>
                    : <Button variant="accent" size="md" icon={Send} className="lp-feed__invite" onClick={() => actions.invite(current)}>Invite</Button>)}
                  {recruiter && <IconButton icon={Bookmark} label="Bookmark candidate" size="md" variant="secondary" className={actions.isBookmarked(current.applicant_id) ? 'is-on' : undefined} onClick={() => actions.toggleBookmark(current)} />}
                  {recruiter && <Button variant="secondary" size="md" to={`/role/${current.applicant_id}/profile`}>View profile</Button>}
                </div>
              </div>
            </article>
          )}
          <div className="vf-arrows">
            <IconButton icon={ChevronUp} label="Previous pitch" size="md" variant="secondary" disabled={index === 0} onClick={() => go(-1)} />
            <IconButton icon={ChevronDown} label="Next pitch" size="md" className="vf-next" disabled={!current || (index >= items.length - 1 && !hasMore)} onClick={() => go(1)} />
          </div>
        </div>

        <aside className="vf-next-list" aria-label="Up next">
          <p className="ui-score__label">Up next</p>
          {upNext.map((item, i) => {
            const d = item.details || details[item.applicant_id] || {};
            return (
              <button key={item.key} type="button" className="vf-next-item" onClick={() => go(i + 1)}>
                <span className="ui-poster vf-next-item__poster" aria-hidden="true">
                  <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} />
                  <span className="ui-poster__shade" /><span className="ui-poster__play"><Play fill="currentColor" strokeWidth={0} /></span>
                  <span className="ui-poster__kind">Pitch</span><span className="ui-poster__duration">{duration(item.seconds)}</span>
                </span>
                <span className="vf-next-item__text">
                  <strong>{item.name}</strong>
                  {d.field_of_study && <span className="ui-text-xs ui-text-muted">{d.field_of_study === 'Computer Science' ? 'CS' : d.field_of_study} · {yearLabel(d.year)} · GPA {gpaLabel(d.gpa)}</span>}
                  {recruiter && item.score !== undefined && <span className="lp-pill"><strong>{score(item.score)}</strong> match</span>}
                </span>
              </button>
            );
          })}
          {upNext.length === 0 && current && <p className="ui-text-muted">{hasMore ? 'Loading more pitches…' : 'That’s everyone for now.'}</p>}
        </aside>
      </main>
      {recruiter && actions.ui}
      {!recruiter && <Link to="/profile" className="ui-sr-only">Back to My profile</Link>}
    </div>
  );
}
