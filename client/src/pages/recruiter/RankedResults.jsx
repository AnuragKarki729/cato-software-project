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
import { Bookmark, Check, ChevronDown, ChevronUp, CircleAlert, Compass, Info, Play, SearchX, Send, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import useCandidateActions from '../../components/useCandidateActions.jsx';
import { useSmallScreen, useVerticalPager } from '../../components/useVerticalPager.jsx';
import Carousel from '../../components/ui/Carousel.jsx';
import { ScoreBreakdown } from '../../components/ui/MatchScore.jsx';
import { Button, IconButton, Tag } from '../../components/ui/primitives.jsx';
import { gpaLabel, internshipsLabel, score, yearLabel } from '../../utils/format.js';
import { carry, fromApi, fromSearch, toQuery } from '../../utils/filters.js';

const PAGE = 5;
const PREFETCH_WITHIN = 2;  // fetch the next page once this close to the end
// Skills per page in the panel, the same as Explore. A layout choice, not the server's cap:
// a profile holds at most ten today (options_service.MAX_SKILLS), so there is normally one
// page and nothing to move through. If that cap is ever raised these stay in pages of ten.
const SKILL_BATCH = 10;

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

  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noFilter, setNoFilter] = useState(false);
  // What the element is actually doing. On a phone the details are up exactly when the pitch
  // is not running, so that is one fact rather than a second flag kept alongside it.
  const [playing, setPlaying] = useState(false);
  const player = useRef(null);
  const loadingMore = useRef(false);

  const results = data?.results ?? [];
  const current = results[index];
  const total = data?.total ?? 0;

  const move = useCallback((next) => { setIndex(next); setPlaying(false); }, []);
  const pager = useVerticalPager({ index, count: results.length, onIndex: move, enabled: !!current });

  useEffect(() => {
    let active = true;
    api.get(`/matching/results?offset=0&limit=${PAGE}${filterQuery}`)
      // The page and the position in it land together, so the frame never shows one
      // candidate's video against another's score.
      .then((page) => { if (active) { setData(page); setIndex(0); setPlaying(false); } })
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
    if (!video) return;
    video.currentTime = 0;
  }, [index]);

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
    if (!small) return;
    const video = player.current;
    if (!video) return;
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
          <div className="rf-stage" {...pager.handlers}>
            <button type="button" className={`rf-nav${pager.hasPrevious ? '' : ' is-off'}`} onClick={() => pager.go(-1)}
              aria-label="Previous candidate" disabled={!pager.hasPrevious} aria-hidden={!pager.hasPrevious}
              tabIndex={pager.hasPrevious ? 0 : -1}>
              <ChevronUp aria-hidden="true" />
            </button>

            <div className="rf-viewport">
              <div className="rf-slide pager-slide" key={current.applicant_id} data-direction={pager.slide}>
                <div className="rf-video">
                  {current.pitch_url ? (
                    <>
                      <video ref={player} src={current.pitch_url} playsInline
                        controls={!small} loop={small} onClick={tapVideo}
                        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                        aria-label={`${current.name}'s pitch video`} />
                      {small && (
                        <button type="button" className="rf-tap" onClick={tapVideo}
                          aria-label={playing ? 'Pause pitch' : 'Play pitch'}>
                          {!playing && <span className="rf-tap__icon"><Play fill="currentColor" strokeWidth={0} /></span>}
                        </button>
                      )}
                      {current.pitch_title && <span className="rf-video__title">{current.pitch_title}</span>}
                      <span className="rf-video__score"><strong>{score(current.match_score)}</strong> match</span>
                    </>
                  ) : (
                    <p className="rf-video__none">No pitch video yet</p>
                  )}
                </div>

                {/* Desktop: always beside the video. Small screens: over it, once tapped. */}
                <aside className={`rf-side${small ? ' rf-side--overlay' : ''}${small && playing ? ' is-hidden' : ''}`}>
                  {details}
                </aside>
              </div>
            </div>

            <button type="button" className={`rf-nav${pager.hasNext ? '' : ' is-off'}`} onClick={() => pager.go(1)}
              aria-label="Next candidate" disabled={!pager.hasNext} aria-hidden={!pager.hasNext}
              tabIndex={pager.hasNext ? 0 : -1}>
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
        )}
      </main>
      {actions.ui}
    </div>
  );
}
