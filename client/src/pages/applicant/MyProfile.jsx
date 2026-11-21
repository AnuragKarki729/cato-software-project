// Responsibility 2: Applicant profile and resume — Nusrat Begam (6638009)
// Figma "P5 · My profile". Videos are uploaded and deleted through Responsibility 1's
// endpoints (Anurag Karki, 6838852); this page shows them next to the profile.
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, CircleAlert, Eye, GraduationCap, Mail, Pencil, RotateCcw, ShieldCheck, Star, Trash2, Video } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import ResumeUpload from '../../components/ui/ResumeUpload.jsx';
import ResumeViewer from '../../components/ui/ResumeViewer.jsx';
import VideoPoster from '../../components/ui/VideoPoster.jsx';
import { Avatar, Badge, Button, ConfirmDialog, Tag, Toast } from '../../components/ui/primitives.jsx';
import { duration, gpaLabel, internshipsLabel, shortDate, yearLabel } from '../../utils/format.js';

const MAX_EXTRA_VIDEOS = 5;

export default function MyProfile() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not created yet
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(location.state?.toast ? { title: location.state.toast } : null);
  const [viewing, setViewing] = useState(false);
  const [deleting, setDeleting] = useState(null);
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
                {visible ? <Badge tone="success">Visible to recruiters</Badge> : <Badge tone="warning">Not visible to recruiters yet</Badge>}
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

        <div className="pf-columns">
          <section className="pf-section" aria-labelledby="videos-title">
            <div className="pf-section__head">
              <div>
                <h2 id="videos-title" className="ui-h4">Videos</h2>
                <p className="ui-text-muted">{pitch ? '1 pitch' : 'No pitch yet'} + {extras.length} of {MAX_EXTRA_VIDEOS} extra videos</p>
              </div>
              <Button variant="secondary" size="sm" icon={Video} disabled title="Extra videos are part of Responsibility 1 and not built yet">Add video</Button>
            </div>
            <div className="pf-video-grid">
              <article className="ui-card ui-vtile">
                <VideoPoster size="tile" src={pitch?.url} kind="Pitch" seconds={pitch?.duration_seconds} name={user.name} label="your pitch video" />
                <div className="ui-vtile__body">
                  <div className="ui-vtile__text">
                    <p className="ui-vtile__title">Elevator pitch</p>
                    <p className="ui-text-xs ui-text-muted">{pitch ? `Required · uploaded ${shortDate(pitch.created_at)}` : 'Required · record or upload one to finish onboarding'}</p>
                  </div>
                  <div className="ui-vtile__actions">
                    {pitch ? (
                      <>
                        <Button variant="secondary" size="sm" icon={RotateCcw} to="/onboarding/video">Replace</Button>
                        {complete && <Badge tone="success">Visible to recruiters</Badge>}
                      </>
                    ) : (
                      <Button variant="primary" size="sm" icon={Video} to="/onboarding/video">Upload pitch</Button>
                    )}
                  </div>
                </div>
              </article>
              {extras.map((video, index) => (
                <article className="ui-card ui-vtile" key={video.id}>
                  <VideoPoster size="tile" src={video.url} kind="Extra" seconds={video.duration_seconds} name={user.name} label={`extra video ${index + 1}`} />
                  <div className="ui-vtile__body">
                    <div className="ui-vtile__text">
                      <p className="ui-vtile__title">Extra video {index + 1}</p>
                      <p className="ui-text-xs ui-text-muted">Extra video {index + 1} of {MAX_EXTRA_VIDEOS} · {duration(video.duration_seconds)}</p>
                    </div>
                    <div className="ui-vtile__actions">
                      <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleting(video)}>Delete</Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="pf-sidebar">
            <section className="ui-card" aria-labelledby="skills-title">
              <div className="ui-card__head">
                <h2 id="skills-title" className="ui-h5">Skills</h2>
                <Link to="/profile/edit" className="ui-link">Edit</Link>
              </div>
              {profile?.skills?.length ? (
                <div className="ui-tags">{profile.skills.map((skill) => <Tag key={skill}>{skill}</Tag>)}</div>
              ) : (
                <p className="ui-text-muted">No skills yet. Recruiters filter on skills, so add a few.</p>
              )}
            </section>

            <section className="ui-card" aria-labelledby="resume-title">
              <h2 id="resume-title" className="ui-h5">Resume</h2>
              {loading ? <span className="ui-skeleton" style={{ height: 66 }} /> : (
                <ResumeUpload profile={profile} showBadge={false} onOpen={() => setViewing(true)}
                  onChange={(updated, action) => { setProfile(updated); setToast({ title: action === 'removed' ? 'Resume removed' : 'Resume uploaded' }); }}
                  onError={(message) => setToast({ title: 'Resume not uploaded', message, tone: 'error' })} />
              )}
            </section>

            <section className="ui-card" aria-labelledby="privacy-title">
              <div className="pf-privacy__head">
                <ShieldCheck aria-hidden="true" />
                <h2 id="privacy-title" className="ui-h5">Privacy (PDPA)</h2>
              </div>
              <p className="ui-text-soft">
                Recruiters on Cato can see your profile, videos and resume. Your email is not shown on your profile.
              </p>
            </section>
          </aside>
        </div>
      </main>
      {viewing && profile?.resume_url && <ResumeViewer url={profile.resume_url} name={profile.resume_name} onClose={() => setViewing(false)} />}
      {deleting && <ConfirmDialog busy={busy} onConfirm={deleteVideo} onCancel={() => setDeleting(null)} />}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
