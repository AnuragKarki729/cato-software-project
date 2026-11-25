// Responsibility 3 — Anurag Karki (6838852): what the browser tab says.
//
// Every page used to sit under the one title Vite scaffolded ("client"), so a recruiter with
// Find candidates, a ranked list and a candidate's profile open had three identical tabs.
// The title is built here rather than set page by page, so a new route cannot forget it and
// the wording stays consistent: "<page> · <role> · Cato".
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const BRAND = 'Cato';

// Longest path first: `/onboarding/profile` has to win over `/onboarding`, and `/profile/edit`
// over `/profile`. Matching is by prefix so routes with an id in them — `/role/7/profile` —
// need no pattern of their own.
const TITLES = [
  ['/onboarding/recruiter', 'Set up your company'],
  ['/onboarding/profile', 'Your details'],
  ['/onboarding/review', 'Check your details'],
  ['/onboarding/video', 'Your elevator pitch'],
  ['/profile/preview', 'Profile preview'],
  ['/profile/edit', 'Edit profile'],
  ['/sent-invitations', 'Sent invitations'],
  ['/videos/add', 'Add a video'],
  ['/invitations', 'Invitations'],
  ['/settings', 'Settings'],
  ['/candidates', 'Candidates'],
  ['/results', 'Ranked results'],
  ['/explore', 'Explore candidates'],
  ['/profile', 'My profile'],
  ['/signup', 'Create an account'],
  ['/saved', 'Saved'],
  ['/login', 'Log in'],
  ['/find', 'Find candidates'],
  ['/feed', 'Video feed'],
  ['/role', 'Candidate profile'],
];

const ROLES = { applicant: 'Applicant', recruiter: 'Recruiter' };

export function titleFor(pathname, role) {
  if (pathname === '/') return `${BRAND} · Hiring that starts with a pitch`;
  const match = TITLES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  // A signed-out visitor has no role to announce, and neither do the public pages.
  return [match?.[1], ROLES[role], BRAND].filter(Boolean).join(' · ');
}

/** Keeps document.title in step with the route and who is signed in. */
export default function usePageTitle() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  useEffect(() => {
    document.title = titleFor(pathname, user?.role);
  }, [pathname, user?.role]);
}
