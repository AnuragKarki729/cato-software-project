// Responsibility 7 — Aye Myo Myat (6837919)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import AuthLayout, { AuthField } from '../components/AuthLayout.jsx';
import Icon from '../components/Icon.jsx';

export default function LogIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, sessionError } = useAuth();
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const user = await login(email, password); navigate(homeFor(user), { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <AuthLayout>
    <h1 className="text-[24px] leading-8 lg:text-[26px]">Log in</h1>
    <p className="mt-1 hidden text-xs text-ink-soft lg:block">New to Cato? <Link className="font-semibold text-brand-700" to="/signup">Create an account</Link></p>
    <p className="mt-3 text-[13px] text-ink-soft lg:hidden">Log in to see your profile or your candidates.</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <AuthField label="Email address" icon="mail" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
      <AuthField label="Password" icon="lock" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
      {(error || sessionError) && <p className="text-xs text-red-600" role="alert">{error || sessionError}</p>}
      <button className="h-11 w-full rounded-md bg-ink text-sm text-white transition hover:bg-slate-800 disabled:opacity-50" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
    </form>
    <p className="mt-5 hidden items-center gap-2 rounded-lg bg-slate-100 p-3 text-xs text-ink-soft lg:flex"><Icon name="circleCheck" />Applicants land on My profile; recruiters land on Find candidates.</p>
    <p className="mt-5 text-center text-xs text-ink-soft lg:hidden">New to Cato? <Link to="/signup">Create an account</Link></p>
  </AuthLayout>;
}
