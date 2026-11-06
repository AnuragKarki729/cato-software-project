import { Link } from 'react-router-dom';

const ApplicantProfile = () => {
  return (
    <div className="container">
      <h1 className="center">Applicant Profile</h1>
      <div className="stack">
        <p className="muted">Nusrat Begam, 6638009</p>
        <p className="muted">Responsibility 2 (Applicant profile and resume)</p>
        <br />
        <p className="muted">Anurag Karki, 6838852</p>
        <p className="muted">Responsibility 1 (Video upload and video retrieval)</p>
        <br />
        <p className="muted">Siwakorn P., 6600139</p>
        <p className="muted">Responsibility 8 (Invitations)</p>
        <div className="stack">
          <Link to="/sent-invitations" className="btn">Invite</Link>
          <Link to="/results" className="btn">Back to results</Link>
        </div>
      </div>
    </div>
  );
};

export default ApplicantProfile;