// Responsibility 7 — Aye Myo Myat (6837919)
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { homeFor, useAuth } from '../../context/AuthContext.jsx';

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

  const change = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  };

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
    <div className="container">
      <h1 className="center">Sign up as {form.role}</h1>
      <p className="muted">Aye Myo Myat, 6837919</p>
      <p className="muted">Responsibility 7 (Sign up, log in and roles)</p>

      <form className="card stack" onSubmit={submit}>
        <fieldset className="field" disabled={busy}>
          <legend>I am signing up as</legend>
          <label>
            <input type="radio" name="role" value="applicant" checked={form.role === 'applicant'} onChange={change} /> Applicant
          </label>
          <label>
            <input type="radio" name="role" value="recruiter" checked={form.role === 'recruiter'} onChange={change} /> Recruiter
          </label>
        </fieldset>

        <label className="field">
          Full name
          <input className="input" name="name" autoComplete="name" maxLength={100} required value={form.name} onChange={change} />
        </label>
        <label className="field">
          Email address
          <input className="input" name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={change} />
        </label>
        <label className="field">
          Password
          <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={form.password} onChange={change} />
          <span className="muted">At least 8 characters, including a number.</span>
        </label>

        {form.role === 'recruiter' && (
          <label className="field">
            Company name
            <input className="input" name="company_name" autoComplete="organization" maxLength={150} required value={form.company_name} onChange={change} />
          </label>
        )}

        {form.role === 'applicant' && (
          <label>
            <input type="checkbox" name="sharing_consent" required checked={form.sharing_consent} onChange={change} />{' '}
            I agree to share my profile and videos with recruiters on Cato
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="muted center">Already have an account? <Link to={`/login?role=${form.role}`}>Log in</Link></p>
      </form>
    </div>
  );
};

export default SignUp;
