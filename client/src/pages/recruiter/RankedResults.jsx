import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../api';

const PAGE_SIZE = 10;

const RankedResults = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(0);

  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  // Until matching (Responsibility 5) exists, the results are every applicant's pitch from the feed.
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const response = await api.get(`/feed?page=${pageRef.current}`);
      setItems((prev) => [...prev, ...response]);
      pageRef.current += 1;
      setHasMore(response.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoaded(true);
    }
  }, [hasMore]);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (!scrollRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { root: scrollRef.current, threshold: 0.1 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [items, hasMore, loadMore]);

  const handleScroll = (event) => {
    const el = event.currentTarget;
    setCurrent(Math.round(el.scrollTop / el.clientHeight));
  };

  const scrollByCard = (direction) => {
    const el = scrollRef.current;
    el.scrollBy({ top: direction * el.clientHeight, behavior: 'smooth' });
  };

  const showUp = current > 0;
  const showDown = current < items.length - 1 || hasMore;

  return (
    <div className="container">
      <h1 className="center">Ranked Results</h1>
      <p className="muted">Nusrat Begam, 6638009</p>
      <p className="muted">Responsibility 5 (Candidate matching and ranked results)</p>

      <Link to="/find" className="btn btn-secondary">Back</Link>

      {error && <p className="error">{error}</p>}
      {loaded && items.length === 0 && !error && (
        <p className="muted center">No videos yet.</p>
      )}

      {items.length > 0 && (
        <div className="feed-wrap">
          {showUp && (
            <button
              type="button"
              className="chevron chevron-up"
              aria-label="Previous video"
              onClick={() => scrollByCard(-1)}
            >
              <ChevronUp size={24} />
            </button>
          )}

          <div className="feed" ref={scrollRef} onScroll={handleScroll}>
            {items.map((item) => (
              <div className="feed-card" key={item.id}>
                <h2>{item.name}</h2>
                <video className="pitch-video" src={item.url} controls />
                <p className="muted">{item.duration_seconds.toFixed(1)} seconds</p>
                <Link to={`/role/${item.applicant_id}/profile`} className="btn">
                  View {item.name}
                </Link>
              </div>
            ))}
            <div ref={sentinelRef} />
          </div>

          {showDown && (
            <button
              type="button"
              className="chevron chevron-down"
              aria-label="Next video"
              onClick={() => scrollByCard(1)}
            >
              <ChevronDown size={24} />
            </button>
          )}
        </div>
      )}

      {loading && <p className="muted center">Loading…</p>}
    </div>
  );
};

export default RankedResults;
