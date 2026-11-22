// Responsibility 2: Applicant profile and resume — Nusrat Begam (6638009)
// Figma "P5 · My profile". Videos are uploaded and deleted through Responsibility 1's
// endpoints (Anurag Karki, 6838852); this page shows them next to the profile.
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, CircleAlert, Eye, GraduationCap, Mail, Pencil, Plus, RotateCcw, Star, Trash2, Video } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import { AboutCard, ReplaceResume, ResumeCard } from '../../components/ProfileCards.jsx';
import ResumeViewer from '../../components/ui/ResumeViewer.jsx';
import VideoPoster from '../../components/ui/VideoPoster.jsx';
import VideoViewer from '../../components/ui/VideoViewer.jsx';
import { Avatar, Badge, Button, ConfirmDialog, Toast } from '../../components/ui/primitives.jsx';
import { gpaLabel, internshipsLabel, yearLabel } from '../../utils/format.js';

// Fallback until GET /api/options answers; the server is the source of truth (Responsibility 1).
const DEFAULT_MAX_EXTRA_VIDEOS = 3;

export default function MyProfile() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not created yet
  const [videos, setVideos] = useState([]);
  const [maxExtras, setMaxExtras] = useState(DEFAULT_MAX_EXTRA_VIDEOS);
  const [options, setOptions] = useState(null);  // for the About card's editor
  const [sheet, setSheet] = useState(null);      // 'about' | 'resume', open on its own
  const [aboutEditing, setAboutEditing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(location.state?.toast ? { title: location.state.toast } : null);
  const [deleting, setDeleting] = useState(null);
  const [watching, setWatching] = useState(null); // index into `playlist`
  const [busy, setBusy] = useState(false);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    // Forget the one-off toast so a refresh does not show it again.
    if (location.state?.toast) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/profiles/me').catch((err) => { if (err.status === 404) return null; throw err; }),
      api.get(`/videos/applicant/${user.id}`),
    ]).then(([mine, list]) => {
      if (!active) return;
      setProfile(mine);
      setVideos(list);
    }).catch((err) => { if (active) { setError(err.message); setProfile(null); } });
    api.get('/options')
      .then((opts) => {
        if (!active) return;
        setOptions(opts);
        if (opts.max_extra_videos) setMaxExtras(opts.max_extra_videos);
      })
      .catch(() => {}); // the fallback is fine; the server enforces the real limit
    return () => { active = false; };
  }, [user.id]);

  async function deleteVideo() {
    setBusy(true);
    try {
      await api.delete(`/videos/${deleting.id}`);
      setVideos((list) => list.filter((v) => v.id !== deleting.id));
      setToast({ title: 'Video deleted' });
      setDeleting(null);
    } catch (err) {
      setToast({ title: 'Could not delete the video', message: err.message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const loading = profile === undefined;
  const pitch = videos.find((v) => v.kind === 'pitch');
  const extras = videos.filter((v) => v.kind === 'extra').reverse(); // oldest first
  const playlist = [...(pitch ? [pitch] : []), ...extras];
  // Matching (Responsibility 5) includes every profile whose details are complete.
  const complete = !!profile?.details_complete;
  const visible = complete;

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main">
        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

        {!loading && !profile?.onboarding_complete && (
          <div className="ui-alert ui-alert--success" style={{ alignItems: 'center' }}>
            <CircleAlert />
            <span style={{ flex: 1 }}>
              {profile ? 'Your profile is not finished yet. Add the missing details and your resume so recruiters can find you.'
                : 'Fill in your profile and upload your resume so recruiters can find you.'}
            </span>
            <Button variant="secondary" size="sm" to={profile ? '/profile/edit' : '/onboarding/profile'}>Finish profile</Button>
          </div>
        )}

        {loading ? (
          <span className="ui-skeleton" style={{ height: 146, borderRadius: 12 }} aria-busy="true" />
        ) : (
          <section className="ui-card pf-head" aria-label="Profile summary">
            <Avatar name={user.name} size="xl" />
            <div className="pf-head__info">
              <div className="pf-head__name">
                <h1 className="ui-h2">{user.name}</h1>
                {/* Only the warning. Being visible is the point of having a profile, so saying
                    so every time is noise; not being visible is the thing worth a badge. */}
                {!visible && <Badge tone="warning">Not visible to recruiters yet</Badge>}
              </div>
              <div className="pf-meta">
                {profile?.university && <span><Building2 aria-hidden="true" />{profile.university}</span>}
                {profile?.field_of_study && <span><GraduationCap aria-hidden="true" />{profile.field_of_study} · {yearLabel(profile.year)}</span>}
                {profile?.gpa != null && <span><Star aria-hidden="true" />GPA {gpaLabel(profile.gpa)}</span>}
                {profile?.internships != null && <span><Briefcase aria-hidden="true" />{internshipsLabel(profile.internships)}</span>}
                <span><Mail aria-hidden="true" />{user.email}</span>
              </div>
            </div>
            <div className="pf-head__actions">
              <Button variant="secondary" size="md" icon={Eye} to="/profile/preview" disabled={!complete}
                title={complete ? undefined : 'Finish your profile first'}>Preview as recruiter</Button>
              <Button variant="primary" size="md" icon={Pencil} to="/profile/edit">Edit profile</Button>
            </div>
          </section>
        )}

          <section className="pf-section" aria-labelledby="videos-title">
            <div className="pf-section__head">
              <div>
                <h2 id="videos-title" className="ui-h4">Videos</h2>
                <p className="ui-text-muted">{pitch ? '1 pitch' : 'No pitch yet'} + {extras.length} of {maxExtras} extra videos</p>
              </div>
              <Button variant="secondary" size="sm" icon={Video} to="/videos/add" disabled={extras.length >= maxExtras}
                title={extras.length >= maxExtras ? `You can have up to ${maxExtras} extra videos. Delete one to add another.` : undefined}>
                Add video
              </Button>
            </div>
            {/* Tiles are thumbnails only. Everything about a video lives in the viewer. */}
          <div className="pf-video-grid">
              {pitch ? (
                <article className="ui-vtile pf-tile">
                  <VideoPoster size="tile" src={pitch.url} seconds={pitch.duration_seconds} name={user.name}
                    label="your pitch video" onPlay={() => setWatching(0)} preview />
                  <span className="pf-tile__badge">Elevator pitch</span>
                </article>
              ) : (
                <article className="ui-vtile pf-tile pf-tile--empty">
                  <VideoPoster size="tile" name={user.name} label="your pitch video"
                    emptyText="Record your pitch to finish onboarding" />
                  <Button variant="primary" size="sm" icon={Video} to="/onboarding/video" className="pf-tile__cta">Upload pitch</Button>
                </article>
              )}

              {extras.map((video, index) => (
                <article className="ui-vtile pf-tile" key={video.id}>
                  <VideoPoster size="tile" src={video.url} seconds={video.duration_seconds} name={user.name}
                    label={`extra video ${index + 1}`} onPlay={() => setWatching(playlist.indexOf(video))} preview />
                  <span className="pf-tile__badge pf-tile__badge--muted">{video.title}</span>
                </article>
              ))}

              {/* The same two cards a recruiter sees after the videos, in the same order, so
                  this page and the preview of it are the same row. Clicking one opens that
                  card on its own, and About is editable right there. */}
              {profile && (
                <article className="ui-vtile pf-tile pf-tile--sheet">
                  <AboutCard profile={profile} options={options ?? undefined} editable
                    onSaved={setProfile} onEditing={setAboutEditing} />
                  {/* Not while the card is a form: a stray click on a label would open the
                      dialog and take the half-typed values with it. */}
                  {!aboutEditing && (
                    <button type="button" className="pf-tile__open" onClick={() => setSheet('about')}
                      aria-label="Open your profile details" />
                  )}
                </article>
              )}

              {profile && (
                <article className="ui-vtile pf-tile pf-tile--sheet">
                  <ResumeCard profile={profile} onOpen={() => setSheet('resume')}
                    onChange={(updated, action) => { setProfile(updated); setToast({ title: action === 'removed' ? 'Resume removed' : 'Resume uploaded' }); }}
                    onError={(message) => setToast({ title: 'Resume not uploaded', message, tone: 'error' })} />
                </article>
              )}

              {/* After those cards: the invitation to add another video. */}
              {extras.length < maxExtras && (
                <Link to="/videos/add" className="pf-add" aria-label="Add another video">
                  <span className="pf-add__plus" aria-hidden="true"><Plus /></span>
                  <strong className="ui-text-xs">Add a video</strong>
                  <span className="pf-add__hint">Add more to reveal your strengths to recruiters</span>
                </Link>
              )}
            </div>
        </section>
      </main>
      {/* Clicking a card opens that card on its own: one item, so the viewer shows no
          chevrons and no count. About stays editable inside it, with the room to be. */}
      {sheet === 'about' && profile && (
        <VideoViewer videos={[]} index={0} onIndex={() => {}} onClose={() => setSheet(null)}
          extra={[{
            kind: 'sheet', key: 'about', title: 'Your profile details', wide: true,
            node: <AboutCard profile={profile} options={options ?? undefined} editable onSaved={setProfile} />,
          }]} />
      )}
      {sheet === 'resume' && profile?.resume_url && (
        <ResumeViewer url={profile.resume_url} name={profile.resume_name} onClose={() => setSheet(null)}
          actions={
            <ReplaceResume
              onChange={(updated) => { setProfile(updated); setToast({ title: 'Resume uploaded' }); }}
              onError={(message) => setToast({ title: 'Resume not uploaded', message, tone: 'error' })} />
          } />
      )}
      {watching !== null && playlist[watching] && (
        <VideoViewer
          videos={playlist}
          index={watching}
          onIndex={setWatching}
          onClose={() => setWatching(null)}
          actions={(video) => (video.kind === 'pitch'
            ? <Button variant="secondary" size="sm" icon={RotateCcw} to="/onboarding/video">Replace pitch</Button>
            : <Button variant="ghost" size="sm" icon={Trash2} onClick={() => { setWatching(null); setDeleting(video); }}>Delete</Button>)}
        />
      )}
      {deleting && <ConfirmDialog busy={busy} onConfirm={deleteVideo} onCancel={() => setDeleting(null)} />}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
