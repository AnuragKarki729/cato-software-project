// Responsibility 1/2 — Anurag Karki (6838852): the last onboarding step.
//
// The resume was read in the background while the applicant recorded their pitch, so by now
// the details are usually waiting. This screen shows them, lets the applicant correct
// anything, and asks for the one thing the resume is never read for: the field of study.
//
// Three states, and none of them is an error the applicant has to deal with:
//   pending  the read has not finished; a quiet animation, and the fields fill themselves in
//   done     the parsed values, all editable
//   failed   empty fields to type into. The resume and the video are saved either way, so a
//            failed read costs the applicant a little typing and nothing else.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CircleAlert, Plus } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import OnboardingStepper from '../../components/OnboardingStepper.jsx';
import SearchSelect from '../../components/ui/SearchSelect.jsx';
import VideoPoster from '../../components/ui/VideoPoster.jsx';
import { Button, Logo, SelectField, TextField, Toast } from '../../components/ui/primitives.jsx';
import { duration as formatDuration, yearLabel } from '../../utils/format.js';

const EMPTY = { university: '', field_of_study: '', year: '', gpa: '', internships: '', skills: [] };

const toForm = (profile) => profile ? {
  university: profile.university ?? '',
  field_of_study: profile.field_of_study ?? '',
  year: profile.year ?? '',
  gpa: profile.gpa === null || profile.gpa === undefined ? '' : Number(profile.gpa).toFixed(2),
  internships: profile.internships ?? '',
  skills: profile.skills ?? [],
} : EMPTY;

const numberOrNull = (value) => (value === '' || value === null ? null : Number(value));

function gpaError(value) {
  const text = String(value).trim();
  if (text === '') return '';
  const number = Number(text);
  if (Number.isNaN(number)) return 'Enter your GPA as a number, for example 3.45';
  if (number < 0 || number > 4) return 'GPA must be between 0.00 and 4.00';
  return '';
}

export default function OnboardingReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [profile, setProfile] = useState(null);
  const [video, setVideo] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const touchedRef = useRef(false);

  const status = profile?.parse_status ?? 'pending';
  const waiting = status === 'pending';

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/options'),
      api.get('/profiles/me').catch((err) => { if (err.status === 404) return null; throw err; }),
      api.get(`/videos/applicant/${user.id}`).catch(() => []),
    ]).then(([opts, mine, videos]) => {
      if (!active) return;
      setOptions(opts);
      setProfile(mine);
      setForm(toForm(mine));
      setVideo((videos || []).find((v) => v.kind === 'pitch') || null);
    }).catch((err) => { if (active) setErrors({ form: err.message }); });
    return () => { active = false; };
  }, [user.id]);

  // While the read is still running, check again every couple of seconds and drop the values
  // in when they land. No spinner on the fields themselves: they simply fill in.
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(async () => {
      try {
        const mine = await api.get('/profiles/me');
        setProfile(mine);
        if (!touchedRef.current) setForm(toForm(mine));
      } catch {
        // keep waiting; the applicant can always type the details in instead
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [waiting]);

  const set = (field) => (value) => {
    touchedRef.current = true;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function toggleSkill(skill) {
    touchedRef.current = true;
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill)
        ? current.skills.filter((s) => s !== skill)
        : current.skills.concat(skill),
    }));
    setErrors((current) => ({ ...current, skills: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.university) next.university = 'Select your university';
    if (!form.field_of_study) next.field_of_study = 'Select your field of study';
    if (form.year === '') next.year = 'Select your year of study';
    if (String(form.gpa).trim() === '') next.gpa = 'Enter your GPA';
    else if (gpaError(form.gpa)) next.gpa = gpaError(form.gpa);
    if (form.internships === '') next.internships = 'Select how many internships you have done';
    if (form.skills.length === 0) next.skills = 'Pick at least one skill';
    return next;
  }

  async function finish(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"], .ui-field-error')
        ?.closest('.ui-field, .ui-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setBusy(true);
    try {
      await api.put('/profiles/me', {
        university: form.university,
        field_of_study: form.field_of_study,
        year: numberOrNull(form.year),
        gpa: numberOrNull(form.gpa),
        internships: numberOrNull(form.internships),
        skills: form.skills,
      });
      navigate('/profile', { state: { toast: 'Your profile is live' } });
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  }

  const header = (
    <header className="ob-header">
      <Logo />
      <OnboardingStepper current={3} />
      <span />
    </header>
  );

  if (!options) {
    return <div className="ui-app">{header}<main className="ob-main"><div className="ob-column" aria-busy="true">
      <span className="ui-skeleton" style={{ height: 116 }} />
      <span className="ui-skeleton" style={{ height: 420 }} />
    </div></main></div>;
  }

  const list = (values, label = String) => values.map((value) => ({ value, label: label(value) }));

  // A field the read finished without filling: say so plainly rather than leaving an empty
  // box the applicant has to puzzle over. Once they fill it in, the marker goes away.
  const read = status === 'done' || status === 'failed';
  const notFound = (field) => read && (profile?.[field] === null || profile?.[field] === undefined)
    && (form[field] === '' || form[field] === null);
  const missing = (field) => (notFound(field)
    ? <p className="ui-missing"><CircleAlert />Not found on your resume</p>
    : null);

  const max = options.max_skills;
  const full = form.skills.length >= max;
  const extras = form.skills.filter((skill) => !options.skills.includes(skill));

  return (
    <div className="ui-app">
      {header}
      <main className="ob-main">
        <form className="ob-column" onSubmit={finish} noValidate>
          <div className="ob-heading">
            <p className="ui-overline">Step 3 of 3</p>
            <h1 className="ui-h2">Check your details</h1>
            <p className="ui-lead">
              {waiting ? 'We are reading your resume. Your details will appear here in a moment, and you can change anything.'
                : status === 'failed' ? 'We could not read your resume this time, so please fill these in yourself. Your resume and your pitch are saved.'
                : 'These came from your resume. Change anything that is not right, then pick your field of study.'}
            </p>
          </div>

          {/* The pitch they just recorded. It never plays on its own. */}
          <section className="ui-card ob-card rv-video" aria-labelledby="pitch-title">
            <div>
              <h2 id="pitch-title" className="ui-h4">Your pitch</h2>
              <p className="ui-text-soft">
                {video ? `${video.title} · ${formatDuration(video.duration_seconds)}` : 'No pitch video found.'}
                {video?.description ? ` · ${video.description}` : ''}
              </p>
            </div>
            <VideoPoster size="tile" src={video?.url} kind="Pitch" seconds={video?.duration_seconds}
              name={user.name} label="your pitch video" emptyText="No pitch video yet" />
          </section>

          <section className="ui-card ob-card" aria-labelledby="details-title">
            <div className="rv-head">
              <h2 id="details-title" className="ui-h4">From your resume</h2>
              {waiting && (
                <p className="rv-reading" role="status">
                  <span className="rv-dots" aria-hidden="true"><i /><i /><i /></span>
                  Reading your resume…
                </p>
              )}
            </div>

            <SearchSelect label="University" value={form.university} onChange={set('university')}
              placeholder="Search for your university" options={options.universities} error={errors.university}
              note={missing('university')}
              help={errors.university ? undefined : 'Type to search. If yours is not listed, add it.'} />

            <div className="ob-grid">
              <SearchSelect label="Field of study" value={form.field_of_study} onChange={set('field_of_study')}
                placeholder="Search for your field" options={options.fields_of_study} error={errors.field_of_study}
                help={errors.field_of_study ? undefined : 'You choose this one: recruiters filter on it exactly.'} />
              <SelectField label="Year of study" value={form.year} onChange={set('year')}
                placeholder="Select a year" options={list(options.years, yearLabel)} error={errors.year} />
            </div>
            {notFound('year') && <p className="ui-missing"><CircleAlert />Year of study not found on your resume</p>}

            <div className="ob-grid">
              <TextField label="GPA" value={form.gpa} onChange={(event) => set('gpa')(event.target.value)}
                inputMode="decimal" placeholder="3.45" error={errors.gpa}
                help={errors.gpa ? undefined : 'Out of 4.00.'} />
              <SelectField label="Internships completed" value={form.internships} onChange={set('internships')}
                placeholder="Select a number" options={list(options.internships, (n) => (n === 5 ? '5 or more' : String(n)))}
                error={errors.internships} />
            </div>
            <div className="ob-grid rv-missing">
              {notFound('gpa') && <p className="ui-missing"><CircleAlert />GPA not found on your resume</p>}
              {notFound('internships') && <p className="ui-missing"><CircleAlert />Internships not found on your resume</p>}
            </div>
          </section>

          <section className="ui-card ob-card" aria-labelledby="skills-title">
            <div className="ui-card__head">
              <h2 id="skills-title" className="ui-h5">Skills</h2>
              <span className={`ob-counter${full ? ' is-full' : ''}`} aria-live="polite">{form.skills.length} of {max} selected</span>
            </div>
            <p className="ui-text-soft">Pick up to {max}. Recruiters filter on these exact names, and each matching skill adds to your score.</p>
            <div className="ui-chips" role="group" aria-labelledby="skills-title">
              {options.skills.map((skill) => {
                const selected = form.skills.includes(skill);
                const Icon = selected ? Check : Plus;
                return (
                  <button key={skill} type="button" className="ui-chip" aria-pressed={selected}
                    disabled={!selected && full} onClick={() => toggleSkill(skill)}>
                    <Icon aria-hidden="true" />{skill}
                  </button>
                );
              })}
              {/* A skill read from the resume that is not one of the fixed options yet. */}
              {extras.map((skill) => (
                <button key={skill} type="button" className="ui-chip" aria-pressed="true"
                  onClick={() => toggleSkill(skill)}>
                  <Check aria-hidden="true" />{skill}
                </button>
              ))}
            </div>
            {errors.skills && <p className="ui-field-error" role="alert">{errors.skills}</p>}
          </section>

          {errors.form && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{errors.form}</p>}

          <div className="ob-actions">
            <Button variant="ghost" size="lg" to="/onboarding/video">Back to my pitch</Button>
            <Button type="submit" variant="primary" size="lg" icon={Check} disabled={busy}>
              {busy ? 'Saving…' : 'Finish and see my profile'}
            </Button>
          </div>
        </form>
      </main>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
