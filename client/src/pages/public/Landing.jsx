import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  const handleButtonClick = (role, isLogin) => {
    const path = isLogin ? '/login' : '/signup';
    navigate(`${path}?role=${role}`);
  };

  return (
    <div className="container">
      <h1 className="center">Welcome to Cato Recruitment Platform</h1>
      <div className="stack center">
        <button 
          onClick={() => handleButtonClick('recruiter', false)}
          className="btn-signup"
        >
          Sign up as recruiter
        </button>
        <button 
          onClick={() => handleButtonClick('recruiter', true)}
          className="btn-login"
        >
          Sign in as recruiter
        </button>
        <button 
          onClick={() => handleButtonClick('applicant', false)}
          className="btn-signup"
        >
          Sign up as applicant
        </button>
        <button 
          onClick={() => handleButtonClick('applicant', true)}
          className="btn"
        >
          Sign in as applicant
        </button>
      </div>
    </div>
  );
};

export default Landing;
