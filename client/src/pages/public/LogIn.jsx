// Responsibility 7 — Aye Myo Myat (6837919)
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { homeFor, useAuth } from '../../context/AuthContext.jsx';

const LogIn = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'applicant';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, sessionError } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(email, password);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <h1 className="center">Log in as {role}</h1>
      <p className="muted">Aye Myo Myat, 6837919</p>
      <p className="muted">Responsibility 7 (Sign up, log in and roles)</p>

      <form className="card stack" onSubmit={submit}>
        <label className="field">
          Email address
          <input className="input" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Password
          <input className="input" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {(error || sessionError) && <p className="error" role="alert">{error || sessionError}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="muted center">New to Cato? <Link to={`/signup?role=${role}`}>Create an account</Link></p>
        <p className="muted center">Demo accounts: anurag@cato.test, nusrat@cato.test, aye@cato.test, siwakorn@cato.test (password1)</p>
      </form>
    </div>
  );
};

export default LogIn;
