// Responsibility 3 — Anurag Karki (6838852): Explore candidates.
//
// The recruiter's video feed. Browsing rather than searching: every applicant who has an
// elevator pitch, with no filters at all. Showing everyone at once would be unkind to the
// server, so the page asks for five candidates at a time (GET /api/feed/explore) and fetches
// the next five as the end comes into view. The row of fields of study along the top narrows
// it, the way a row of genres does.
//
// Two axes, through useGridPager:
//   up and down     — the next candidate's elevator pitch
//   left and right  — this candidate's videos, the pitch first, and then their resume as the
//                     last step. Only the middle moves; the panel beside it describes the
//                     candidate, not the clip.
// Either side of the video sits a faint, blurred sliver of the clip that way, with the
// chevron on top of it. The sliver is the button, so clicking the blur moves too.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Briefcase, Building2, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, Compass, FileText, GraduationCap, Maximize2, Play, Send, Star } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import useCandidateActions from '../../components/useCandidateActions.jsx';
import useReveal from '../../components/useReveal.jsx';
import { useGridPager, useSmallScreen, useTouchScreen } from '../../components/useVerticalPager.jsx';
import Carousel from '../../components/ui/Carousel.jsx';
import ResumeViewer from '../../components/ui/ResumeViewer.jsx';
import { AboutCard } from '../../components/ProfileCards.jsx';
import { Button, IconButton, Tag } from '../../components/ui/primitives.jsx';
import { fileSize, gpaLabel, yearLabel } from '../../utils/format.js';

// One fact tile. Its own component because each tile remembers its own tap, and a static
// card expands to show a value too long for it — a long university or field of study.
function Fact({ icon: Icon, label, value }) {
  const reveal = useReveal('ex-fact');
  return (
    <div {...reveal}>
      <span><Icon aria-hidden="true" />{label}</span>
      <strong title={String(value)}>{value}</strong>
    </div>
  );
}

/**
 * The sliver either side of the video: a blurred, faint, clipped piece of the clip that way,
 * with the chevron riding on top. The whole thing is one button, so a click anywhere on the
 * blur does what the chevron does. With nothing that way it keeps its place and goes
 * invisible, so the video never shifts.
 */
function Peek({ side, video, doc, label, onClick }) {
  if (!video && !doc) return <span className="ex-peek is-off" aria-hidden="true" />;
  const Chevron = side === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button type="button" className={`ex-peek ex-peek--${side}`} onClick={onClick} aria-label={label}>
      {video
        // Muted, never played, and only ever a frame of it: `#t=0.1` asks for one.
        ? <video className="ex-peek__film" src={`${video.url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" />
        : <span className="ex-peek__film ex-peek__doc" aria-hidden="true"><FileText /></span>}
      <span className="ex-peek__chevron"><Chevron aria-hidden="true" /></span>
    </button>
  );
}

/**
 * The last step sideways: the resume, large. The preview is a real PDF, so the click cannot
 * go on it — an iframe swallows every event — and a transparent button covers it instead.
 */
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

const PAGE = 5;
const PREFETCH_WITHIN = 2;
const ALL = '';  // the "All fields" tab
// Skills per page in the panel. A layout choice, not the server's cap: a profile holds at
// most ten today (options_service.MAX_SKILLS), so there is normally one page and nothing to
// move through. If that cap is ever raised these stay in pages of ten.
const SKILL_BATCH = 10;

export default function ExploreCandidates() {
  const actions = useCandidateActions();
  const small = useSmallScreen();
  const touch = useTouchScreen();

  const [fields, setFields] = useState([]);
  const [field, setField] = useState(ALL);
  const [page, setPage] = useState(null);
  const [row, setRow] = useState(0);       // which candidate
  const [column, setColumn] = useState(0); // which of their videos, then the resume
  const [error, setError] = useState('');
  // What the element is actually doing. There is no separate "the details are up" flag: on a
  // phone the details are up exactly when the clip is not running, which is one fact, not two.
  const [playing, setPlaying] = useState(false);
  const [viewing, setViewing] = useState(false);
  const player = useRef(null);
  const loadingMore = useRef(false);

  const candidates = page?.results ?? [];
  const current = candidates[row];
  const videos = current?.videos ?? [];
  const total = page?.total ?? 0;
  // A load is in flight whenever the page on screen is not the field that is selected. Read
  // from the data rather than kept in its own state, so switching tabs cannot leave a
  // spinner behind, and the candidate on screen stays up until the new one is ready.
  const loading = !page || (page.field_of_study || ALL) !== field;

  // After the last video: the About card (the same one the candidate profile shows, standouts
  // and all), then the resume if there is one. Nothing follows: the whole profile has its own
  // button, so the end of the row is the end of the row.
  const hasResume = !!current?.resume_url;
  const aboutAt = videos.length;
  const resumeAt = aboutAt + 1;
  const slots = videos.length + 1 + (hasResume ? 1 : 0);
  const onAbout = !!current && column === aboutAt;
  const onResume = hasResume && column === resumeAt;
  // About and the resume are both "sheets": the pitch shrinks into the corner beside them.
  const onSheet = onAbout || onResume;
  // Beside the resume it is always the elevator pitch that stays on screen, whichever video
  // you arrived from: the pitch is the one every candidate has and the one a recruiter wants
  // next to a resume. The server puts it first. A candidate with no video at all — which the
  // explore feed does not currently serve, since it asks for a pitch — gets the resume alone.
  const pitch = videos[0];
  const clip = onSheet ? pitch : videos[column];
  // Sideways is a loop, so either neighbour can be a video or the resume. Both are worked out
  // with the same wrap the pager uses, which is what keeps the slivers honest about what the
  // chevron beside them will actually show.
  const isSheetSlot = (at) => at >= videos.length;
  const isResumeSlot = (at) => hasResume && at === resumeAt;
  const prevAt = slots > 1 ? (column - 1 + slots) % slots : -1;
  const nextAt = slots > 1 ? (column + 1) % slots : -1;
  const slotName = (at) => (isResumeSlot(at) ? `${current.name}'s resume`
    : at === aboutAt ? `About ${current.name}` : videos[at]?.title || 'video');

  // The tabs: only fields that have a candidate, biggest first.
  useEffect(() => {
    let active = true;
    api.get('/feed/fields')
      .then((list) => { if (active) setFields(list); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const query = field ? `&field_of_study=${encodeURIComponent(field)}` : '';
  useEffect(() => {
    let active = true;
    api.get(`/feed/explore?offset=0&limit=${PAGE}${query}`)
      .then((first) => {
        if (!active) return;
        // The new page and the position in it land together, so the card never shows one
        // candidate's video against another's details.
        setPage(first);
        setRow(0);
        setColumn(0);
        setPlaying(false);
        setError('');
      })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [query]);

  // Scroll-based paging: the next five arrive before the recruiter reaches the end.
  useEffect(() => {
    if (loading || loadingMore.current) return;
    if (candidates.length >= total) return;
    if (row < candidates.length - 1 - PREFETCH_WITHIN) return;
    loadingMore.current = true;
    api.get(`/feed/explore?offset=${candidates.length}&limit=${PAGE}${query}`)
      .then((next) => setPage((now) => ({ ...next, results: [...now.results, ...next.results] })))
      .catch((err) => setError(err.message))
      .finally(() => { loadingMore.current = false; });
  }, [row, loading, candidates.length, total, query]);

  // A new candidate always starts on their elevator pitch, playing.
  const goRow = useCallback((next) => { setRow(next); setColumn(0); setPlaying(false); }, []);
  const goColumn = useCallback((next) => { setColumn(next); setPlaying(false); }, []);
  const pager = useGridPager({
    row, rowCount: candidates.length, column, columnCount: slots,
    onRow: goRow, onColumn: goColumn, enabled: !!current && !viewing,
  });

  // Every move to a different clip starts it from the top. Nothing plays by itself: a browser
  // will not start sound until the page has been tapped, so an autoplaying clip could only
  // ever have been a silent one. Waiting for the tap means the tap is the permission, and the
  // clip plays with its sound the first time as well as every time after.
  useEffect(() => {
    const element = player.current;
    if (!element) return;
    element.currentTime = 0;
  }, [row, clip?.id]);

  function tapVideo() {
    const element = player.current;
    if (!element) return;
    // On a desktop the clip in the feed has its own controls; beside the resume it is a
    // thumbnail without them, so there a click works it on a desktop too.
    if (!touch && !onSheet) return;
    if (element.paused) element.play().catch(() => {});
    else element.pause();
  }

  const tabs = useMemo(
    () => [{ field_of_study: ALL, label: 'All fields', candidates: total }, ...fields],
    [fields, total],
  );

  // The profile is told where the recruiter came from and which card they were on, so its
  // Back goes to the feed and its row opens on the same video. The card is named rather than
  // numbered: the two pages read a candidate's videos from different endpoints, so an index
  // would not mean the same thing on both.
  const startKey = onResume ? 'resume' : onAbout ? 'about' : clip ? `v${clip.id}` : '';
  const profileLink = current
    ? `/role/${current.applicant_id}/profile?from=explore${startKey ? `&start=${startKey}` : ''}`
    : '#';
  const invited = current ? actions.isInvited(current.applicant_id) : false;
  const bookmarked = current ? actions.isBookmarked(current.applicant_id) : false;
  const facts = current ? [
    { icon: GraduationCap, label: 'Field of study', value: current.field_of_study || '—' },
    { icon: Calendar, label: 'Year of study', value: yearLabel(current.year) },
    { icon: Star, label: 'GPA', value: current.gpa == null ? '—' : `${gpaLabel(current.gpa)} / 4.00` },
    { icon: Briefcase, label: 'Internships', value: current.internships ?? '—' },
  ] : [];

  // Everything about the candidate, and nothing about which clip is playing: this panel does
  // not move when the clip does. Beside the resume it compacts, which is the only time it
  // changes shape.
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

      {current.skills.length > 0 && (
        <div className="ex-block">
          <p className="ui-score__label">Skills ({current.skills.length})</p>
          <Carousel label={`${current.name}'s skills`} className="ex-skills" batch={SKILL_BATCH}>
            {current.skills.map((skill) => <Tag key={skill}>{skill}</Tag>)}
          </Carousel>
        </div>
      )}

      {/* One row: the whole profile, saving the candidate, and inviting them. */}
      <div className="ex-actions">
        {/* The name is read out but not shown: the panel beside it already says whose
            profile this is, and a links list read on its own would not. */}
        <Button variant="primary" size="md" icon={Compass} to={profileLink}
          aria-label={`Full profile: ${current.name}`}>
          Full Profile
        </Button>
        <IconButton icon={Bookmark} label={bookmarked ? 'Remove from saved' : 'Save candidate'}
          className={bookmarked ? 'is-on' : undefined} aria-pressed={bookmarked}
          onClick={() => actions.toggleBookmark(current)} />
        {invited
          ? <Button variant="secondary" size="md" icon={Check} disabled>Invited</Button>
          : <Button variant="accent" size="md" icon={Send} onClick={() => actions.invite(current)}>{actions.inviteLabel(current.applicant_id)}</Button>}
      </div>
    </>
  );

  return (
    <div className="ui-app ex-app">
      <AppHeader />
      <main className="ex-main-col">
        <div className="ex-top">
          <div className="ex-top__row">
            <h1 className="ui-h4">Explore candidates</h1>
            <p className="ui-text-soft ex-hint" aria-live="polite">
              {loading ? 'Loading candidates…' : `${total} candidate${total === 1 ? '' : 's'} with a pitch`}
              {!loading && current && ` · showing ${row + 1}`}
            </p>
          </div>

          {/* The genre row: one tab per field of study that has candidates. */}
          <Carousel label="Fields of study" className="ex-tabs">
            {tabs.map((tab) => (
              <button key={tab.field_of_study || 'all'} type="button"
                className={`ui-chip ex-tab${field === tab.field_of_study ? ' is-on' : ''}`}
                aria-pressed={field === tab.field_of_study}
                onClick={() => setField(tab.field_of_study)}>
                {tab.label || tab.field_of_study}
                <span className="ex-tab__count">{tab.candidates}</span>
              </button>
            ))}
          </Carousel>
        </div>

        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

        {!current && !loading && !error && (
          <section className="ui-card ui-empty">
            <span className="ui-empty__icon"><Compass aria-hidden="true" /></span>
            <h2 className="ui-h5">Nobody to explore here yet</h2>
            <p className="ui-text-soft">
              {field ? `No applicant studying ${field} has uploaded an elevator pitch.` : 'No applicant has uploaded an elevator pitch yet.'}
            </p>
            {field && <Button variant="secondary" size="md" onClick={() => setField(ALL)}>All fields</Button>}
          </section>
        )}

        {loading && !current && <div className="ex-stage"><span className="ui-skeleton ex-viewport" /></div>}

        {current && (
          <div className="ex-stage">
            <div className="ex-viewport">
              <div className={`ex-row${onSheet ? ' is-resume' : ''}`} {...pager.handlers}>
                {/* All four chevrons hug the video: up and down above and below it, left and
                    right on the slivers beside it, none of them over the picture. */}
                <div className="ex-column">
                  <button type="button" className={`ex-nav${pager.hasAbove ? '' : ' is-off'}`} onClick={() => pager.goRow(-1)}
                    aria-label="Previous candidate" disabled={!pager.hasAbove} aria-hidden={!pager.hasAbove}
                    tabIndex={pager.hasAbove ? 0 : -1}>
                    <ChevronUp aria-hidden="true" />
                  </button>

                  <div className="ex-frame">
                    <Peek side="prev"
                      video={prevAt >= 0 && !isSheetSlot(prevAt) ? videos[prevAt] : null}
                      doc={prevAt >= 0 && isSheetSlot(prevAt)}
                      label={prevAt >= 0 ? `Back to ${slotName(prevAt)}` : 'Nothing before this'}
                      onClick={() => pager.goColumn(-1)} />

                    <div className="ex-centre">
                      {/* Only this box moves on a sideways swipe. Beside the resume it is the
                          elevator pitch, shrunk into the corner. */}
                      {clip && (
                        <div className="ex-clip">
                          <div className="ex-video pager-slide" key={`${current.applicant_id}-${clip.id}`} data-direction={pager.slide}>
                            <video ref={player} src={clip.url} playsInline
                              controls={!touch && !onSheet} loop={touch}
                              onClick={tapVideo} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                              aria-label={`${current.name}: ${clip.title}`} />
                            {(touch || onSheet) && (
                              // The icon follows the element, not the details flag: beside the
                              // resume the clip is stopped without the details being up.
                              <button type="button" className="ex-tap" onClick={tapVideo}
                                aria-label={playing ? 'Pause video' : 'Play video'}>
                                {!playing && <span className="ex-tap__icon"><Play fill="currentColor" strokeWidth={0} /></span>}
                              </button>
                            )}
                            <span className="ex-video__title">{clip.title}</span>
                            {slots > 1 && (
                              <span className="ex-dots" aria-label={`${column + 1} of ${slots}`}>
                                {videos.map((item, at) => <i key={item.id} className={!onSheet && at === column ? 'is-on' : undefined} />)}
                                <i className={`ex-dots__doc${onAbout ? ' is-on' : ''}`} />
                                {hasResume && <i className={`ex-dots__doc${onResume ? ' is-on' : ''}`} />}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {!clip && !onSheet && (
                        <div className="ex-clip"><p className="ex-video__none">No videos</p></div>
                      )}

                      {onAbout && (
                        <div className="ex-about"><AboutCard profile={current} /></div>
                      )}

                      {onResume && (
                        <ResumeCard url={current.resume_url} name={current.resume_name}
                          size={current.resume_size} onOpen={() => setViewing(true)} />
                      )}
                    </div>

                    <Peek side="next"
                      video={nextAt >= 0 && !isSheetSlot(nextAt) ? videos[nextAt] : null}
                      doc={nextAt >= 0 && isSheetSlot(nextAt)}
                      label={nextAt >= 0 ? `On to ${slotName(nextAt)}` : 'Nothing after this'}
                      onClick={() => pager.goColumn(1)} />
                  </div>

                  <button type="button" className={`ex-nav${pager.hasBelow ? '' : ' is-off'}`} onClick={() => pager.goRow(1)}
                    aria-label="Next candidate" disabled={!pager.hasBelow} aria-hidden={!pager.hasBelow}
                    tabIndex={pager.hasBelow ? 0 : -1}>
                    <ChevronDown aria-hidden="true" />
                  </button>
                </div>

                {/* Desktop: beside the video, and it keeps its own scrollbar rather than
                    paging the feed. Phone: over the video, once tapped. */}
                <aside className={`ex-side${small ? ' ex-side--overlay' : ''}${small && (playing || onSheet) ? ' is-hidden' : ''}`}
                  onWheel={small ? undefined : (event) => event.stopPropagation()}>
                  {details}
                </aside>
              </div>
            </div>

            <p className="ex-onwards" aria-live="polite">
              {slots > 1 && `${column + 1} of ${slots} · `}
              {slots > 1 ? `sideways loops through the videos, About and the resume` : 'one video, nothing sideways'}
            </p>
          </div>
        )}
      </main>
      {viewing && current && (
        // Saving and inviting stay to hand while the resume is open: deciding about a
        // candidate is exactly what reading it is for, and closing first to act is a step
        // for nothing.
        <ResumeViewer url={current.resume_url} name={current.resume_name} onClose={() => setViewing(false)}
          actions={
            <>
              <IconButton icon={Bookmark} label={bookmarked ? 'Remove from saved' : 'Save candidate'}
                className={bookmarked ? 'is-on' : undefined} aria-pressed={bookmarked}
                onClick={() => actions.toggleBookmark(current)} />
              {invited
                ? <Button variant="secondary" size="sm" icon={Check} disabled>Invited</Button>
                : <Button variant="accent" size="sm" icon={Send} onClick={() => actions.invite(current)}>{actions.inviteLabel(current.applicant_id)}</Button>}
            </>
          } />
      )}
      {actions.ui}
    </div>
  );
}
