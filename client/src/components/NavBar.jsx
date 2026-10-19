import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getDevUserId, setDevUserId } from "../api.js";

const APPLICANT_LINKS = [
  ["/profile", "My profile"],
  ["/invitations", "Invitations"],
  ["/feed", "Video feed"],
];

const RECRUITER_LINKS = [
  ["/find", "Find candidates"],
  ["/sent-invitations", "Sent invitations"],
  ["/saved", "Saved"],
  ["/feed", "Video feed"],
];

// The "Acting as" dropdown is the temporary development login.
export default function NavBar({ user, onUserChange }) {
  const [devUsers, setDevUsers] = useState([]);

  useEffect(() => {
    api.get("/dev/users").then(setDevUsers).catch(() => setDevUsers([]));
  }, []);

  function chooseUser(event) {
    const id = event.target.value;
    setDevUserId(id);
    onUserChange(devUsers.find((u) => String(u.id) === id) || null);
  }

  const links = user?.role === "recruiter" ? RECRUITER_LINKS : user ? APPLICANT_LINKS : [];

  return (
    <nav className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
      <Link to="/" className="text-xl font-bold text-violet-700">Cato</Link>
      {links.map(([to, label]) => (
        <Link key={to} to={to} className="text-gray-800 hover:text-violet-700">{label}</Link>
      ))}
      <span className="flex-1" />
      <label className="text-sm text-gray-500">
        Acting as (dev):{" "}
        <select className="rounded border border-gray-300 px-2 py-1" value={getDevUserId() || ""} onChange={chooseUser}>
          <option value="">Logged out</option>
          {devUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </select>
      </label>
    </nav>
  );
}
