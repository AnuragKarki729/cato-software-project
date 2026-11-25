// Responsibility 3 (optional) — Anurag Karki (6838852): the applicant's video feed.
// Data from GET /api/feed/explore, five candidates at a time. UI from Figma "P11 · Video feed".
//
// The same feed the recruiter browses on Explore (recruiter/ExploreCandidates.jsx), read as an
// applicant: the server leaves you out of your own feed, and nothing here saves, invites or
// scores anybody. It is the plainer thing an applicant wants — how other people present
// themselves — so it reuses Explore's layout and its styles rather than inventing a second one.
//
// Two axes, through useGridPager:
//   up and down     — the next applicant, starting on their elevator pitch
//   left and right  — this applicant's videos, the pitch first, then their resume as the last
//                     step. Only the middle moves; the panel beside it describes the person.
//
// The page itself never scrolls: it is the height of the window, and the panel beside the
// video scrolls on its own so the video never moves.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Briefcase, Building2, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, Compass, FileText, GraduationCap, Maximize2, Play, Star } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import useReveal from '../../components/useReveal.jsx';
import { useGridPager, useSmallScreen, useTouchScreen } from '../../components/useVerticalPager.jsx';
import ResumeViewer from '../../components/ui/ResumeViewer.jsx';
import { fileSize, gpaLabel, yearLabel } from '../../utils/format.js';

const PAGE = 5;
const PREFETCH_WITHIN = 2;

// One fact tile. Its own component because each tile remembers its own tap, and a static card
// expands to show a value too long for it — a long university or field of study.
function Fact({ icon: Icon, label, value }) {
  const reveal = useReveal('ex-fact');
  return (
    <div {...reveal}>
      <span><Icon aria-hidden="true" />{label}</span>
      <strong title={String(value)}>{value}</strong>
    </div>
  );
}

// The sliver either side of the video: a blurred, clipped piece of the clip that way, with the
// chevron riding on top. The whole thing is one button. With nothing that way it keeps its
// place and goes invisible, so the video never shifts.
function Peek({ side, video, doc, label, onClick }) {
  if (!video && !doc) return <span className="ex-peek is-off" aria-hidden="true" />;
  const Chevron = side === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button type="button" className={`ex-peek ex-peek--${side}`} onClick={onClick} aria-label={label}>
      {video
        ? <video className="ex-peek__film" src={`${video.url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" />
        : <span className="ex-peek__film ex-peek__doc" aria-hidden="true"><FileText /></span>}
      <span className="ex-peek__chevron"><Chevron aria-hidden="true" /></span>
    </button>
  );
}

// The last step sideways: the resume, large. The preview is a real PDF, so the click cannot go
// on it — an iframe swallows every event — and a transparent button covers it instead.
function ResumeCard({ url, name, size, onOpen }) {
  return (
    <div className="ex-resume">
      <iframe className="ex-resume__page" src={`${url}#toolbar=0&navpanes=0&view=FitH`}
        title={name || 'Resume'} tabIndex={-1} />
      <button type="button" className="ex-resume__open" onClick={onOpen}
        aria-label={`Open ${name || 'the resume'} full size`}>
        <span className="ex-resume__name"><FileText aria-hidden="true" />{name || 'Resume.pdf'}</span>
        <span className="ex-resume__hint"><Maximize2 aria-hidden="true" />
          {size ? `PDF · ${fileSize(size)} · tap to open full size` : 'Tap to open full size'}
        </span>
      </button>
    </div>
  );
}

export default function VideoFeed() {
  const small = useSmallScreen();
  const touch = useTouchScreen();

  const [page, setPage] = useState(null);
  const [row, setRow] = useState(0);       // which applicant
  const [column, setColumn] = useState(0); // which of their videos, then the resume
  const [error, setError] = useState('');
  // What the element is actually doing. There is no separate "the details are up" flag: on a
  // phone the details are up exactly when the clip is not running, which is one fact, not two.
  const [playing, setPlaying] = useState(false);
  const [viewing, setViewing] = useState(false);
  const player = useRef(null);
  const loadingMore = useRef(false);

  const people = page?.results ?? [];
  const current = people[row];
  const videos = current?.videos ?? [];
  const total = page?.total ?? 0;
  const loading = !page;

  // The resume is one more step to the right, after the last video. Nothing follows it.
  const hasResume = !!current?.resume_url;
  const slots = videos.length + (hasResume ? 1 : 0);
  const onResume = hasResume && column >= videos.length;
  // Beside the resume it is always the elevator pitch that stays on screen, whichever video you
  // arrived from: the pitch is the one everybody has. The server puts it first.
  const pitch = videos[0];
  const clip = onResume ? pitch : videos[column];
  // Sideways is a loop, so either neighbour can be a video or the resume. Both are worked out
  // with the same wrap the pager uses, which keeps the slivers honest about what comes next.
  const isResumeSlot = (at) => hasResume && at >= videos.length;
  const prevAt = slots > 1 ? (column - 1 + slots) % slots : -1;
  const nextAt = slots > 1 ? (column + 1) % slots : -1;
  const slotName = (at) => (isResumeSlot(at) ? `${current.name}'s resume` : videos[at]?.title || 'video');

  useEffect(() => {
    let active = true;
    api.get(`/feed/explore?offset=0&limit=${PAGE}`)
      .then((first) => {
        if (!active) return;
        setPage(first);
        setRow(0);
        setColumn(0);
        setPlaying(false);
        setError('');
      })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  // Scroll-based paging: the next five arrive before the end comes into view.
  useEffect(() => {
    if (loading || loadingMore.current) return;
    if (people.length >= total) return;
    if (row < people.length - 1 - PREFETCH_WITHIN) return;
    loadingMore.current = true;
    api.get(`/feed/explore?offset=${people.length}&limit=${PAGE}`)
      .then((next) => setPage((now) => ({ ...next, results: [...now.results, ...next.results] })))
      .catch((err) => setError(err.message))
      .finally(() => { loadingMore.current = false; });
  }, [row, loading, people.length, total]);

  // A new applicant always starts on their elevator pitch.
  const goRow = useCallback((next) => { setRow(next); setColumn(0); setPlaying(false); }, []);
  const goColumn = useCallback((next) => { setColumn(next); setPlaying(false); }, []);
  const pager = useGridPager({
    row, rowCount: people.length, column, columnCount: slots,
    onRow: goRow, onColumn: goColumn, enabled: !!current && !viewing,
  });

  // Every move to a different clip starts it from the top. Nothing plays by itself: a browser
  // will not start sound until the page has been tapped, so an autoplaying clip could only ever
  // have been a silent one. The tap is the permission, and it plays with its sound.
  useEffect(() => {
    const element = player.current;
    if (element) element.currentTime = 0;
  }, [row, clip?.id]);

  function tapVideo() {
    const element = player.current;
    if (!element) return;
    // On a desktop the clip has its own controls; beside the resume it is a thumbnail without
    // them, so there a click works it on a desktop too.
    if (!touch && !onResume) return;
    if (element.paused) element.play().catch(() => {});
    else element.pause();
  }

  const facts = current ? [
    { icon: GraduationCap, label: 'Field of study', value: current.field_of_study || '—' },
    { icon: Calendar, label: 'Year of study', value: yearLabel(current.year) },
    { icon: Star, label: 'GPA', value: current.gpa == null ? '—' : `${gpaLabel(current.gpa)} / 4.00` },
    { icon: Briefcase, label: 'Internships', value: current.internships ?? '—' },
  ] : [];

  // Everything about the applicant, and nothing about which clip is playing: this panel does
  // not move when the clip does.
  const details = current && (
    <>
      <div className="ex-who">
        <h2 className="ui-h3">{current.name}</h2>
        {current.university && (
          <p className="ui-text-soft ex-uni"><Building2 aria-hidden="true" />{current.university}</p>
        )}
      </div>

      <div className="ex-facts">
        {facts.map((fact) => <Fact key={fact.label} {...fact} />)}
      </div>
    </>
  );

  return (
    <div className="ui-app ex-app">
      <AppHeader />
      <main className="ex-main-col">
        <div className="ex-top">
          <div className="ex-top__row">
            <h1 className="ui-h4">Video feed</h1>
            <p className="ui-text-soft ex-hint" aria-live="polite">
              {loading ? 'Loading pitches…' : `${total} applicant${total === 1 ? '' : 's'} with a pitch`}
              {!loading && current && ` · showing ${row + 1}`}
            </p>
          </div>
        </div>

        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

        {!current && !loading && !error && (
          <section className="ui-card ui-empty">
            <span className="ui-empty__icon"><Compass aria-hidden="true" /></span>
            <h2 className="ui-h5">No pitches yet</h2>
            <p className="ui-text-soft">Pitch videos show up here as other applicants upload them.</p>
          </section>
        )}

        {loading && <div className="ex-stage"><span className="ui-skeleton ex-viewport" /></div>}

        {current && (
          <div className="ex-stage">
            <div className="ex-viewport">
              <div className={`ex-row${onResume ? ' is-resume' : ''}`} {...pager.handlers}>
                {/* All four chevrons hug the video: up and down above and below it, left and
                    right on the slivers beside it, none of them over the picture. */}
                <div className="ex-column">
                  <button type="button" className={`ex-nav${pager.hasAbove ? '' : ' is-off'}`} onClick={() => pager.goRow(-1)}
                    aria-label="Previous applicant" disabled={!pager.hasAbove} aria-hidden={!pager.hasAbove}
                    tabIndex={pager.hasAbove ? 0 : -1}>
                    <ChevronUp aria-hidden="true" />
                  </button>

                  <div className="ex-frame">
                    <Peek side="prev"
                      video={prevAt >= 0 && !isResumeSlot(prevAt) ? videos[prevAt] : null}
                      doc={prevAt >= 0 && isResumeSlot(prevAt)}
                      label={prevAt >= 0 ? `Back to ${slotName(prevAt)}` : 'Nothing before this'}
                      onClick={() => pager.goColumn(-1)} />

                    <div className="ex-centre">
                      {clip && (
                        <div className="ex-clip">
                          <div className="ex-video pager-slide" key={`${current.applicant_id}-${clip.id}`} data-direction={pager.slide}>
                            <video ref={player} src={clip.url} playsInline
                              controls={!touch && !onResume} loop={touch}
                              onClick={tapVideo} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                              aria-label={`${current.name}: ${clip.title}`} />
                            {(touch || onResume) && (
                              <button type="button" className="ex-tap" onClick={tapVideo}
                                aria-label={playing ? 'Pause video' : 'Play video'}>
                                {!playing && <span className="ex-tap__icon"><Play fill="currentColor" strokeWidth={0} /></span>}
                              </button>
                            )}
                            <span className="ex-video__title">{clip.title}</span>
                            {slots > 1 && (
                              <span className="ex-dots" aria-label={`${column + 1} of ${slots}`}>
                                {videos.map((item, at) => <i key={item.id} className={!onResume && at === column ? 'is-on' : undefined} />)}
                                {hasResume && <i className={`ex-dots__doc${onResume ? ' is-on' : ''}`} />}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {!clip && !onResume && (
                        <div className="ex-clip"><p className="ex-video__none">No videos</p></div>
                      )}

                      {onResume && (
                        <ResumeCard url={current.resume_url} name={current.resume_name}
                          size={current.resume_size} onOpen={() => setViewing(true)} />
                      )}
                    </div>

                    <Peek side="next"
                      video={nextAt >= 0 && !isResumeSlot(nextAt) ? videos[nextAt] : null}
                      doc={nextAt >= 0 && isResumeSlot(nextAt)}
                      label={nextAt >= 0 ? `On to ${slotName(nextAt)}` : 'Nothing after this'}
                      onClick={() => pager.goColumn(1)} />
                  </div>

                  <button type="button" className={`ex-nav${pager.hasBelow ? '' : ' is-off'}`} onClick={() => pager.goRow(1)}
                    aria-label="Next applicant" disabled={!pager.hasBelow} aria-hidden={!pager.hasBelow}
                    tabIndex={pager.hasBelow ? 0 : -1}>
                    <ChevronDown aria-hidden="true" />
                  </button>
                </div>

                {/* Desktop: beside the video, and it keeps its own scrollbar rather than paging
                    the feed. Phone: over the video, once tapped. */}
                <aside className={`ex-side${small ? ' ex-side--overlay' : ''}${small && (playing || onResume) ? ' is-hidden' : ''}`}
                  onWheel={small ? undefined : (event) => event.stopPropagation()}>
                  {details}
                </aside>
              </div>
            </div>

            <p className="ex-onwards" aria-live="polite">
              {slots > 1 && `${column + 1} of ${slots} · `}
              {slots > 1 ? 'sideways loops through the videos and the resume' : 'one video, nothing sideways'}
            </p>
          </div>
        )}
      </main>
      {viewing && current && (
        <ResumeViewer url={current.resume_url} name={current.resume_name} onClose={() => setViewing(false)} />
      )}
    </div>
  );
}
