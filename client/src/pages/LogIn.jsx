// Responsibility 7 — Aye Myo Myat (6837919)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';

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
  return <section className="card mx-auto max-w-md space-y-5">
    <div><p className="text-sm font-semibold text-brand-700">Cato · Better hires, brighter futures</p><h1 className="mt-2">Welcome back</h1><p className="mt-2 text-ink-soft">Log in to your workspace.</p></div>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">Email<input type="email" autoComplete="email" className="mt-1 w-full rounded-lg border border-line px-3 py-2" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="block text-sm font-medium">Password<input type="password" autoComplete="current-password" className="mt-1 w-full rounded-lg border border-line px-3 py-2" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button className="btn-primary w-full disabled:opacity-50" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
    </form>
    {(error || sessionError) && <p className="text-sm text-red-600" role="alert">{error || sessionError}</p>}
    <p className="text-sm text-ink-soft">New to Cato? <Link className="nav-link underline" to="/signup">Create an account</Link></p>
  </section>;
}
