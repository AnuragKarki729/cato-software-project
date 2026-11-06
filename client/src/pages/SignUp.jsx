// Responsibility 7 — Aye Myo Myat (6837919)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { homeFor, useAuth } from '../context/AuthContext.jsx';

const inputClass = 'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2';
export default function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'applicant', company_name: '' });
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await api.post('/auth/signup', form);
      setCreated(true);
      const user = await login(form.email, form.password);
      navigate(homeFor(user), { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="card mx-auto max-w-md space-y-5">
    <div><p className="text-sm font-semibold text-brand-700">Cato · Better hires, brighter futures</p><h1 className="mt-2">Create your account</h1></div>
    {created ? <p role="status">Your account was created. <Link className="nav-link underline" to="/login">Log in to continue</Link>.</p> :
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium">Name<input className={inputClass} name="name" autoComplete="name" maxLength={100} required value={form.name} onChange={change} /></label>
      <label className="block text-sm font-medium">Email<input className={inputClass} name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={change} /></label>
      <label className="block text-sm font-medium">Password<input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={form.password} onChange={change} /><span className="mt-1 block text-xs text-ink-muted">Use at least 8 characters.</span></label>
      <fieldset><legend className="mb-2 text-sm font-medium">I am an</legend><div className="flex gap-5">{['applicant', 'recruiter'].map(role => <label className="flex items-center gap-2 capitalize" key={role}><input type="radio" name="role" value={role} checked={form.role === role} onChange={change} />{role}</label>)}</div></fieldset>
      {form.role === 'recruiter' && <label className="block text-sm font-medium">Company name<input className={inputClass} name="company_name" autoComplete="organization" maxLength={150} required value={form.company_name} onChange={change} /></label>}
      <button className="btn-primary w-full disabled:opacity-50" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <p className="text-sm text-ink-soft">Already have an account? <Link className="nav-link underline" to="/login">Log in</Link></p>
  </section>;
}
