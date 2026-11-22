// Responsibility 3 (optional) — Anurag Karki (6838852): the applicant's video feed.
// Data from GET /api/feed, 10 per page. UI from Figma "P11 · Video feed" (applicant view,
// next pitch) — Nusrat Begam (6638009).
//
// Applicants only. Recruiters browse pitches on Explore (recruiter/ExploreCandidates.jsx),
// which pages through every candidate and swipes sideways through their videos; this page is
// the plainer thing an applicant wants — the newest pitches from other applicants, to see how
// other people present themselves. No scores and no invitations here.
//
// The page itself never scrolls: it is the height of the window and a wheel or a swipe moves
// to the next pitch, through the same pager the video viewer and Explore use. The rails
// beside the video scroll on their own if they have to, so the video never moves.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, CircleAlert, Play } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import { useSmallScreen, useVerticalPager } from '../../components/useVerticalPager.jsx';
import Carousel from '../../components/ui/Carousel.jsx';
import { duration, gpaLabel, initials, internshipsLabel, yearLabel } from '../../utils/format.js';

const PAGE_SIZE = 10;
const PREFETCH_WITHIN = 3;  // fetch the next page once this close to the end

export default function VideoFeed() {
  const small = useSmallScreen();
  const [items, setItems] = useState([]);
  const [details, setDetails] = useState({});
  const [index, setIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const videoRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    try {
      const response = await api.get(`/feed?page=${pageRef.current}`);
      setItems((previous) => [...previous, ...response.map((item) => ({
        key: `v${item.id}`, applicant_id: item.applicant_id, name: item.name, url: item.url,
        seconds: item.duration_seconds, title: item.title, description: item.description,
      }))]);
      pageRef.current += 1;
      setHasMore(response.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoaded(true);
    }
  }, [hasMore]);

  // No "load more" in a feed: fetch the next page as the end comes into view. Also the first
  // load, because at the start the end is all there is.
  useEffect(() => {
    if (index >= items.length - 1 - PREFETCH_WITHIN) loadMore();
  }, [index, items.length, loadMore]);

  // Profile details (field, year, GPA, skills) for the pitch on screen and the next three.
  const visible = useMemo(() => items.slice(index, index + 4), [items, index]);
  useEffect(() => {
    visible.filter((item) => !details[item.applicant_id]).forEach((item) => {
      api.get(`/profiles/${item.applicant_id}`)
        .then((p) => setDetails((all) => ({ ...all, [item.applicant_id]: p })))
        .catch(() => setDetails((all) => ({ ...all, [item.applicant_id]: {} })));
    });
  }, [visible, details]);

  const current = items[index];
  const info = current ? details[current.applicant_id] || {} : {};
  const upNext = items.slice(index + 1, index + 4);

  // The wheel, the thumb, the arrow keys and the chevrons all come through one pager, so a
  // scroll on a desktop and a swipe on a phone mean the same thing here as everywhere else.
  const move = useCallback((next) => { setPlaying(false); setIndex(next); }, []);
  const pager = useVerticalPager({ index, count: items.length, onIndex: move, enabled: !!current });

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play().catch(() => {}); setPlaying(true); } else { video.pause(); setPlaying(false); }
  }, []);

  // Keyboard: Space plays and pauses. ↑ ↓ belong to the pager.
  useEffect(() => {
    function onKey(event) {
      if (event.target.closest('input, select, textarea, button, a, [role="dialog"]')) return;
      if (event.key === ' ') { event.preventDefault(); togglePlay(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  const shortcuts = [['↑ ↓', 'Previous or next pitch'], ['Space', 'Play or pause']];

  return (
    <div className="ui-app vf-app">
      <AppHeader />
      <main className="ui-main vf-main">
        <aside className="vf-side">
          <section className="ui-card">
            <h1 className="ui-h4">Your feed</h1>
            <p className="ui-text-soft">
              The newest pitches from other applicants, newest first. See how others present
              themselves, then go back and improve your own.
            </p>
            <Link to="/profile" className="ui-btn ui-btn--secondary ui-btn--md">My profile</Link>
          </section>
          <section className="ui-card">
            <h2 className="ui-h4">Keyboard</h2>
            {shortcuts.map(([key, label]) => <p className="vf-key" key={key}><kbd>{key}</kbd><span className="ui-text-soft">{label}</span></p>)}
          </section>
        </aside>

        {/* The chevrons sit above and below the video, outside the frame, and keep their place
            when there is nowhere to go so the video never shifts. */}
        <div className="vf-stage" {...pager.handlers}>
          <button type="button" className={`vf-nav${pager.hasPrevious ? '' : ' is-off'}`} onClick={() => pager.go(-1)}
            aria-label="Previous pitch" disabled={!pager.hasPrevious} aria-hidden={!pager.hasPrevious}
            tabIndex={pager.hasPrevious ? 0 : -1}>
            <ChevronUp aria-hidden="true" />
          </button>

          <div className="vf-viewport">
            {error && <p className="ui-alert ui-alert--error vf-error" role="alert"><CircleAlert />{error}</p>}
            {!current && loaded && !error && (
              <section className="ui-card ui-empty vf-card vf-card--empty">
                <p className="ui-h5">No pitches yet</p>
                <p className="ui-text-soft">Pitch videos show up here as other applicants upload them.</p>
              </section>
            )}
            {!current && !loaded && <span className="ui-skeleton vf-card" />}
            {current && (
              // Keyed on the pitch so each one mounts fresh and plays its slide-in.
              <article className="vf-card pager-slide" key={current.key} data-direction={pager.slide} aria-label={`${current.name}'s pitch`}>
                <span className="vf-card__initials" aria-hidden="true">{initials(current.name)}</span>
                {/* Nothing plays by itself: a browser will not start sound until the page has
                    been tapped, so an autoplaying pitch could only ever have been a silent one.
                    The tap is the permission, and it plays with its sound. */}
                <video ref={videoRef} src={`${current.url}#t=0.1`} playsInline preload="metadata"
                  loop={small} onClick={togglePlay}
                  onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
                  aria-label={`${current.name}'s pitch video`} />
                <span className="vf-card__shade" aria-hidden="true" />
                {!playing && <button type="button" className="ui-poster__play vf-card__play" onClick={togglePlay} aria-label="Play pitch"><Play fill="currentColor" strokeWidth={0} /></button>}
                <div className="vf-card__top">
                  <span className="lp-feed__kind">Pitch · {duration(current.seconds)}</span>
                  {/* Responsibility 1: the title the applicant picked for this video (issue #3). */}
                  {current.title && <span className="vf-card__title">{current.title}</span>}
                </div>
                <div className="vf-card__details">
                  <p className="lp-feed__name">{current.name}</p>
                  {info.field_of_study && <p className="lp-feed__meta">{info.field_of_study} · {yearLabel(info.year)} · GPA {gpaLabel(info.gpa)} · {internshipsLabel(info.internships)}</p>}
                  {/* No cap: the skills slide sideways rather than growing down the card. */}
                  {info.skills?.length > 0 && (
                    <Carousel label={`${current.name}'s skills`} className="vf-card__skills">
                      {info.skills.map((s) => <span key={s}>{s}</span>)}
                    </Carousel>
                  )}
                  {current.description && <p className="vf-card__caption">{current.description}</p>}
                </div>
              </article>
            )}
          </div>

          <button type="button" className={`vf-nav${pager.hasNext ? '' : ' is-off'}`} onClick={() => pager.go(1)}
            aria-label="Next pitch" disabled={!pager.hasNext} aria-hidden={!pager.hasNext}
            tabIndex={pager.hasNext ? 0 : -1}>
            <ChevronDown aria-hidden="true" />
          </button>

          {items.length > 0 && <p className="vf-count" aria-live="polite">{index + 1} of {items.length}{hasMore ? '+' : ''}</p>}
        </div>

        <aside className="vf-next-list" aria-label="Up next">
          <p className="ui-score__label">Up next</p>
          {upNext.map((item, i) => {
            const d = details[item.applicant_id] || {};
            return (
              <button key={item.key} type="button" className="vf-next-item" onClick={() => pager.go(i + 1)}>
                <span className="ui-poster vf-next-item__poster" aria-hidden="true">
                  <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} />
                  <span className="ui-poster__shade" /><span className="ui-poster__play"><Play fill="currentColor" strokeWidth={0} /></span>
                  <span className="ui-poster__kind">Pitch</span><span className="ui-poster__duration">{duration(item.seconds)}</span>
                </span>
                <span className="vf-next-item__text">
                  <strong>{item.name}</strong>
                  {d.field_of_study && <span className="ui-text-xs ui-text-muted">{d.field_of_study === 'Computer Science' ? 'CS' : d.field_of_study} · {yearLabel(d.year)} · GPA {gpaLabel(d.gpa)}</span>}
                </span>
              </button>
            );
          })}
          {upNext.length === 0 && current && <p className="ui-text-muted">{hasMore ? 'Loading more pitches…' : 'That’s everyone for now.'}</p>}
        </aside>
      </main>
    </div>
  );
}
