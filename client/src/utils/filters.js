// The recruiter's search (Find candidates form) travels between Find candidates, Ranked results
// and the candidate profile as URL query parameters, which /api/matching/* also accepts.

export const EMPTY_FILTER = { field_of_study: '', min_year: '', min_gpa: '0.00', min_internships: '', skills: [] };

export function toQuery(filter) {
  const params = new URLSearchParams();
  if (filter.field_of_study) params.set('field_of_study', filter.field_of_study);
  params.set('min_year', String(filter.min_year || 1));
  params.set('min_gpa', String(Number(filter.min_gpa) || 0));
  params.set('min_internships', String(filter.min_internships || 0));
  filter.skills.forEach((skill) => params.append('skills', skill));
  return params.toString();
}

/** The filter in the current URL, or null when the URL has none. */
export function fromSearch(searchParams) {
  if (!searchParams.has('min_year') && !searchParams.has('skills') && !searchParams.has('field_of_study')) return null;
  return {
    field_of_study: searchParams.get('field_of_study') || '',
    min_year: Number(searchParams.get('min_year')) > 1 ? Number(searchParams.get('min_year')) : '',
    min_gpa: Number(searchParams.get('min_gpa') || 0).toFixed(2),
    min_internships: Number(searchParams.get('min_internships')) > 0 ? Number(searchParams.get('min_internships')) : '',
    skills: searchParams.getAll('skills'),
  };
}

/** The filter object the API returns (RankedResults.filter) as form values. */
export const fromApi = (filter) => ({
  field_of_study: filter.field_of_study || '',
  min_year: filter.min_year > 1 ? filter.min_year : '',
  min_gpa: Number(filter.min_gpa || 0).toFixed(2),
  min_internships: filter.min_internships > 0 ? filter.min_internships : '',
  skills: filter.skills || [],
});

/** "?query" suffix for links, or '' when there is no filter in the URL. */
export const carry = (searchParams) => (fromSearch(searchParams) ? `?${searchParams.toString()}` : '');
