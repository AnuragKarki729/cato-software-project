// Figma "P12 · Saved searches & bookmarks". UI by Nusrat Begam (6638009).
// Data: GET /api/saved/searches and /api/saved/bookmarks (Responsibility 6, Aye Myo Myat).
// Until those routes are live the page shows the design's sample searches; their match counts
// and "Run search" are real (matching, Responsibility 5).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, Info, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import CandidateCard from '../../components/CandidateCard.jsx';
import useCandidateActions from '../../components/useCandidateActions.jsx';
import { Button, ConfirmDialog, IconButton } from '../../components/ui/primitives.jsx';
import { SAMPLE_SEARCHES, describeFilter, routeMissing } from '../../data/samples.js';
import { fromApi, toQuery } from '../../utils/filters.js';

const dayMonth = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

async function withCounts(searches) {
  return Promise.all(searches.map(async (search) => {
    if (search.matches !== undefined) return search;
    const counts = await api.get(`/matching/preview?${toQuery(search.filter)}`);
    return { ...search, matches: counts.passing };
  }));
}

async function loadSearches() {
  try {
    const list = await api.get('/saved/searches');
    return { sample: false, searches: list.map((s) => ({ id: s.id, name: s.name, filter: fromApi(s), matches: s.match_count })) };
  } catch (err) {
    if (!routeMissing(err)) throw err;
    return { sample: true, searches: await withCounts(SAMPLE_SEARCHES) };
  }
}

async function loadBookmarks(sample) {
  if (!sample) {
    try { return await api.get('/saved/bookmarks'); } catch (err) { if (!routeMissing(err)) throw err; }
  }
  // Sample bookmarks: two real candidates from the first sample search.
  const page = await api.get(`/matching/results?offset=2&limit=2&${toQuery(SAMPLE_SEARCHES[0].filter)}`);
  return page.results.map((r) => ({ ...r, rank: null }));
}

export default function Saved() {
  const navigate = useNavigate();
  const actions = useCandidateActions();
  const [searches, setSearches] = useState(null);
  const [bookmarks, setBookmarks] = useState(null);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    let active = true;
    loadSearches().then(async ({ sample: isSample, searches: list }) => {
      if (!active) return;
      setSample(isSample);
      setSearches(list);
      const saved = await loadBookmarks(isSample);
      if (active) setBookmarks(saved);
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  async function removeSearch() {
    if (!sample) {
      try { await api.delete(`/saved/searches/${deleting.id}`); } catch (err) { actions.notify({ title: 'Not deleted', message: err.message, tone: 'error' }); setDeleting(null); return; }
    }
    setSearches((list) => list.filter((s) => s.id !== deleting.id));
    actions.notify({ title: 'Search deleted', message: sample ? 'Sample search removed from this page only.' : undefined });
    setDeleting(null);
  }

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main">
        <div className="fc-heading">
          <h1 className="ui-h2">Saved</h1>
          <p className="ui-lead">Run a saved search again in one click, or come back to candidates you bookmarked.</p>
        </div>
        {sample && <p className="ui-alert ui-alert--info"><Info />Sample saved searches from the design. Saving searches and bookmarks is Responsibility 6 and not connected yet; match counts and Run search are live.</p>}
        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

        <section className="sv-section" aria-labelledby="searches-title">
          <h2 id="searches-title" className="ui-h4">Saved searches ({searches?.length ?? 0})</h2>
          {!searches && !error && <span className="ui-skeleton" style={{ height: 74, borderRadius: 12 }} />}
          {searches?.length === 0 && <p className="ui-text-muted">No saved searches yet. Use “Save this search” on Find candidates.</p>}
          {searches?.map((search) => (
            <article key={search.id} className="sv-search">
              <span className="sv-search__icon"><SlidersHorizontal aria-hidden="true" /></span>
              <div className="sv-search__text"><strong>{search.name}</strong><span className="ui-text-soft">{describeFilter(search.filter)}</span></div>
              <span className="ui-text-xs ui-text-muted sv-search__meta">
                {[search.saved && `Saved ${dayMonth(search.saved)}`, `${search.matches} ${search.matches === 1 ? 'match' : 'matches'}`].filter(Boolean).join(' · ')}
              </span>
              <Button variant="secondary" size="sm" icon={Search} onClick={() => navigate(`/results?${toQuery(search.filter)}`)}>Run search</Button>
              <IconButton icon={Trash2} label={`Delete ${search.name}`} onClick={() => setDeleting(search)} />
            </article>
          ))}
        </section>

        <section className="sv-section" aria-labelledby="bookmarks-title">
          <h2 id="bookmarks-title" className="ui-h4">Bookmarked candidates ({bookmarks?.length ?? 0})</h2>
          {!bookmarks && !error && <span className="ui-skeleton rr-skeleton" />}
          {bookmarks?.length === 0 && <p className="ui-text-muted">No bookmarks yet. Bookmark candidates from Ranked results or a profile.</p>}
          <div className="rr-list">
            {bookmarks?.map((result) => <CandidateCard key={result.applicant_id} result={result} kind="Saved" actions={actions} />)}
          </div>
        </section>
      </main>
      {deleting && <ConfirmDialog title={`Delete “${deleting.name}”?`} message="This can't be undone." onConfirm={removeSearch} onCancel={() => setDeleting(null)} />}
      {actions.ui}
    </div>
  );
}
