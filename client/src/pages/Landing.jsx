import { Link } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';

export default function Landing() {
  const { user } = useAuth();
  return <section className="mx-auto max-w-2xl py-16 text-center">
    <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-700">Authentically better hires</p>
    <h1 className="text-4xl sm:text-5xl">More than a resume.<br />A person worth meeting.</h1>
    <p className="mt-6 text-lg text-ink-soft">Applicants share their story through a profile and a short pitch. Recruiters discover people who fit their requirements and invite them to connect.</p>
    <div className="mt-8 flex justify-center gap-3">{user ? <Link className="btn-primary" to={homeFor(user)}>Go to my workspace</Link>
      : <><Link className="btn-primary" to="/signup">Create an account</Link><Link className="btn-secondary" to="/login">Log in</Link></>}</div>
  </section>;
}
