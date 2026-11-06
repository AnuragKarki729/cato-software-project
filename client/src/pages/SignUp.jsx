// Responsibility 7 — Aye Myo Myat (6837919)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import AuthLayout, { AuthField } from '../components/AuthLayout.jsx';
import Icon from '../components/Icon.jsx';

export default function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'applicant', company_name: '', sharing_consent: false });
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
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
  return <AuthLayout signup>
    <h1 className="text-[24px] leading-8 lg:text-[26px]">Create your account</h1>
    <p className="mt-3 text-[13px] leading-5 text-ink-soft lg:hidden">Choose your side first: applicants build a profile, recruiters search.</p>
    <p className="mt-1 hidden text-xs text-ink-soft lg:block">Already have an account? <Link className="font-semibold text-brand-700" to="/login">Log in</Link></p>
    {created ? <p className="mt-6 text-sm" role="status">Your account was created. <Link className="text-brand-700 underline" to="/login">Log in to continue</Link>.</p> :
    <form className="mt-5 space-y-5" onSubmit={submit}>
      <fieldset disabled={busy}><legend className="mb-2 hidden text-xs lg:block">I am signing up as</legend><div className="grid gap-2.5 lg:grid-cols-2">
        {[['applicant', 'An applicant', 'Student or fresh graduate looking for a role.', 'graduate'], ['recruiter', 'A recruiter', 'Hiring for my company. Adds a company field.', 'briefcase']].map(([role, title, description, icon]) => <label key={role} className={`relative flex cursor-pointer items-start gap-2.5 rounded-md border p-3.5 ${form.role === role ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-line bg-surface'}`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${form.role === role ? 'bg-brand-500 text-ink' : 'bg-slate-100 text-ink-soft'}`}><Icon name={icon} className="h-5 w-5" /></span>
          <span className="pr-3 text-xs leading-[17px]"><span className="block font-semibold">{title}</span><span className="mt-1 block text-ink-soft">{description}</span></span>
          <input className="peer sr-only" type="radio" name="role" value={role} checked={form.role === role} onChange={change} aria-label={role === 'applicant' ? 'Applicant' : 'Recruiter'} />
          <span className={`absolute top-3.5 right-3 flex h-4 w-4 items-center justify-center rounded-full border peer-focus-visible:ring-2 peer-focus-visible:ring-brand-700 ${form.role === role ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`}>{form.role === role && <Icon name="check" className="h-3 w-3" />}</span>
        </label>)}
      </div></fieldset>
      <div className="space-y-3.5">
        <AuthField label="Full name" icon="user" name="name" autoComplete="name" maxLength={100} required value={form.name} onChange={change} />
        <AuthField label="Email address" icon="mail" name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={change} />
        <AuthField label="Password" icon="lock" hint="At least 8 characters, including a number." name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={form.password} onChange={change} />
        {form.role === 'recruiter' && <AuthField label="Company name" icon="briefcase" name="company_name" autoComplete="organization" maxLength={150} required value={form.company_name} onChange={change} />}
      </div>
      {form.role === 'applicant' && <label className="flex items-start gap-2 text-[12px] leading-[17px]"><input className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand-500" type="checkbox" name="sharing_consent" required checked={form.sharing_consent} onChange={change} /><span>I agree to share my profile and videos with recruiters on Cato<span className="mt-0.5 block text-ink-muted">Your profile and videos will be visible to recruiters on Cato.</span></span></label>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <button className="h-11 w-full rounded-md bg-ink text-sm text-white transition hover:bg-slate-800 disabled:opacity-50" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>}
    {created && error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
    <p className="mt-4 text-center text-xs text-ink-soft lg:hidden">Already have an account? <Link to="/login">Log in</Link></p>
  </AuthLayout>;
}
