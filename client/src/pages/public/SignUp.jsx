// Responsibility 7 — Aye Myo Myat (6837919): sign-up logic.
// UI from Figma "P2 · Sign up" — Nusrat Begam (6638009).
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, Building2, Check, CircleAlert, GraduationCap, Lock, Mail, User } from 'lucide-react';
import { api } from '../../api';
import { homeFor, useAuth } from '../../context/AuthContext.jsx';
import AuthShell from '../../components/AuthShell.jsx';
import { Button, Checkbox, TextField } from '../../components/ui/primitives.jsx';

const ROLES = [
  { value: 'applicant', icon: GraduationCap, title: 'An applicant', text: 'Student or fresh graduate looking for a role.' },
  { value: 'recruiter', icon: Briefcase, title: 'A recruiter', text: 'Hiring for my company. Adds a company field.' },
];

const SignUp = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'applicant';
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: initialRole, company_name: '', sharing_consent: false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (name) => (value) => setForm((previous) => ({ ...previous, [name]: value }));
  const change = (event) => set(event.target.name)(event.target.value);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/signup', form);
      const user = await login(form.email, form.password);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Your next role starts with a 30-second hello."
      lead="One profile, one pitch, and recruiters who hire on skills and fit."
      switchLabel="Log in" switchTo={`/login?role=${form.role}`}>
      <form className="au-stack" onSubmit={submit}>
        <div className="au-heading">
          <h1 className="ui-h2">Create your account</h1>
          <p className="ui-text-soft au-desktop">Already have an account? <Link className="ui-link" to={`/login?role=${form.role}`}>Log in</Link></p>
          <p className="ui-text-soft au-mobile">Choose your side first: applicants build a profile, recruiters search.</p>
        </div>

        <fieldset className="au-roles" disabled={busy}>
          <legend className="ui-label au-desktop">I am signing up as</legend>
          <div className="au-roles__options">
            {ROLES.map(({ value, icon: Icon, title, text }) => (
              <label key={value} className={`au-role${form.role === value ? ' is-selected' : ''}`}>
                <input type="radio" name="role" value={value} checked={form.role === value} onChange={change} />
                <span className="au-role__icon"><Icon aria-hidden="true" /></span>
                <span className="au-role__text"><strong>{title}</strong><span>{text}</span></span>
                <span className="au-role__radio" aria-hidden="true"><Check /></span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="au-fields">
          <TextField label="Full name" icon={User} name="name" autoComplete="name" maxLength={100} required
            value={form.name} onChange={change} disabled={busy} />
          <TextField label="Email address" icon={Mail} name="email" type="email" autoComplete="email" maxLength={254} required
            value={form.email} onChange={change} disabled={busy} />
          <TextField label="Password" icon={Lock} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128}
            required value={form.password} onChange={change} disabled={busy} help="At least 8 characters, including a number." />
          {form.role === 'recruiter' && (
            <TextField label="Company name" icon={Building2} name="company_name" autoComplete="organization" maxLength={150} required
              value={form.company_name} onChange={change} disabled={busy} />
          )}
        </div>

        {form.role === 'applicant' && (
          <Checkbox name="sharing_consent" required checked={form.sharing_consent} onChange={set('sharing_consent')} disabled={busy}
            label="I agree to share my profile and videos with recruiters on Cato"
            description="Required by PDPA. You can withdraw consent and delete your data at any time." />
        )}

        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}
        <Button type="submit" variant="primary" size="lg" block disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
        <p className="ui-text-xs ui-text-muted au-desktop">By creating an account you agree to the Terms and the PDPA notice.</p>
        <p className="ui-text-soft au-mobile au-center">Already have an account? <Link to={`/login?role=${form.role}`}>Log in</Link></p>
      </form>
    </AuthShell>
  );
};

export default SignUp;
