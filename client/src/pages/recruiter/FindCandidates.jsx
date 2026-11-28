// Figma "P7 · Find candidates" and "P7 · Find candidates · cleared (after Clear all)".
// UI by Nusrat Begam (6638009). The live preview and "Show N matches" use the matching
// endpoints (Responsibility 5). Saving the filter to the recruiter's account is
// Responsibility 4 (Siwakorn P.); saved searches are Responsibility 6 (Aye Myo Myat).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, Bookmark, Check, CircleAlert, Plus, Search } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import { Button, SelectField, TextField, Toast } from '../../components/ui/primitives.jsx';
import { EMPTY_FILTER, fromApi, fromSearch, toQuery } from '../../utils/filters.js';
import { tidyGpa } from '../../utils/format.js';

const RANKING = [
  ['60 pts', 'Skills: share of your skills they have'],
  ['20 pts', 'GPA on a 4.00 scale'],
  ['20 pts', 'Internships, counted up to 3'],
];

function gpaProblem(value) {
  const tidy = tidyGpa(value);
  if (tidy === '') return null;
  return /^\d\.\d{2}$/.test(tidy) && Number(tidy) <= 4 ? null : 'Enter a GPA from 0.00 to 4.00';
}

function Funnel({ label, count, total, accent }) {
  return (
    <div className="fc-funnel">
      <div className="fc-funnel__line"><span>{label}</span><strong>{count}</strong></div>
      <div className="ui-meter ui-meter--full"><div className={`ui-meter__bar${accent ? '' : ' fc-funnel__bar--muted'}`} style={{ width: `${total ? (count / total) * 100 : 0}%` }} /></div>
    </div>
  );
}

export default function FindCandidates() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [options, setOptions] = useState(null);
  const [filter, setFilter] = useState(() => fromSearch(searchParams));
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  // Options, plus the recruiter's saved search when the URL does not carry one.
  useEffect(() => {
    let active = true;
    api.get('/options').then((opts) => { if (active) setOptions(opts); }).catch((err) => active && setError(err.message));
    if (!fromSearch(searchParams)) {
      api.get('/filters/me')
        .then((saved) => { if (active) setFilter(fromApi(saved)); })
        .catch(() => { if (active) setFilter(EMPTY_FILTER); });
    }
    return () => { active = false; };
  }, [searchParams]);

  const gpaError = filter ? gpaProblem(filter.min_gpa) : null;
  const query = useMemo(() => (filter && !gpaError ? toQuery(filter) : null), [filter, gpaError]);

  // Live preview, debounced while the recruiter changes the form.
  useEffect(() => {
    if (!query) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      api.get(`/matching/preview?${query}`).then((counts) => { if (active) setPreview(counts); })
        .catch((err) => { if (active) setError(err.message); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  if (!filter || !options) {
    return (
      <div className="ui-app"><AppHeader /><main className="ui-main fc-main" aria-busy="true">
        <span className="ui-skeleton" style={{ height: 470, borderRadius: 12 }} />
        <span className="ui-skeleton fc-side-skeleton" style={{ height: 190, borderRadius: 12 }} />
      </main></div>
    );
  }

  const set = (field) => (value) => setFilter((current) => ({ ...current, [field]: value }));
  const toggleSkill = (skill) => setFilter((current) => ({
    ...current,
    skills: current.skills.includes(skill) ? current.skills.filter((s) => s !== skill) : [...current.skills, skill],
  }));
  const max = options.max_skills;
  const year = Number(filter.min_year) || 1;
  const gpa = Number(tidyGpa(filter.min_gpa)) || 0;
  const internships = Number(filter.min_internships) || 0;
  // Matching is soft now: full matches first, then close ones. So any single thing set is
  // enough to search on; a skill is no longer required.
  const hasAny = filter.skills.length > 0 || !!filter.field_of_study || year > 1 || gpa > 0 || internships > 0;
  // A close match meets one must-have and misses another, so there can only be close matches
  // when at least two must-haves are set.
  const mustHaves = [!!filter.field_of_study, year > 1, gpa > 0, internships > 0].filter(Boolean).length;
  const lastStep = [gpa > 0 && `GPA ${gpa.toFixed(2)}+`, internships > 0 && `${internships}+ internship${internships === 1 ? '' : 's'}`]
    .filter(Boolean).join(' and ') || 'Any GPA and internships';

  async function saveSearch() {
    // Saved searches are Responsibility 6 (Aye Myo Myat): POST /api/saved/searches.
    const name = [filter.field_of_study || 'Any field', ...filter.skills.slice(0, 2)].join(', ');
    try {
      await api.post('/saved/searches', { name, field_of_study: filter.field_of_study || null, min_year: year, min_gpa: gpa,
        min_internships: internships, skills: filter.skills });
      setToast({ title: 'Search saved', message: 'Run it again any time from Saved.' });
    } catch (err) {
      setToast({ title: 'Search not saved', tone: 'error',
        message: err.status === 404 || err.status === 405 ? 'Saved searches are not connected yet (Responsibility 6).' : err.message });
    }
  }

  async function showMatches(event) {
    event.preventDefault();
    if (!hasAny || gpaError) return;
    try {
      await api.put('/filters/me', {
        field_of_study: filter.field_of_study || null,
        min_year: year,
        min_gpa: gpa,
        min_internships: internships,
        skills: filter.skills,
      });
    } catch {
      // Save failed — still navigate so the recruiter sees results.
    }
    navigate(`/results?${toQuery(filter)}`);
  }

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main fc-main">
        <form className="ui-card fc-form" onSubmit={showMatches} noValidate>
          <div className="fc-heading">
            <h1 className="ui-h2">Find candidates</h1>
            <p className="ui-lead">Set the must-haves. Everyone who passes them is ranked by match score, best first.</p>
          </div>

          <section className="fc-section" aria-labelledby="must-title">
            <h2 id="must-title" className="ui-score__label">Must-haves (hard filters)</h2>
            <div className="ob-row">
              <SelectField label="Field of study" value={filter.field_of_study} onChange={set('field_of_study')} placeholder="Choose…" allowEmpty
                options={options.fields_of_study.map((f) => ({ value: f, label: f }))} />
              <SelectField label="Minimum year" value={filter.min_year} onChange={(v) => set('min_year')(v === '' ? '' : Number(v))} placeholder="Choose…" allowEmpty
                options={options.years.filter((y) => y > 1).map((y) => ({ value: y, label: y === 5 ? 'Graduated' : `Year ${y} or above` }))} />
            </div>
            <div className="ob-row">
              <TextField label="Minimum GPA" value={filter.min_gpa} onChange={(e) => set('min_gpa')(e.target.value)}
                onBlur={() => set('min_gpa')(tidyGpa(filter.min_gpa))}
                inputMode="decimal" autoComplete="off" help="From 0.00 to 4.00" error={gpaError} />
              <SelectField label="Minimum internships" value={filter.min_internships} onChange={(v) => set('min_internships')(v === '' ? '' : Number(v))} placeholder="Choose…" allowEmpty
                options={options.internships.filter((n) => n > 0).map((n) => ({ value: n, label: `${n} or more` }))} />
            </div>
          </section>

          <section className="fc-section fc-section--skills" aria-labelledby="skills-title">
            <div className="ui-card__head">
              <h2 id="skills-title" className="ui-score__label">Skills you need</h2>
              <span className="ob-counter" aria-live="polite">{filter.skills.length} selected</span>
            </div>
            <p className="ui-text-soft">Pick 1–{max}. Skills are scored, not required: matching all of them is worth 60 points.</p>
            <div className="ui-chips" role="group" aria-labelledby="skills-title">
              {options.skills.map((skill) => {
                const selected = filter.skills.includes(skill);
                const Icon = selected ? Check : Plus;
                return (
                  <button key={skill} type="button" className="ui-chip" aria-pressed={selected}
                    disabled={!selected && filter.skills.length >= max} onClick={() => toggleSkill(skill)}>
                    <Icon aria-hidden="true" />{skill}
                  </button>
                );
              })}
            </div>
          </section>

          {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

          <div className="fc-actions">
            <Button variant="ghost" size="md" onClick={() => setFilter(EMPTY_FILTER)}>Clear all</Button>
            <div className="fc-actions__right">
              <Button variant="secondary" size="lg" icon={Bookmark} onClick={saveSearch} disabled={!hasAny || !!gpaError}>
                Save this search
              </Button>
              <Button type="submit" variant="primary" size="lg" icon={Search} disabled={!hasAny || !!gpaError}>
                {!hasAny || !preview ? 'Show matches'
                  : preview.passing > 0 ? `Show ${preview.passing} ${preview.passing === 1 ? 'match' : 'matches'}`
                  : mustHaves >= 2 ? 'Show closest matches' : 'Show matches'}
              </Button>
            </div>
          </div>
        </form>

        <aside className="fc-side">
          <section className="ui-card" aria-labelledby="preview-title" aria-live="polite">
            <h2 id="preview-title" className="ui-score__label">Live preview</h2>
            {hasAny ? (
              <>
                <p className="fc-count"><strong>{preview?.passing ?? '–'}</strong>{preview?.passing === 1 ? 'applicant passes' : 'applicants pass'} your must-haves</p>
                {preview && (
                  <>
                    <Funnel label={filter.field_of_study || 'Any field of study'} count={preview.field} total={preview.total} />
                    <Funnel label={year > 1 ? (year === 5 ? 'Graduated' : `Year ${year} or above`) : 'Any year'} count={preview.field_and_year} total={preview.total} />
                    <Funnel label={lastStep} count={preview.passing} total={preview.total} accent />
                  </>
                )}
              </>
            ) : (
              <p className="fc-count"><strong>{preview?.total ?? '–'}</strong>Set at least one filter to see matches</p>
            )}
          </section>

          <section className="ui-card" aria-labelledby="ranking-title">
            <div className="pf-privacy__head"><BarChart3 aria-hidden="true" /><h2 id="ranking-title" className="ui-h5">How ranking works</h2></div>
            {RANKING.map(([points, text]) => (
              <div className="fc-part" key={text}><span className="fc-points">{points}</span><span className="ui-text-soft">{text}</span></div>
            ))}
            <p className="ui-text-xs ui-text-muted">Ties are broken by GPA, then by the newest profile. No photos, gender or age are used.</p>
          </section>
        </aside>
      </main>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
