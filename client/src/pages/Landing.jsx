import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setDevUserId } from "../api.js";

export default function Landing({ onUserChange }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/dev/users").then(setUsers).catch((error) => setMessage(error.message));
  }, []);

  function signUp(user) {
    setDevUserId(user.id);
    onUserChange(user);
    navigate(user.role === "applicant" ? "/onboarding/profile" : "/find");
  }

  const applicants = users.filter((user) => user.role === "applicant");
  const recruiters = users.filter((user) => user.role === "recruiter");
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand-700">Cato</p>
        <h1>Sign up</h1>
        <p className="mt-2 text-ink-soft">Choose an account to continue with the demo.</p>
      </div>
      {message && <p className="text-center text-sm text-red-600">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <AccountGroup title="I am an applicant" users={applicants} onChoose={signUp} />
        <AccountGroup title="I am a recruiter" users={recruiters} onChoose={signUp} />
      </div>
    </section>
  );
}

function AccountGroup({ title, users, onChoose }) {
  return (
    <section className="card space-y-3">
      <h2>{title}</h2>
      {users.map((user) => (
        <button key={user.id} className="btn-secondary w-full" onClick={() => onChoose(user)}>
          Sign up as {user.name}
        </button>
      ))}
    </section>
  );
}
