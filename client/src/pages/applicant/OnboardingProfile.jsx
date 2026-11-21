// Responsibility 2: Applicant profile and resume — Nusrat Begam (6638009)
// Figma "P4a · Onboarding – profile & resume". With `editing`, the same form is the
// "Edit profile" page reached from My profile.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CircleAlert, Plus } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import ResumeUpload from '../../components/ui/ResumeUpload.jsx';
import ResumeViewer from '../../components/ui/ResumeViewer.jsx';
import { Button, Logo, SelectField, TextField, Toast } from '../../components/ui/primitives.jsx';
import { yearLabel } from '../../utils/format.js';

const EMPTY = { university: '', field_of_study: '', year: '', gpa: '', internships: '', skills: [] };

function Stepper() {
  return (
    <ol className="ui-stepper" aria-label="Onboarding steps">
      <li className="ui-step is-current" aria-current="step">
        <span className="ui-step__dot">1</span>
        <span className="ui-step__text"><small>Step 1</small><strong>Profile &amp; resume</strong></span>
      </li>
      <li aria-hidden="true" className="ui-step__line" />
      <li className="ui-step">
        <span className="ui-step__dot">2</span>
        <span className="ui-step__text"><small>Step 2</small><strong>Pitch video</strong></span>
      </li>
    </ol>
  );
}

const toForm = (profile) => profile ? {
  university: profile.university ?? '',
  field_of_study: profile.field_of_study ?? '',
  year: profile.year ?? '',
  gpa: profile.gpa === null || profile.gpa === undefined ? '' : Number(profile.gpa).toFixed(2),
  internships: profile.internships ?? '',
  skills: profile.skills ?? [],
} : EMPTY;

const numberOrNull = (value) => (value === '' || value === null ? null : Number(value));

export default function OnboardingProfile({ editing = false }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState(null);
  const [viewing, setViewing] = useState(false);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/options'),
      api.get('/profiles/me').catch((err) => { if (err.status === 404) return null; throw err; }),
    ]).then(([opts, mine]) => {
      if (!active) return;
      setOptions(opts);
      setProfile(mine);
      setForm(toForm(mine));
    }).catch((err) => { if (active) setLoadError(err.message); });
    return () => { active = false; };
  }, []);

  const set = (field) => (value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const toggleSkill = (skill) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill) ? current.skills.filter((s) => s !== skill) : [...current.skills, skill],
    }));
    setErrors((current) => ({ ...current, skills: undefined, form: undefined }));
  };

  function gpaError(value) {
    if (value === '') return null;
    if (!/^\d(\.\d{1,2})?$/.test(value.trim()) || Number(value) > 4) return 'Enter a GPA from 0.00 to 4.00, with up to two decimals';
    return null;
  }

  function payload() {
    return {
      university: form.university || null,
      field_of_study: form.field_of_study || null,
      year: numberOrNull(form.year),
      gpa: form.gpa.trim() === '' ? null : Number(form.gpa),
      internships: numberOrNull(form.internships),
      skills: form.skills,
    };
  }

  function validateAll() {
    const next = {};
    if (!form.university) next.university = 'Select your university';
    if (!form.field_of_study) next.field_of_study = 'Select your field of study';
    if (form.year === '') next.year = 'Select your year of study';
    if (form.gpa.trim() === '') next.gpa = 'Enter your GPA';
    else if (gpaError(form.gpa)) next.gpa = gpaError(form.gpa);
    if (form.internships === '') next.internships = 'Select how many internships you have done';
    if (form.skills.length === 0) next.skills = 'Pick at least one skill';
    if (!profile?.resume_url) next.resume = 'Upload your resume as a PDF';
    return next;
  }

  async function saveDraft() {
    const invalidGpa = gpaError(form.gpa);
    if (invalidGpa) { setErrors({ gpa: invalidGpa }); return false; }
    setBusy('draft');
    try {
      setProfile(await api.put('/profiles/me/draft', payload()));
      return true;
    } catch (err) {
      setErrors({ form: err.message });
      return false;
    } finally {
      setBusy('');
    }
  }

  async function handleDraft() {
    if (await saveDraft()) setToast({ title: 'Draft saved', message: 'You can finish your profile any time.' });
  }

  async function handleSaveAndExit() {
    if (!(await saveDraft())) return;
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validateAll();
    setErrors(next);
    if (Object.keys(next).length) {
      // Wait for the error messages to render, then bring the first one into view.
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"], .ui-field-error')
        ?.closest('.ui-field, .ui-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setBusy('save');
    try {
      await api.put('/profiles/me', payload());
      navigate(editing ? '/profile' : '/onboarding/video', editing ? { state: { toast: 'Profile saved' } } : undefined);
    } catch (err) {
      setErrors({ form: err.message });
      setBusy('');
    }
  }

  function onResumeChange(updated, action) {
    setProfile(updated);
    setErrors((current) => ({ ...current, resume: undefined }));
    setToast(action === 'removed' ? { title: 'Resume removed' } : { title: 'Resume uploaded', message: 'Recruiters can open it from your profile.' });
  }

  const header = editing ? <AppHeader /> : (
    <header className="ob-header">
      <Logo />
      <Stepper />
      <Button variant="ghost" size="md" onClick={handleSaveAndExit} disabled={!!busy || !options}>Save and exit</Button>
    </header>
  );

  if (loadError) {
    return <div className="ui-app">{header}<main className="ob-main"><div className="ob-column"><p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{loadError}</p></div></main></div>;
  }
  if (!options) {
    return <div className="ui-app">{header}<main className="ob-main"><div className="ob-column" aria-busy="true">
      <span className="ui-skeleton" style={{ height: 116 }} />
      <span className="ui-skeleton" style={{ height: 402 }} />
      <span className="ui-skeleton" style={{ height: 250 }} />
    </div></main></div>;
  }

  const list = (values, label = String) => values.map((value) => ({ value, label: label(value) }));
  const max = options.max_skills;
  const full = form.skills.length >= max;

  return (
    <div className="ui-app">
      {header}
      <main className="ob-main">
        <form className="ob-column" onSubmit={handleSubmit} noValidate>
          <div className="ob-heading">
            <p className="ui-overline">{editing ? 'My profile' : 'Step 1 of 2'}</p>
            <h1 className="ui-h2">{editing ? 'Edit your profile' : 'Tell recruiters about you'}</h1>
            <p className="ui-lead">
              These answers use fixed options, so a recruiter’s filters match you exactly.
              {editing ? ' Changes show up in searches straight away.' : ' You can change them later on My profile.'}
            </p>
          </div>

          <section className="ui-card ob-card" aria-labelledby="education-title">
            <h2 id="education-title" className="ui-h5">Education</h2>
            <div className="ob-grid">
              <SelectField label="University" value={form.university} onChange={set('university')} placeholder="Select your university"
                options={list(options.universities)} help="Shown on your profile; not used for matching" error={errors.university} required />
              <div className="ob-row">
                <SelectField label="Field of study" value={form.field_of_study} onChange={set('field_of_study')} placeholder="Select a field"
                  options={list(options.fields_of_study)} help="Pick the closest match" error={errors.field_of_study} required />
                <SelectField label="Year of study" value={form.year} onChange={set('year')} placeholder="Select a year"
                  options={list(options.years, yearLabel)} error={errors.year} required />
              </div>
              <div className="ob-row">
                <TextField label="GPA" value={form.gpa} onChange={(event) => set('gpa')(event.target.value)}
                  onBlur={() => setErrors((current) => ({ ...current, gpa: gpaError(form.gpa) || undefined }))}
                  inputMode="decimal" placeholder="e.g. 3.62" autoComplete="off" required
                  help="On a 4.00 scale, two decimals" error={errors.gpa} />
                <SelectField label="Internships completed" value={form.internships} onChange={set('internships')} placeholder="Select a number"
                  options={list(options.internships, (n) => (n >= 5 ? '5 or more' : String(n)))}
                  help="Count internships of 4 weeks or more" error={errors.internships} required />
              </div>
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
            </div>
            {errors.skills && <p className="ui-field-error" role="alert">{errors.skills}</p>}
          </section>

          <section className="ui-card ob-card" aria-labelledby="resume-title">
            <h2 id="resume-title" className="ui-h5">Resume</h2>
            <p className="ui-text-soft">One PDF, up to 5 MB. Recruiters open it from your profile inside Cato.</p>
            <ResumeUpload profile={profile} onChange={onResumeChange} onOpen={() => setViewing(true)}
              onError={(message) => setToast({ title: 'Resume not uploaded', message, tone: 'error' })} />
            {errors.resume && <p className="ui-field-error ob-resume-error" role="alert">{errors.resume}</p>}
          </section>

          {errors.form && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{errors.form}</p>}

          <div className="ob-actions">
            {editing ? (
              <Button variant="ghost" size="lg" to="/profile">Cancel</Button>
            ) : (
              <Button variant="ghost" size="lg" onClick={handleDraft} disabled={!!busy}>{busy === 'draft' ? 'Saving…' : 'Save draft'}</Button>
            )}
            <Button type="submit" variant="primary" size="lg" icon={editing ? Check : ArrowRight} disabled={!!busy}>
              {busy === 'save' ? 'Saving…' : editing ? 'Save changes' : 'Continue to pitch video'}
            </Button>
          </div>
        </form>
      </main>
      {viewing && profile?.resume_url && <ResumeViewer url={profile.resume_url} name={profile.resume_name} onClose={() => setViewing(false)} />}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
