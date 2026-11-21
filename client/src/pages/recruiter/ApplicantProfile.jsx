// Responsibilities 2 and 5 — Nusrat Begam (6638009)
// Figma "P9 · Candidate profile": the read-only profile a recruiter opens from the ranked
// results, with the score breakdown. With `preview`, an applicant sees their own profile
// the way recruiters do ("Preview as recruiter" on My profile).
// Invite (Responsibility 8, Siwakorn P.) and Bookmark (Responsibility 6, Aye Myo Myat)
// plug into the "Interested?" card.
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Briefcase, Check, Calendar, CircleAlert, ExternalLink, FileText, GraduationCap, Lock, Send, SlidersHorizontal, Star } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import useCandidateActions from '../../components/useCandidateActions.jsx';
import ResumeViewer from '../../components/ui/ResumeViewer.jsx';
import VideoPoster from '../../components/ui/VideoPoster.jsx';
import { ScoreBreakdown } from '../../components/ui/MatchScore.jsx';
import { Avatar, Badge, Button, Tag } from '../../components/ui/primitives.jsx';
import { fileSize, firstName, gpaLabel, yearLabel } from '../../utils/format.js';
import { carry } from '../../utils/filters.js';

const notFound = (err) => { if (err.status === 404) return null; throw err; };

export default function ApplicantProfile({ preview = false }) {
  const { user } = useAuth();
  const params = useParams();
  const applicantId = preview ? user.id : Number(params.applicantId);
  const [searchParams] = useSearchParams();
  const suffix = carry(searchParams); // the search from Ranked results, if any
  const actions = useCandidateActions();
  const [profile, setProfile] = useState(undefined);
  const [videos, setVideos] = useState([]);
  const [match, setMatch] = useState(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(false);

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
    }).catch((err) => { if (active) { setError(err.message); setProfile(null); } });
    return () => { active = false; };
  }, [applicantId, preview, suffix]);

  const back = preview
    ? <Button variant="ghost" size="sm" icon={ArrowLeft} to="/profile" className="cp-back">Back to My profile</Button>
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
  const matched = new Set(match?.matched_skills || []);
  const skills = [...(profile.skills || [])].sort((a, b) => matched.has(b) - matched.has(a));
  const facts = [
    { icon: GraduationCap, label: 'Field of study', value: profile.field_of_study || '—' },
    { icon: Calendar, label: 'Year', value: yearLabel(profile.year) },
    { icon: Star, label: 'GPA', value: profile.gpa == null ? '—' : `${gpaLabel(profile.gpa)} / 4.00` },
    { icon: Briefcase, label: 'Internships', value: profile.internships ?? '—' },
  ];

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main">
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
                  {match?.rank && <Badge tone="accent" dot={false}>#{match.rank} for your search</Badge>}
                  {match && !match.meets_requirements && <Badge tone="warning">Outside your filters</Badge>}
                </div>
                <p className="ui-lead">{[profile.field_of_study, yearLabel(profile.year), profile.university].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            <VideoPoster size="lg" src={pitch?.url} kind="Pitch" seconds={pitch?.duration_seconds} name={profile.name}
              label={`${profile.name}'s pitch video`} emptyText="No pitch video yet" />

            {extras.length > 0 && (
              <section className="cp-more" aria-labelledby="more-title">
                <h2 id="more-title" className="ui-h5">More videos ({extras.length})</h2>
                <div className="cp-more__row">
                  {extras.map((video, index) => (
                    <VideoPoster key={video.id} src={video.url} kind="Extra" seconds={video.duration_seconds} name={profile.name}
                      label={`${profile.name}'s extra video ${index + 1}`} />
                  ))}
                </div>
              </section>
            )}

            <section className="ui-card" aria-labelledby="about-title">
              <h2 id="about-title" className="ui-h5">About</h2>
              <div className="cp-facts">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div className="cp-fact" key={label}>
                    <span><Icon aria-hidden="true" />{label}</span>
                    <strong title={String(value)}>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="cp-skills">
                <p>{match ? 'Skills (matches for your search in green)' : 'Skills'}</p>
                {skills.length ? (
                  <div className="ui-tags">{skills.map((skill) => <Tag key={skill} match={matched.has(skill)}>{skill}</Tag>)}</div>
                ) : <p className="ui-text-muted">No skills listed.</p>}
              </div>
            </section>

            <section className="ui-card cp-resume" aria-label="Resume">
              <span className="ui-file__icon ui-file__icon--neutral"><FileText aria-hidden="true" /></span>
              <span className="ui-file__text">
                <span className="ui-file__name" style={{ cursor: 'default' }}>{profile.resume_url ? profile.resume_name || 'Resume.pdf' : 'No resume uploaded yet'}</span>
                {profile.resume_url && <span className="ui-file__meta">PDF · {fileSize(profile.resume_size)} · opens in the Cato viewer</span>}
              </span>
              {profile.resume_url && (
                <Button variant="secondary" size="sm" icon={ExternalLink} onClick={() => setViewing(true)} aria-label="Open PDF">
                  <span>Open PDF</span>
                </Button>
              )}
            </section>
          </div>

          <aside className="cp-sidebar">
            {!preview && (
              <section className="ui-card cp-interest" aria-labelledby="interest-title">
                <h2 id="interest-title" className="ui-h5">Interested?</h2>
                <p className="ui-text-soft">{firstName(profile.name)} gets a fixed invitation message from you and your company.</p>
                {actions.isInvited(applicantId) ? (
                  <Button variant="secondary" size="lg" icon={Check} block disabled>Invited</Button>
                ) : (
                  <Button variant="primary" size="lg" icon={Send} block onClick={() => actions.invite({ applicant_id: applicantId, name: profile.name })}>
                    Invite {firstName(profile.name)}
                  </Button>
                )}
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
      {actions.ui}
    </div>
  );
}
