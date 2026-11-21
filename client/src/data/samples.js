// Sample content from the Figma for screens whose backend belongs to a teammate and is not live yet:
// Invitations / Sent invitations (Responsibility 8, Siwakorn P.) and Saved (Responsibility 6, Aye Myo Myat).
// Pages call the real endpoint first and only fall back to this when the route is missing.
// Delete this file once those endpoints exist.

// A route that is not mounted yet answers 404 "Not Found" (or 405/501).
export const routeMissing = (err) => err.status === 501 || err.status === 405 || (err.status === 404 && err.message === 'Not Found');

export const sampleInvitations = (email) => [
  { id: 's1', company: 'Acme Digital', recruiter: 'Siwakorn K.', team: 'Talent team', status: 'pending', date: '2026-10-18' },
  { id: 's2', company: 'Northwind Labs', recruiter: 'Pim R.', team: 'People team', status: 'accepted', date: '2026-10-15' },
  { id: 's3', company: 'Kasem Robotics', recruiter: 'Arthit T.', team: 'Engineering', status: 'declined', date: '2026-10-11' },
].map((invitation) => ({
  ...invitation,
  message: `${invitation.company} is interested in you and is sending this invitation to ${email} about a job vacancy.`,
}));

// Statuses and dates for the sent-invitations table; the candidates themselves are real demo applicants.
export const SAMPLE_SENT = [
  { status: 'pending', date: '2026-10-19' },
  { status: 'accepted', date: '2026-10-18' },
  { status: 'pending', date: '2026-10-14', source: 'from “Backend interns”' },
  { status: 'accepted', date: '2026-10-12' },
  { status: 'pending', date: '2026-10-10', source: 'from the video feed' },
  { status: 'declined', date: '2026-10-09', source: 'from the video feed' },
];

export const SAMPLE_SEARCHES = [
  { id: 'q1', name: 'Backend interns, CS', saved: '2026-10-12',
    filter: { field_of_study: 'Computer Science', min_year: 3, min_gpa: '3.00', min_internships: 1, skills: ['Python', 'SQL', 'React', 'Docker'] } },
  { id: 'q2', name: 'Data analysts, any field', saved: '2026-10-08',
    filter: { field_of_study: '', min_year: 2, min_gpa: '2.75', min_internships: '', skills: ['SQL', 'Excel', 'Tableau'] } },
  { id: 'q3', name: 'Front-end, React', saved: '2026-10-02',
    filter: { field_of_study: 'Computer Science', min_year: 3, min_gpa: '0.00', min_internships: '', skills: ['React', 'TypeScript', 'Figma'] } },
];

/** "Computer Science · Year 3+ · GPA 3.00+ · 1+ internship · Python, SQL" */
export function describeFilter(filter) {
  const parts = [filter.field_of_study || 'Any field'];
  if (Number(filter.min_year) > 1) parts.push(Number(filter.min_year) === 5 ? 'Graduated' : `Year ${filter.min_year}+`);
  if (Number(filter.min_gpa) > 0) parts.push(`GPA ${Number(filter.min_gpa).toFixed(2)}+`);
  if (Number(filter.min_internships) > 0) parts.push(`${filter.min_internships}+ internship${Number(filter.min_internships) === 1 ? '' : 's'}`);
  if (filter.skills?.length) parts.push(filter.skills.join(', '));
  return parts.join(' · ');
}
