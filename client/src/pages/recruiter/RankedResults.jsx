// Responsibility 5: Candidate matching and ranked results — Nusrat Begum (6638009)
// Figma "P8 · Ranked results" (+ "10 of 14" and "all 14" states after Load more).
// The filters come from Find candidates (Responsibility 4); Save search, Bookmark
// (Responsibility 6) and Invite (Responsibility 8) plug into the buttons on this page.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bookmark, CircleAlert, Info, SearchX, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import CandidateCard from '../../components/CandidateCard.jsx';
import useCandidateActions from '../../components/useCandidateActions.jsx';
import { Button, Tag } from '../../components/ui/primitives.jsx';
import { gpaLabel } from '../../utils/format.js';
import { carry, fromApi, fromSearch, toQuery } from '../../utils/filters.js';

const PAGE = 5;

function filterTags(filter) {
  const tags = [filter.field_of_study || 'Any field of study'];
  if (filter.min_year > 1) tags.push(filter.min_year === 5 ? 'Graduated' : `Year ${filter.min_year}+`);
  if (filter.min_gpa > 0) tags.push(`GPA ${gpaLabel(filter.min_gpa)}+`);
  if (filter.min_internships > 0) tags.push(`${filter.min_internships}+ internship${filter.min_internships === 1 ? '' : 's'}`);
  return [...tags, ...filter.skills];
}

export default function RankedResults() {
  const [searchParams] = useSearchParams();
  // Filters from Find candidates travel in the URL; without them the saved filter is used.
  const urlFilter = fromSearch(searchParams);
  const filterQuery = urlFilter ? `&${toQuery(urlFilter)}` : '';
  const suffix = carry(searchParams);
  const actions = useCandidateActions();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [noFilter, setNoFilter] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/matching/results?offset=0&limit=${PAGE}${filterQuery}`)
      .then((page) => { if (active) setData(page); })
      .catch((err) => { if (!active) return; if (err.status === 404) setNoFilter(true); else setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filterQuery]);

  async function loadMore() {
    setLoadingMore(true);
    setError('');
    try {
      const page = await api.get(`/matching/results?offset=${data.results.length}&limit=${PAGE}${filterQuery}`);
      setData((current) => ({ ...page, results: [...current.results, ...page.results] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function saveSearch() {
    // Saved searches are Responsibility 6 (Aye Myo Myat): POST /api/saved/searches.
    try {
      await api.post('/saved/searches', { name: filterTags(data.filter).slice(0, 2).join(', '), ...data.filter });
      actions.notify({ title: 'Search saved', message: 'Run it again any time from Saved.' });
    } catch (err) {
      actions.notify({ title: 'Search not saved', tone: 'error',
        message: err.status === 404 || err.status === 405 ? 'Saved searches are not connected yet (Responsibility 6).' : err.message });
    }
  }

  const shown = data?.results.length ?? 0;
  const editLink = data ? `/find?${toQuery(fromApi(data.filter))}` : '/find';
  const remaining = data ? data.total - shown : 0;

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main" style={{ gap: 20 }}>
        <div className="rr-header">
          <div className="rr-title">
            <p className="ui-overline">Results</p>
            <h1 className="ui-h2" aria-live="polite">
              {loading ? 'Finding candidates…' : data ? `${data.total} candidate${data.total === 1 ? '' : 's'} match` : 'Ranked results'}
            </h1>
          </div>
          <div className="rr-actions">
            <Button variant="ghost" size="md" icon={Bookmark} onClick={saveSearch} disabled={!data}>Save search</Button>
            <Button variant="secondary" size="md" icon={SlidersHorizontal} to={editLink}>Edit filters</Button>
          </div>
        </div>

        {data && (
          <div className="rr-filters" aria-label="Active filters">
            <span>Filters:</span>
            {filterTags(data.filter).map((tag) => <Tag key={tag}>{tag}</Tag>)}
          </div>
        )}

        {data && data.total > 0 && (
          <div className="rr-sort">
            <span><Info aria-hidden="true" />Sorted by match score, then GPA, then newest profile</span>
            <span>Showing 1–{shown} of {data.total}</span>
          </div>
        )}

        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

        {loading && (
          <div className="rr-list" aria-busy="true" aria-label="Loading results">
            {[0, 1, 2].map((i) => <span key={i} className="ui-skeleton rr-skeleton" />)}
          </div>
        )}

        {noFilter && (
          <section className="ui-card ui-empty">
            <span className="ui-empty__icon"><SlidersHorizontal aria-hidden="true" /></span>
            <h2 className="ui-h5">Set up your search first</h2>
            <p className="ui-text-soft">Choose the field of study, year, GPA, internships and skills you need. Cato ranks every applicant against them.</p>
            <Button variant="primary" size="md" to="/find">Find candidates</Button>
          </section>
        )}

        {data && data.total === 0 && (
          <section className="ui-card ui-empty">
            <span className="ui-empty__icon"><SearchX aria-hidden="true" /></span>
            <h2 className="ui-h5">No candidates match these filters</h2>
            <p className="ui-text-soft">Every applicant missed at least one hard requirement. Try a lower minimum year, GPA or internships, or a different field of study.</p>
            <Button variant="secondary" size="md" icon={SlidersHorizontal} to={editLink}>Edit filters</Button>
          </section>
        )}

        {data && data.total > 0 && (
          <div className="rr-list">
            {data.results.map((result) => <CandidateCard key={result.applicant_id} result={result} suffix={suffix} actions={actions} />)}
          </div>
        )}

        {data && data.total > 0 && (
          <div className="rr-more">
            <span>Showing {shown} of {data.total}</span>
            {remaining > 0 && (
              <Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load ${Math.min(PAGE, remaining)} more`}
              </Button>
            )}
          </div>
        )}
      </main>
      {actions.ui}
    </div>
  );
}
