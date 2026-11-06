import { Link } from 'react-router-dom';

const FindCandidates = () => {
  return (
    <div className="container">
      <h1 className="center">Find Candidates</h1>
      <p className="muted">Siwakorn P., 6600139</p>
      <p className="muted">Responsibility 4 (Recruiter filter page)</p>
      <div className="stack">
        <Link to="/results" className="btn">Search</Link>
        <Link to="/saved" className="btn">Saved</Link>
        <Link to="/sent-invitations" className="btn">Sent invitations</Link>
      </div>
    </div>
  );
};

export default FindCandidates;