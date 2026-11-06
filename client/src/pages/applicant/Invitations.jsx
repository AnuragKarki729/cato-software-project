import { Link } from 'react-router-dom';

const Invitations = () => {
  return (
    <div className="container">
      <h1 className="center">Invitations</h1>
      <p className="muted">Siwakorn P., 6600139</p>
      <p className="muted">Responsibility 8 (Invitations)</p>
      <div className="stack">
        <Link to="/profile" className="btn">Back to profile</Link>
      </div>
    </div>
  );
};

export default Invitations;