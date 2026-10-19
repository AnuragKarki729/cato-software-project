import { Link } from "react-router-dom";

export default function Landing({ user }) {
  return (
    <section className="space-y-4">
      <h1 className="text-5xl font-bold text-violet-700">Cato</h1>
      <p>
        Recruitment through short videos and resumes. Applicants show who they are with a
        30 second elevator pitch; recruiters set the parameters of their ideal candidate and
        get a ranked list – no job posts, no blind applying.
      </p>
      {user ? (
        <p>Logged in as {user.name} ({user.role}).</p>
      ) : (
        <p>
          <Link to="/signup" className="text-violet-700 underline">Sign up</Link> · <Link to="/login" className="text-violet-700 underline">Log in</Link>
        </p>
      )}
    </section>
  );
}
