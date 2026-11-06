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

const SignUp = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'applicant';
  const navigate = useNavigate();

  const handleSignUpAs = (user) => {
    setUserId(user.id);
    setRole(role);
    navigate(role === 'applicant' ? '/onboarding/profile' : '/onboarding/recruiter');
  };

  return (
    <div className="container">
      <h1 className="center">Sign up as {role}</h1>
      <p className="muted">Aye Myo Myat, 6837919</p>
      <p className="muted">Responsibility 7 (Sign up, log in and roles)</p>

      <div className="stack">
        <h2 className="center">Sign up as {role}:</h2>
        {USERS[role].map((user) => (
          <button
            key={user.id}
            onClick={() => handleSignUpAs(user)}
            className="btn"
          >
            Sign up as {user.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SignUp;
