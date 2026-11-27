// Responsibilities 2 and 5 — Nusrat Begam (6638009)
// Figma "P9 · Candidate profile": the read-only profile a recruiter opens from the ranked
// results, with the score breakdown. With `preview`, an applicant sees their own profile
// the way recruiters do ("Preview as recruiter" on My profile).
// Invite (Responsibility 8, Siwakorn P.) and Bookmark (Responsibility 6, Aye Myo Myat)
// plug into the "Interested?" card.
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, CircleAlert, Lock, Send, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import useCandidateActions from '../../components/useCandidateActions.jsx';
import ResumeViewer from '../../components/ui/ResumeViewer.jsx';
import { AboutCard, ResumeCard } from '../../components/ProfileCards.jsx';
import VideoPoster from '../../components/ui/VideoPoster.jsx';
import VideoViewer from '../../components/ui/VideoViewer.jsx';
import { ScoreBreakdown } from '../../components/ui/MatchScore.jsx';
import { Avatar, Badge, Button } from '../../components/ui/primitives.jsx';
import { fileSize, firstName, yearLabel } from '../../utils/format.js';
import { carry } from '../../utils/filters.js';

const notFound = (err) => { if (err.status === 404) return null; throw err; };

// Issue #4: the "Interested?" card follows the invitation through its life.
//   none              → Invite {name}
//   pending / viewed  → Invited · Pending approval (Seen by them, once they opened it)
//   accepted          → Invitation accepted · Email {name} at {email}
//   declined/expired  → Invitation declined (or expired) · Invite again?
function InvitationState({ invitation, name, onInvite }) {
  const first = name.split(' ')[0];
  const status = invitation?.status;
  if (status === 'pending' || status === 'viewed') {
    return (
      <div className="cp-invite-state">
        <Badge tone="warning">Invited · Pending approval</Badge>
        <p className="ui-text-soft">{status === 'viewed' ? `${first} has seen it and not answered yet.` : `Waiting for ${first} to answer.`}</p>
      </div>
    );
  }
  if (status === 'accepted') {
    return (
      <div className="cp-invite-state">
        <Badge tone="success">Invitation accepted</Badge>
        <p>Email {name} at <a href={`mailto:${invitation.email}`}>{invitation.email}</a></p>
      </div>
    );
  }
  if (status === 'declined' || status === 'expired') {
    return (
      <div className="cp-invite-state">
        <Badge tone={status === 'declined' ? 'danger' : 'neutral'}>{status === 'declined' ? 'Invitation declined' : 'Invitation expired'}</Badge>
        {status === 'declined' && invitation.reason && <p className="ui-text-soft">“{invitation.reason}”</p>}
        <Button variant="primary" size="lg" icon={Send} block onClick={onInvite}>Invite again?</Button>
      </div>
    );
  }
  return <Button variant="primary" size="lg" icon={Send} block onClick={onInvite}>Invite {first}</Button>;
}

export default function ApplicantProfile({ preview = false }) {
  const { user } = useAuth();
  const params = useParams();
  const applicantId = preview ? user.id : Number(params.applicantId);
  const [searchParams] = useSearchParams();
  const suffix = carry(searchParams); // the search from Ranked results, if any
  // Where the recruiter came from, and which card they were on when they left. Explore sends
  // both, so Back goes to the feed rather than to a search they never ran, and the row opens
  // on the card they were watching. A card key rather than an index, because the two pages
  // order a candidate's videos from different endpoints.
  const cameFromFeed = searchParams.get('from') === 'explore';
  const startKey = searchParams.get('start') || '';
  const actions = useCandidateActions();
  const [profile, setProfile] = useState(undefined);
  const [videos, setVideos] = useState([]);
  const [match, setMatch] = useState(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(false);
  const [watching, setWatching] = useState(null); // index into the viewer's items
  // Edit on the small About card opens the big copy already in edit mode: there is no room
  // to fill in a form at the size the card is in the row.
  const [editingAbout, setEditingAbout] = useState(false);
  const [middle, setMiddle] = useState(-1);       // -1 until moved: the start key decides
  const [dir, setDir] = useState('none');        // which way the last move went
  const [moves, setMoves] = useState(0);         // remounts the row so its animation re-runs
  // Preview only: the applicant is looking at their own profile, so the About card is theirs
  // to change. Editing happens in the card rather than on another page — the point of the
  // preview is seeing what a recruiter sees, and being sent elsewhere to fix it loses that.
  const [options, setOptions] = useState(null);  // the card falls back to its own defaults

  useEffect(() => {
    if (!preview) return undefined;
    let active = true;
    api.get('/options').then((opts) => { if (active) setOptions(opts); }).catch(() => {});
    return () => { active = false; };
  }, [preview]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(`/profiles/${applicantId}`).catch(notFound),
      api.get(`/videos/applicant/${applicantId}`),
      preview ? null : api.get(`/matching/results/${applicantId}${suffix}`).catch(notFound),
    ]).then(([found, list, result]) => {
      if (!active) return;
      setProfile(found);
      setVideos(list);
      setMatch(result);
      setMiddle(-1);  // a new candidate's reel starts where the link asked, else the pitch
    }).catch((err) => { if (active) { setError(err.message); setProfile(null); } });
    return () => { active = false; };
  }, [applicantId, preview, suffix]);

  const back = preview
    ? <Button variant="ghost" size="sm" icon={ArrowLeft} to="/profile" className="cp-back">Back to My profile</Button>
    : cameFromFeed
      ? <Button variant="ghost" size="sm" icon={ArrowLeft} to="/explore" className="cp-back">Back to video feed</Button>
      : <Button variant="ghost" size="sm" icon={ArrowLeft} to={`/results${suffix}`} className="cp-back">Back to results</Button>;

  if (profile === undefined || profile === null) {
    return (
      <div className="ui-app">
        <AppHeader />
        <main className="ui-main">
          {back}
          {error ? <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>
            : profile === null ? <p className="ui-alert ui-alert--info" role="alert"><CircleAlert />This applicant has not filled in a profile yet.</p>
            : <div className="cp-columns" aria-busy="true"><span className="ui-skeleton" style={{ height: 480 }} /><span className="ui-skeleton" style={{ height: 320 }} /></div>}
        </main>
      </div>
    );
  }

  const pitch = videos.find((v) => v.kind === 'pitch');
  const extras = videos.filter((v) => v.kind === 'extra').reverse();
  // The viewer walks the pitch first, then the extras, in the order shown on the page.
  const playlist = [...(pitch ? [pitch] : []), ...extras];

  // Responsibility 1: one row holds everything there is to look at — the candidate's videos,
  // then what their profile says, then their resume. Every card is the same size, the one in
  // the middle is sharp and full size and its neighbours are scaled down and blurred. The page
  // itself does not scroll: moving sideways replaces scrolling down through sections.
  const slides = [
    ...playlist.map((video) => ({ key: `v${video.id}`, kind: 'video', video, name: video.title })),
    { key: 'about', kind: 'about', name: 'About' },
    ...(profile.resume_url
      ? [{ key: 'resume', kind: 'resume', name: profile.resume_name || 'Resume' }]
      : []),
  ];
  const count = slides.length;
  // Until the recruiter moves the row themselves, it sits on the card the link named. An
  // unknown or missing key falls back to the first card, which is the elevator pitch.
  const asked = startKey ? slides.findIndex((slide) => slide.key === startKey) : -1;
  const at = middle >= 0 ? Math.min(middle, count - 1) : Math.max(0, asked);
  const here = slides[at];
  // Circular, and the slide follows the gesture rather than the index: going on from the last
  // card brings the first in from the right like any other step forward, never rewinding past
  // everything in between. Only three cards are ever on screen, so the wrap costs nothing.
  const step = (by) => {
    if (count < 2) return;
    setDir(by > 0 ? 'next' : 'back');
    setMiddle(((at + by) % count + count) % count);
    setMoves((m) => m + 1);
  };
  const cardBody = (slide, isMiddle) => {
    if (slide.kind === 'video') {
      return (
        <VideoPoster size="lg" src={slide.video.url} name={profile.name}
          kind={slide.video.kind === 'pitch' ? 'Pitch' : 'Extra'}
          seconds={slide.video.duration_seconds}
          label={slide.video.kind === 'pitch' ? `${profile.name}'s pitch video` : `${profile.name}: ${slide.video.title}`}
          // Only the middle card previews under the cursor and opens the viewer.
          preview={isMiddle} onPlay={isMiddle ? () => setWatching(at) : undefined} />
      );
    }
    if (slide.kind === 'about') {
      const big = slide.big;
      return (
        <AboutCard profile={profile} match={match} options={options ?? undefined}
          editable={preview} onSaved={setProfile} focusable={isMiddle}
          startInEdit={big && editingAbout}
          onRequestEdit={big ? undefined : () => { setEditingAbout(true); setWatching(playlist.length); }} />
      );
    }
    return <ResumeCard profile={profile} onOpen={() => setViewing(true)} focusable={isMiddle} />;
  };

  const before = count > 1 ? slides[(at - 1 + count) % count] : null;
  const after = count > 1 ? slides[(at + 1) % count] : null;

  return (
    <div className="ui-app cp-app">
      <AppHeader />
      <main className="cp-main">
        {preview && (
          <div className="ui-alert ui-alert--info cp-preview">
            <span>This is how recruiters see your profile. Your email is not shown to them.</span>
          </div>
        )}
        {back}
        <div className="cp-columns">
          <div className="cp-profile">
            <div className="cp-head">
              <Avatar name={profile.name} size="lg" />
              <div className="cp-head__name">
                <div className="cp-head__row">
                  <h1 className="ui-h2">{profile.name}</h1>
                  {match?.missed?.length > 0
                    ? <span className="rf-close">Close match · Misses {match.missed.join(', ')}</span>
                    : match?.rank && <Badge tone="accent" dot={false}>#{match.rank} for your search</Badge>}
                  {match && !match.meets_requirements && <Badge tone="warning">Outside your filters</Badge>}
                </div>
                <p className="ui-lead">{[profile.field_of_study, yearLabel(profile.year), profile.university].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            <figure className="cp-reel">
              <div className="cp-reel__viewport">
                {/* Three cards, never more: the one in the middle and its two neighbours,
                    picked with a wrap. The row is keyed on the move count so its slide
                    animation re-runs, and data-dir says which way it came from. */}
                <div className="cp-reel__row" key={moves} data-dir={count > 1 ? dir : 'none'}>
                  {before && (
                    <div className="cp-reel__card is-side is-before">
                      {cardBody(before, false)}
                      <button type="button" className="cp-reel__pick" onClick={() => step(-1)}
                        aria-label={`Show ${before.name}`} />
                    </div>
                  )}

                  <div className="cp-reel__card is-middle">{cardBody(here, true)}</div>

                  {after && (
                    <div className="cp-reel__card is-side is-after">
                      {cardBody(after, false)}
                      <button type="button" className="cp-reel__pick" onClick={() => step(1)}
                        aria-label={`Show ${after.name}`} />
                    </div>
                  )}
                </div>

                {count > 1 && (
                  <>
                    <button type="button" className="cp-reel__nav cp-reel__nav--prev"
                      onClick={() => step(-1)} aria-label={`Show ${before.name}`}>
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <button type="button" className="cp-reel__nav cp-reel__nav--next"
                      onClick={() => step(1)} aria-label={`Show ${after.name}`}>
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>

              <figcaption className="cp-reel__caption" aria-live="polite">
                {here.kind === 'video' && <>
                  <p><strong>{here.video.title}</strong></p>
                  {here.video.description && <p className="ui-text-soft">{here.video.description}</p>}
                </>}
                {here.kind === 'about' && <>
                  <p><strong>About {firstName(profile.name)}</strong></p>
                  <p className="ui-text-soft">Field, year, GPA, internships and skills, as filled in.</p>
                </>}
                {here.kind === 'resume' && <>
                  <p><strong>{profile.resume_name || 'Resume.pdf'}</strong></p>
                  <p className="ui-text-soft">PDF · {fileSize(profile.resume_size)} · click the card to read it</p>
                </>}
                {slides.length > 1 && (
                  <p className="ui-text-xs ui-text-muted">{at + 1} of {slides.length}</p>
                )}
              </figcaption>
            </figure>
          </div>

          <aside className="cp-sidebar">
            {!preview && (
              <section className="ui-card cp-interest" aria-labelledby="interest-title">
                <h2 id="interest-title" className="ui-h5">Interested?</h2>
                <p className="ui-text-soft">{firstName(profile.name)} gets a fixed invitation message from you and your company.</p>
                <InvitationState invitation={actions.invitation(applicantId)} name={profile.name}
                  onInvite={() => actions.invite({ applicant_id: applicantId, name: profile.name })} />
                <Button variant="secondary" size="lg" icon={Bookmark} block aria-pressed={actions.isBookmarked(applicantId)}
                  onClick={() => actions.toggleBookmark({ applicant_id: applicantId, name: profile.name })}>
                  {actions.isBookmarked(applicantId) ? 'Bookmarked' : 'Bookmark'}
                </Button>
              </section>
            )}

            {!preview && (match ? <ScoreBreakdown result={match} /> : (
              <section className="ui-card ui-empty" aria-label="Match score">
                <span className="ui-empty__icon"><SlidersHorizontal aria-hidden="true" /></span>
                <p className="ui-h5">No match score yet</p>
                <p className="ui-text-soft">Set your search filters to see how well {firstName(profile.name)} matches them.</p>
                <Button variant="secondary" size="md" to="/find">Find candidates</Button>
              </section>
            ))}

            <p className="cp-note"><Lock aria-hidden="true" />Videos and the resume are for recruiters on Cato only. Downloading or sharing them outside Cato is not allowed.</p>
          </aside>
        </div>
      </main>
      {viewing && <ResumeViewer url={profile.resume_url} name={profile.resume_name} onClose={() => setViewing(false)} />}
      {watching !== null && (
        // The viewer pages the same cards the row does, in the same order, so an index means
        // the same thing in both. The resume asks for a wide frame: a resume read in a 9:16
        // column is a resume nobody reads.
        <VideoViewer videos={playlist} index={watching} onIndex={setWatching}
          onClose={() => { setWatching(null); setEditingAbout(false); }}
          extra={[
            { kind: 'sheet', key: 'about', title: `About ${firstName(profile.name)}`, wide: preview,
              node: cardBody({ ...slides.find((s) => s.kind === 'about'), big: true }, true) },
            ...(profile.resume_url ? [{
              kind: 'sheet', key: 'resume', title: profile.resume_name || 'Resume.pdf', wide: true,
              node: <iframe className="vv__pdf" src={`${profile.resume_url}#toolbar=0&navpanes=0&view=FitH`}
                title={profile.resume_name || 'Resume'} />,
            }] : []),
          ]} />
      )}
      {actions.ui}
    </div>
  );
}
