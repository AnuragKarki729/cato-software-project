// Responsibility 5: Candidate matching and ranked results — Nusrat Begum (6638009)
// Reworked by Anurag Karki (6838852) into a one-at-a-time feed: the Figma "P8 · Ranked
// results" list became a single candidate filling the screen, since the pitch video is the
// thing a recruiter is here to watch.
//
// The page itself never scrolls. A wheel or a swipe moves to the next candidate, through
// the same pager the video viewer uses, so the gesture means the same thing everywhere.
// The filters come from Find candidates (Responsibility 4); Save search (Responsibility 6)
// and Invite (Responsibility 8) plug into the buttons.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, Compass, FileText, Info, Maximize2, Play, SearchX, Send, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import useCandidateActions from '../../components/useCandidateActions.jsx';
import { useGridPager, useSmallScreen, useTouchScreen } from '../../components/useVerticalPager.jsx';
import Carousel from '../../components/ui/Carousel.jsx';
import ResumeViewer from '../../components/ui/ResumeViewer.jsx';
import { ScoreBreakdown } from '../../components/ui/MatchScore.jsx';
import { Button, IconButton, Tag } from '../../components/ui/primitives.jsx';
import { fileSize, gpaLabel, internshipsLabel, score, yearLabel } from '../../utils/format.js';
import { carry, fromApi, fromSearch, toQuery } from '../../utils/filters.js';

const PAGE = 5;
const PREFETCH_WITHIN = 2;  // fetch the next page once this close to the end
// Skills per page in the panel, the same as Explore. A layout choice, not the server's cap:
// a profile holds at most ten today (options_service.MAX_SKILLS), so there is normally one
// page and nothing to move through. If that cap is ever raised these stay in pages of ten.
const SKILL_BATCH = 10;

// The sliver either side of the video: a blurred, clipped piece of whatever is that way, with
// the chevron riding on top. The whole thing is one button. With nothing that way it keeps its
// place and goes invisible, so the video never shifts. The same part Explore uses.
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

function filterTags(filter) {
  const tags = [filter.field_of_study || 'Any field of study'];
  if (filter.min_year > 1) tags.push(filter.min_year === 5 ? 'Graduated' : `Year ${filter.min_year}+`);
  if (filter.min_gpa > 0) tags.push(`GPA ${gpaLabel(filter.min_gpa)}+`);
  if (filter.min_internships > 0) tags.push(`${filter.min_internships}+ internship${filter.min_internships === 1 ? '' : 's'}`);
  return [...tags, ...filter.skills];
}

export default function RankedResults() {
  const [searchParams] = useSearchParams();
  // Filters from Find candidates travel in the URL; without them the saved filter is used.
  const urlFilter = fromSearch(searchParams);
  const filterQuery = urlFilter ? `&${toQuery(urlFilter)}` : '';
  const suffix = carry(searchParams);
  const actions = useCandidateActions();
  const small = useSmallScreen();
  const touch = useTouchScreen();

  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [column, setColumn] = useState(0); // which of their videos, then the resume
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noFilter, setNoFilter] = useState(false);
  // What the element is actually doing. On a phone the details are up exactly when the pitch
  // is not running, so that is one fact rather than a second flag kept alongside it.
  const [playing, setPlaying] = useState(false);
  const [viewing, setViewing] = useState(false);
  const player = useRef(null);
  const loadingMore = useRef(false);

  const results = data?.results ?? [];
  const current = results[index];
  const total = data?.total ?? 0;

  // Sideways: every video the candidate has, the pitch first, then the resume as the last
  // step. The same shape as Explore, so the gesture means the same thing on both pages.
  const videos = current?.videos ?? [];
  const hasResume = !!current?.resume_url;
  const slots = videos.length + (hasResume ? 1 : 0);
  const onResume = hasResume && column >= videos.length;
  // Beside the resume it is always the elevator pitch that stays on screen, whichever video
  // the recruiter arrived from: the pitch is the one every candidate has. The server puts it
  // first, and it is the one the match score belongs to.
  const pitch = videos[0];
  const clip = onResume ? pitch : videos[column];
  const isResumeSlot = (at) => hasResume && at >= videos.length;
  const prevAt = slots > 1 ? (column - 1 + slots) % slots : -1;
  const nextAt = slots > 1 ? (column + 1) % slots : -1;
  const slotName = (at) => (isResumeSlot(at) ? `${current.name}'s resume` : videos[at]?.title || 'video');

  // A new candidate always starts on their elevator pitch.
  const goRow = useCallback((next) => { setIndex(next); setColumn(0); setPlaying(false); }, []);
  const goColumn = useCallback((next) => { setColumn(next); setPlaying(false); }, []);
  const pager = useGridPager({
    row: index, rowCount: results.length, column, columnCount: slots,
    onRow: goRow, onColumn: goColumn, enabled: !!current && !viewing,
  });

  useEffect(() => {
    let active = true;
    api.get(`/matching/results?offset=0&limit=${PAGE}${filterQuery}`)
      // The page and the position in it land together, so the frame never shows one
      // candidate's video against another's score.
      .then((page) => { if (active) { setData(page); setIndex(0); setColumn(0); setPlaying(false); } })
      .catch((err) => { if (!active) return; if (err.status === 404) setNoFilter(true); else setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filterQuery]);

  // No "Load more" button in a feed: fetch the next page as the end comes into view.
  useEffect(() => {
    if (!data || loadingMore.current) return;
    if (results.length >= total) return;
    if (index < results.length - 1 - PREFETCH_WITHIN) return;
    loadingMore.current = true;
    api.get(`/matching/results?offset=${results.length}&limit=${PAGE}${filterQuery}`)
      .then((page) => setData((now) => ({ ...page, results: [...now.results, ...page.results] })))
      .catch((err) => setError(err.message))
      .finally(() => { loadingMore.current = false; });
  }, [index, data, results.length, total, filterQuery]);

  // Each new candidate starts from the top. Nothing plays by itself: a browser will not start
  // sound until the page has been tapped, so an autoplaying pitch could only ever have been a
  // silent one. Waiting for the tap means the tap is the permission, and it plays with sound.
  useEffect(() => {
    const video = player.current;
    if (video) video.currentTime = 0;
  }, [index, clip?.id]);

  async function saveSearch() {
    // Saved searches are Responsibility 6 (Aye Myo Myat): POST /api/saved/searches.
    try {
      await api.post('/saved/searches', { name: filterTags(data.filter).slice(0, 2).join(', '), ...data.filter });
      actions.notify({ title: 'Search saved', message: 'Run it again any time from Saved.' });
    } catch (err) {
      actions.notify({ title: 'Search not saved', tone: 'error',
        message: err.status === 404 || err.status === 405 ? 'Saved searches are not connected yet (Responsibility 6).' : err.message });
    }
  }

  // On a small screen the video fills the card and a tap pauses it and brings up the
  // details over the top, the way a feed does. On a desktop the details are always beside it.
  function tapVideo() {
    const video = player.current;
    if (!video) return;
    // On a desktop the clip in the feed has its own controls; beside the resume it is a
    // thumbnail without them, so there a click works it on a desktop too.
    if (!touch && !onResume) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  const editLink = data ? `/find?${toQuery(fromApi(data.filter))}` : '/find';
  const invited = current ? actions.isInvited(current.applicant_id) : false;
  const bookmarked = current ? actions.isBookmarked(current.applicant_id) : false;
  const profileLink = current ? `/role/${current.applicant_id}/profile${suffix}` : '#';
  // The skills have no upper bound, so they slide sideways in one row rather than wrapping
  // and pushing the panel out of the frame. The ones that matched the search come first.
  const matched = current ? current.matched_skills : [];
  const others = current ? (current.skills || []).filter((s) => !matched.includes(s)) : [];

  const details = current && (
    <>
      <div className="rf-who">
        {current.rank && <span className="rf-rank">#{current.rank} match</span>}
        <h2 className="ui-h3">{current.name}</h2>
        <p className="ui-text-soft">
          {current.field_of_study} · {yearLabel(current.year)} · GPA {gpaLabel(current.gpa)} · {internshipsLabel(current.internships)}
        </p>
        {current.university && <p className="ui-text-xs ui-text-muted">{current.university}</p>}
      </div>

      <ScoreBreakdown result={current} />

      {(matched.length > 0 || others.length > 0) && (
        <Carousel label={`${current.name}'s skills`} className="rf-skills" batch={SKILL_BATCH}>
          {matched.map((skill) => <Tag key={skill} match>{skill}</Tag>)}
          {others.map((skill) => <Tag key={skill}>{skill}</Tag>)}
        </Carousel>
      )}

      {/* One row, the same as Explore: the whole profile, saving the candidate, inviting them. */}
      <div className="rf-actions">
        {/* The name is read out but not shown; the panel beside it already says whose it is. */}
        <Button variant="primary" size="md" icon={Compass} to={profileLink}
          aria-label={`Full profile: ${current.name}`}>
          Full Profile
        </Button>
        <IconButton icon={Bookmark} label={bookmarked ? 'Remove from saved' : 'Save candidate'}
          className={bookmarked ? 'is-on' : undefined} aria-pressed={bookmarked}
          onClick={() => actions.toggleBookmark(current)} />
        {invited
          ? <Button variant="secondary" size="md" icon={Check} disabled>Invited</Button>
          : <Button variant="accent" size="md" icon={Send} onClick={() => actions.invite(current)}>Invite</Button>}
      </div>
    </>
  );

  return (
    <div className="ui-app rf-app">
      <AppHeader />
      <main className="rf-main">
        <div className="rf-top">
          <div className="rf-top__row">
            <h1 className="ui-h4" aria-live="polite">
              {loading ? 'Finding candidates…' : `${total} candidate${total === 1 ? '' : 's'} match`}
            </h1>
            <div className="rf-top__actions">
              <Button variant="ghost" size="sm" icon={Bookmark} onClick={saveSearch} disabled={!data}>Save search</Button>
              <Button variant="secondary" size="sm" icon={SlidersHorizontal} to={editLink}>Edit filters</Button>
            </div>
          </div>

          {data && (
            <div className="rf-filters" aria-label="Active filters">
              {filterTags(data.filter).map((tag) => <Tag key={tag}>{tag}</Tag>)}
            </div>
          )}

          {current && (
            <div className="rr-sort">
              <span><Info aria-hidden="true" />Sorted by match score, then GPA, then newest profile</span>
              <span aria-live="polite">Showing {index + 1} of {total}</span>
            </div>
          )}
        </div>

        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

        {loading && <div className="rf-stage"><span className="ui-skeleton rf-viewport" /></div>}

        {noFilter && (
          <section className="ui-card ui-empty">
            <span className="ui-empty__icon"><SlidersHorizontal aria-hidden="true" /></span>
            <h2 className="ui-h5">Set up your search first</h2>
            <p className="ui-text-soft">Choose the field of study, year, GPA, internships and skills you need. Cato ranks every applicant against them.</p>
            <Button variant="primary" size="md" to="/find">Find candidates</Button>
          </section>
        )}

        {data && total === 0 && (
          <section className="ui-card ui-empty">
            <span className="ui-empty__icon"><SearchX aria-hidden="true" /></span>
            <h2 className="ui-h5">No candidates match these filters</h2>
            <p className="ui-text-soft">Every applicant missed at least one hard requirement. Try a lower minimum year, GPA or internships, or a different field of study.</p>
            <Button variant="secondary" size="md" icon={SlidersHorizontal} to={editLink}>Edit filters</Button>
          </section>
        )}

        {current && (
          <div className={`rf-stage${onResume ? ' is-resume' : ''}`} {...pager.handlers}>
            <button type="button" className={`rf-nav${pager.hasAbove ? '' : ' is-off'}`} onClick={() => pager.goRow(-1)}
              aria-label="Previous candidate" disabled={!pager.hasAbove} aria-hidden={!pager.hasAbove}
              tabIndex={pager.hasAbove ? 0 : -1}>
              <ChevronUp aria-hidden="true" />
            </button>

            <div className="rf-viewport">
              <div className={`rf-slide pager-slide${onResume ? ' is-resume' : ''}`} key={current.applicant_id} data-direction={pager.slide}>
                {/* The slivers sit either side of the video, the chevrons on top of them, so
                    nothing covers the picture. Only this middle box moves on a sideways swipe. */}
                <div className="rf-frame">
                  <Peek side="prev"
                    video={prevAt >= 0 && !isResumeSlot(prevAt) ? videos[prevAt] : null}
                    doc={prevAt >= 0 && isResumeSlot(prevAt)}
                    label={prevAt >= 0 ? `Back to ${slotName(prevAt)}` : 'Nothing before this'}
                    onClick={() => pager.goColumn(-1)} />

                  {/* Holds the video and, on the last step, the resume. Whichever is in flow
                      sets the width, and the video becomes a thumbnail in the resume's corner
                      rather than a second thing beside it. */}
                  <div className="rf-centre">
                    <div className="rf-video">
                      {clip ? (
                        <div className="rf-clip pager-slide" key={`${current.applicant_id}-${clip.id}`} data-direction={pager.slide}>
                          <video ref={player} src={clip.url} playsInline
                            controls={!touch && !onResume} loop={touch} onClick={tapVideo}
                            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                            aria-label={`${current.name}: ${clip.title}`} />
                          {(touch || onResume) && (
                            <button type="button" className="rf-tap" onClick={tapVideo}
                              aria-label={playing ? 'Pause video' : 'Play video'}>
                              {!playing && <span className="rf-tap__icon"><Play fill="currentColor" strokeWidth={0} /></span>}
                            </button>
                          )}
                          {clip.title && <span className="rf-video__title">{clip.title}</span>}
                          {/* The score belongs to the candidate, not the clip, so it stays put
                              wherever sideways has got to. */}
                          <span className="rf-video__score"><strong>{score(current.match_score)}</strong> match</span>
                          {slots > 1 && (
                            <span className="ex-dots" aria-label={`${column + 1} of ${slots}`}>
                              {videos.map((item, at) => <i key={item.id} className={!onResume && at === column ? 'is-on' : undefined} />)}
                              {hasResume && <i className={`ex-dots__doc${onResume ? ' is-on' : ''}`} />}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="rf-video__none">No pitch video yet</p>
                      )}
                    </div>

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

                {/* Desktop: always beside the video. Small screens: over it, once tapped. */}
                <aside className={`rf-side${small ? ' rf-side--overlay' : ''}${small && (playing || onResume) ? ' is-hidden' : ''}`}>
                  {details}
                </aside>
              </div>
            </div>

            <button type="button" className={`rf-nav${pager.hasBelow ? '' : ' is-off'}`} onClick={() => pager.goRow(1)}
              aria-label="Next candidate" disabled={!pager.hasBelow} aria-hidden={!pager.hasBelow}
              tabIndex={pager.hasBelow ? 0 : -1}>
              <ChevronDown aria-hidden="true" />
            </button>
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
                : <Button variant="accent" size="sm" icon={Send} onClick={() => actions.invite(current)}>Invite</Button>}
            </>
          } />
      )}
      {actions.ui}
    </div>
  );
}
