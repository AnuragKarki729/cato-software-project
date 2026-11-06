import { useSearchParams, useNavigate } from 'react-router-dom';
import { setUserId, setRole } from '../../api';

const USERS = {
  applicant: [
    { id: 3, name: 'Anurag Karki' },
    { id: 4, name: 'Nusrat Begam' },
  ],
  recruiter: [
    { id: 1, name: 'Aye Myo Myat' },
    { id: 2, name: 'Siwakorn P.' },
  ],
};

const LogIn = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'applicant';
  const navigate = useNavigate();

  const handleLoginAs = (user) => {
    setUserId(user.id);
    setRole(role);
    navigate(role === 'applicant' ? '/feed' : '/find');
  };

  return (
    <div className="container">
      <h1 className="center">Log in as {role}</h1>
      <p className="muted">Aye Myo Myat, 6837919</p>
      <p className="muted">Responsibility 7 (Sign up, log in and roles)</p>

      <div className="stack">
        <h2 className="center">Login as {role}:</h2>
        {USERS[role].map((user) => (
          <button
            key={user.id}
            onClick={() => handleLoginAs(user)}
            className="btn"
          >
            Login as {user.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LogIn;
