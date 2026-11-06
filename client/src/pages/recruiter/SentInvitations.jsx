import { Link } from 'react-router-dom';

const SentInvitations = () => {
  return (
    <div className="container">
      <h1 className="center">Sent Invitations</h1>
      <p className="muted">Siwakorn P., 6600139</p>
      <p className="muted">Responsibility 8 (Invitations)</p>
      <div className="stack">
        <Link to="/find" className="btn">Find candidates</Link>
      </div>
    </div>
  );
};

export default SentInvitations;