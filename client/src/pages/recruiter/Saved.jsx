import { Link } from 'react-router-dom';

const Saved = () => {
  return (
    <div className="container">
      <h1 className="center">Saved</h1>
      <p className="muted">Aye Myo Myat, 6837919</p>
      <p className="muted">Responsibility 6 (Saved searches and bookmarks, optional)</p>
      <div className="stack">
        <Link to="/find" className="btn">Back</Link>
      </div>
    </div>
  );
};

export default Saved;