import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext.jsx';

const VideoFeed = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    
    try {
      const response = await api.get(`/feed?page=${pageRef.current}`);
      
      setItems(prevItems => [...prevItems, ...response]);
      pageRef.current += 1;
      setHasMore(response.length === 10);
      setLoaded(true);
    } catch (err) {
      setError(err.message);
      setHasMore(false);
      setLoaded(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore]);

  useEffect(() => {
    const fetchInitialPage = async () => {
      await loadMore();
    };
    
    fetchInitialPage();
  }, [loadMore]);

  useEffect(() => {
    if (!scrollRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { 
        root: scrollRef.current,
        threshold: 0.1 
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [items, hasMore, loadMore]);

  const { user } = useAuth();
  const backTo = user?.role === 'recruiter' ? '/find' : '/profile';

  return (
    <div className="container">
      <h1 className="center">Video Feed</h1>
      <p className="muted">Anurag Karki, 6838852</p>
      <p className="muted">Responsibility 3 (Short-form video feed, optional)</p>
      
      <Link to={backTo} className="btn btn-secondary">Back</Link>
      
      {error && <p className="error">{error}</p>}
      {loaded && items.length === 0 && !error && (
        <p className="muted center">No videos yet.</p>
      )}
      
      {items.length > 0 && (
        <div className="feed" ref={scrollRef}>
          {items.map(item => (
            <div className="feed-card" key={item.id}>
              <h2>{item.name}</h2>
              <video className="pitch-video" src={item.url} controls />
              <p className="muted">{item.duration_seconds.toFixed(1)} seconds</p>
            </div>
          ))}
          <div ref={sentinelRef} />
        </div>
      )}
      
      {loading && <p className="muted center">Loading…</p>}
    </div>
  );
};

export default VideoFeed;