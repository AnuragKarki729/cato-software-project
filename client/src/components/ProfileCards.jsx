// Responsibility 1 — Anurag Karki (6838852): the two cards that sit in a row of videos.
//
// A candidate is a row of cards: their videos, then what their profile says, then their
// resume. These are the two that are not videos, shared so that the applicant's own page,
// their preview of it, and the recruiter's view of it are the same cards rather than three
// drawings of the same thing.
//
// `editable` turns the About card into a form, in place. It is for the applicant looking at
// their own profile: being sent to another page to change a value is what the preview exists
// to avoid. Saving goes through Responsibility 2's endpoint and schema; nothing here is new
// server work.
import { useEffect, useRef, useState } from 'react';
import { Briefcase, Calendar, Check, ExternalLink, FileText, GraduationCap, Pencil, RotateCcw, Star, Upload, X } from 'lucide-react';
import { api } from '../api.js';
import SearchSelect from './ui/SearchSelect.jsx';
import { Button, SelectField, Tag, TextField } from './ui/primitives.jsx';
import { gpaLabel, yearLabel } from '../utils/format.js';

const numberOrNull = (value) => (value === '' || value === null ? null : Number(value));
const asList = (values, label) => (values || []).map((v) => ({ value: String(v), label: label ? label(v) : String(v) }));

// Enough to render the form before GET /api/options answers. Not exported: a file that
// exports both a component and a constant breaks Vite's fast refresh, and a caller that has
// no options yet can simply leave the prop off.
const NO_OPTIONS = {
  universities: [], fields_of_study: [], skills: [],
  years: [1, 2, 3, 4, 5], internships: [0, 1, 2, 3, 4, 5], max_skills: 10,
};

/**
 * `onEditing` lets the page know the card has become a form, so it can stop a click on the
 * card from opening it in a dialog and throwing away what has been typed.
 *
 * `onRequestEdit` is for the small card in the row: there is no room to fill in a form that
 * size, so Edit asks the page to open this card full size instead of turning the little one
 * into a form. The page then renders the big copy with `startInEdit`, which opens it ready to
 * type. Left off — the big copy, or any other caller — Edit still edits in place.
 */
export function AboutCard({ profile, match, options = NO_OPTIONS, editable = false, onSaved, onEditing,
                            focusable = true, onRequestEdit, startInEdit = false }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const matched = new Set(match?.matched_skills || []);
  const skills = [...(profile.skills || [])].sort((a, b) => matched.has(b) - matched.has(a));
  const facts = [
    { icon: GraduationCap, label: 'Field of study', value: profile.field_of_study || '—' },
    { icon: Calendar, label: 'Year of study', value: yearLabel(profile.year) },
    { icon: Star, label: 'GPA', value: profile.gpa == null ? '—' : `${gpaLabel(profile.gpa)} / 4.00` },
    { icon: Briefcase, label: 'Internships', value: profile.internships ?? '—' },
  ];

  const startEdit = () => {
    setForm({
      university: profile.university || '',
      field_of_study: profile.field_of_study || '',
      year: profile.year == null ? '' : String(profile.year),
      gpa: profile.gpa == null ? '' : String(profile.gpa),
      internships: profile.internships == null ? '' : String(profile.internships),
      skills: [...(profile.skills || [])],
    });
    setError('');
    setEditing(true);
    onEditing?.(true);
  };

  const stopEdit = () => { setEditing(false); onEditing?.(false); };

  // Opened full size with Edit already pressed on the small card, so it arrives as a form
  // rather than making the applicant find the button a second time.
  useEffect(() => {
    if (startInEdit && editable && !editing) startEdit();
    // startEdit only reads props, and re-running on every render would fight Cancel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startInEdit, editable]);

  const setField = (key) => (value) => setForm((now) => ({ ...now, [key]: value }));
  const toggleSkill = (skill) => setForm((now) => ({
    ...now,
    skills: now.skills.includes(skill) ? now.skills.filter((s) => s !== skill) : [...now.skills, skill],
  }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      // The draft endpoint, not the strict one: someone editing a single value should not be
      // refused because the resume never yielded their GPA. The server works out from the
      // values whether the profile counts as complete.
      const updated = await api.put('/profiles/me/draft', {
        university: form.university || null,
        field_of_study: form.field_of_study || null,
        year: numberOrNull(form.year),
        gpa: numberOrNull(form.gpa),
        internships: numberOrNull(form.internships),
        skills: form.skills,
      });
      onSaved?.(updated);
      stopEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (editable && editing && form) {
    const full = form.skills.length >= (options.max_skills || 10);
    return (
      <div className="cp-sheet cp-sheet--about cp-sheet--edit">
        <p className="ui-score__label">About · editing</p>
        <SearchSelect label="University" value={form.university} onChange={setField('university')}
          placeholder="Search, or add yours" options={options.universities} />
        <SearchSelect label="Field of study" value={form.field_of_study} onChange={setField('field_of_study')}
          placeholder="Search for your field" options={options.fields_of_study} />
        <div className="cp-edit__pair">
          <SelectField label="Year" value={form.year} onChange={setField('year')}
            placeholder="Year" options={asList(options.years, yearLabel)} />
          <TextField label="GPA" value={form.gpa} inputMode="decimal" placeholder="3.45"
            onChange={(event) => setField('gpa')(event.target.value)} />
        </div>
        <SelectField label="Internships completed" value={form.internships} onChange={setField('internships')}
          placeholder="Select a number" options={asList(options.internships, (n) => (n === 5 ? '5 or more' : String(n)))} />

        <div className="cp-skills">
          <p>Skills ({form.skills.length} of {options.max_skills || 10})</p>
          {/* Added through the same growing vocabulary the onboarding review uses, rather than
              a grid of every known skill, which would not fit in a card. */}
          <SearchSelect label="Add a skill" value="" onChange={(skill) => { if (skill && !full) toggleSkill(skill); }}
            placeholder={full ? 'That is the maximum' : 'Search for a skill'} options={options.skills} />
          {form.skills.length > 0 && (
            <div className="ui-tags cp-edit__skills">
              {form.skills.map((skill) => (
                <button key={skill} type="button" className="ui-chip cp-skill-off"
                  onClick={() => toggleSkill(skill)} aria-label={`Remove ${skill}`}>
                  {skill}<X aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="ui-field-error" role="alert">{error}</p>}
        <div className="cp-edit__actions">
          <Button variant="primary" size="sm" icon={Check} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={stopEdit} disabled={saving}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-sheet cp-sheet--about">
      <div className="cp-sheet__head">
        <p className="ui-score__label">About</p>
        {editable && (
          <Button variant="secondary" size="sm" icon={Pencil} onClick={onRequestEdit || startEdit}
            tabIndex={focusable ? 0 : -1}>Edit</Button>
        )}
      </div>
      <div className="cp-facts">
        {facts.map(({ icon: Icon, label, value }) => (
          <div className="cp-fact" key={label}>
            <span><Icon aria-hidden="true" />{label}</span>
            <strong title={String(value)}>{value}</strong>
          </div>
        ))}
      </div>
      <div className="cp-skills">
        <p>{match ? 'Skills (matches in green)' : 'Skills'}</p>
        {skills.length ? (
          <div className="ui-tags">{skills.map((skill) => <Tag key={skill} match={matched.has(skill)}>{skill}</Tag>)}</div>
        ) : <p className="ui-text-muted">No skills listed.</p>}
      </div>
    </div>
  );
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** Picks a PDF and posts it, wherever a replace belongs: on the card, and in the viewer.
 *  One component so the validation and the request exist once. */
export function ReplaceResume({ onChange, onError, label = 'Replace resume', className, size = 'sm' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { onError?.('Please choose a PDF file.'); return; }
    if (file.size > MAX_RESUME_BYTES) { onError?.('Your resume must be 5 MB or smaller.'); return; }
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      onChange?.(await api.post('/profiles/me/resume', form), 'uploaded');
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden
        onChange={(event) => upload(event.target.files[0])} />
      <Button variant="secondary" size={size} icon={RotateCcw} className={className}
        disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Uploading…' : label}
      </Button>
    </>
  );
}

/**
 * The resume as a card: the page itself, with the file name along the bottom. Clicking it
 * opens the resume; `onChange` makes it the owner's card, which adds a replace button — shown
 * on hover with a mouse, and always on a touch screen, which has no hover to show it on.
 * With no resume yet the same card is how one is uploaded.
 */
export function ResumeCard({ profile, onOpen, onChange, onError, focusable = true }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const owner = typeof onChange === 'function';

  const upload = async (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { onError?.('Please choose a PDF file.'); return; }
    if (file.size > MAX_RESUME_BYTES) { onError?.('Your resume must be 5 MB or smaller.'); return; }
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      onChange(await api.post('/profiles/me/resume', form), 'uploaded');
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  if (!profile.resume_url) {
    if (!owner) return <div className="cp-sheet cp-sheet--resume cp-sheet--none"><p>No resume yet</p></div>;
    return (
      <div className="cp-sheet cp-sheet--resume cp-sheet--none">
        <input ref={input} type="file" accept="application/pdf,.pdf" hidden
          onChange={(event) => upload(event.target.files[0])} />
        <button type="button" className="cp-sheet__upload" disabled={busy}
          onClick={() => input.current?.click()} tabIndex={focusable ? 0 : -1}>
          <span className="cp-sheet__upload-icon"><Upload aria-hidden="true" /></span>
          <strong>{busy ? 'Uploading…' : 'Add your resume'}</strong>
          <span className="ui-text-xs ui-text-muted">PDF, up to 5 MB</span>
        </button>
      </div>
    );
  }

  return (
    <div className="cp-sheet cp-sheet--resume">
      {/* An iframe swallows every event, so the click lives on a layer above it. */}
      <iframe className="cp-sheet__page" src={`${profile.resume_url}#toolbar=0&navpanes=0&view=FitH`}
        title={profile.resume_name || 'Resume'} tabIndex={-1} />
      <button type="button" className="cp-sheet__open" onClick={onOpen}
        aria-label={`Open ${profile.resume_name || 'the resume'} full size`} tabIndex={focusable ? 0 : -1}>
        <span className="cp-sheet__name"><FileText aria-hidden="true" />{profile.resume_name || 'Resume.pdf'}</span>
        <span className="cp-sheet__hint"><ExternalLink aria-hidden="true" />Open full size</span>
      </button>
      {owner && (
        <div className="cp-sheet__replace">
          <ReplaceResume onChange={onChange} onError={onError} label="Replace resume" />
        </div>
      )}
    </div>
  );
}
