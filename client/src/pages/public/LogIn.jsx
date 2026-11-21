// Responsibility 7 — Aye Myo Myat (6837919): log-in logic.
// UI from Figma "P3 · Log in" — Nusrat Begam (6638009).
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleAlert, CircleCheck, Lock, Mail } from 'lucide-react';
import { homeFor, useAuth } from '../../context/AuthContext.jsx';
import AuthShell from '../../components/AuthShell.jsx';
import { Button, TextField } from '../../components/ui/primitives.jsx';

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
    <AuthShell title="Welcome back to better hiring."
      lead="Pick up where you left off: new invitations, fresh pitches and your saved searches."
      switchLabel="Sign up" switchTo={`/signup?role=${role}`}>
      <form className="au-stack" onSubmit={submit}>
        <div className="au-heading">
          <h1 className="ui-h2">Log in</h1>
          <p className="ui-text-soft au-desktop">New to Cato? <Link className="ui-link" to={`/signup?role=${role}`}>Create an account</Link></p>
          <p className="ui-text-soft au-mobile">Log in to see your profile or your candidates.</p>
        </div>
        <div className="au-fields">
          <TextField label="Email address" icon={Mail} type="email" autoComplete="email" required maxLength={254}
            value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          <TextField label="Password" icon={Lock} type="password" autoComplete="current-password" required maxLength={128}
            value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
        </div>
        {(error || sessionError) && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error || sessionError}</p>}
        <Button type="submit" variant="primary" size="lg" block disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
        <p className="ui-alert ui-alert--info au-desktop"><CircleCheck />Applicants land on My profile; recruiters land on Find candidates.</p>
        <p className="ui-text-soft au-mobile au-center">New to Cato? <Link to={`/signup?role=${role}`}>Create an account</Link></p>
      </form>
    </AuthShell>
  );
};

export default LogIn;
