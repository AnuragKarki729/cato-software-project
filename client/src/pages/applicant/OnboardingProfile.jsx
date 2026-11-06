import { Link } from 'react-router-dom';

const OnboardingProfile = () => {
  return (
    <div className="container">
      <h1 className="center">Onboarding Profile</h1>
      <p className="muted">Nusrat Begam, 6638009</p>
      <p className="muted">Responsibility 2 (Applicant profile and resume)</p>
      <div className="stack">
        <Link to="/onboarding/video" className="btn">Next</Link>
      </div>
    </div>
  );
};

export default OnboardingProfile;