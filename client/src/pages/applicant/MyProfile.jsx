import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext.jsx';

const MyProfile = () => {
  const { user, logout } = useAuth();
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    
    const fetchPitchVideo = async () => {
      const userId = user?.id;
      
      if (!userId) {
        if (!cancelled) {
          setError('Please log in first.');
          setLoading(false);
        }
        return;
      }
      
      try {
        const videos = await api.get(`/videos/applicant/${userId}`);
        if (!cancelled) {
          const pitchVideo = videos.find(v => v.kind === 'pitch') || null;
          setPitch(pitchVideo);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };
    
    fetchPitchVideo();
    
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container">
      <h1 className="center">My Profile</h1>
      <div className="stack">
        <p className="muted">Nusrat Begam, 6638009</p>
        <p className="muted">Responsibility 2 (Applicant profile and resume)</p>
        <br />
        <p className="muted">Anurag Karki, 6838852</p>
        <p className="muted">Responsibility 1 (Video upload and video retrieval)</p>
        
        <section className="card stack">
          <h2>My pitch video</h2>
          {loading && <p className="muted">Loading…</p>}
          {error && <p className="error">{error}</p>}
          {pitch && (
            <>
              <video className="pitch-video" src={pitch.url} controls />
              <p className="muted">{pitch.duration_seconds.toFixed(1)} seconds</p>
              <Link to="/onboarding/video" className="btn btn-secondary">Replace pitch</Link>
            </>
          )}
          {!pitch && !loading && !error && (
            <p className="muted">No pitch video yet.</p>
          )}
          {!pitch && !loading && !error && (
            <Link to="/onboarding/video" className="btn">Upload pitch</Link>
          )}
        </section>
        
        <div className="stack">
          <Link to="/invitations" className="btn">Invitations</Link>
          <Link to="/feed" className="btn">Video feed</Link>
          <button type="button" className="btn btn-secondary" onClick={logout}>Log out</button>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;