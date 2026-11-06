// Small shared UI icons for Responsibilities 6 and 7; no icon dependency.
const paths = {
  mail: 'M3 5h18v14H3z M3 5l9 7 9-7',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',
  check: 'M5 12l4 4L19 6',
  circleCheck: 'M22 11v1a10 10 0 1 1-6-9 M22 4L12 14l-3-3',
  briefcase: 'M3 7h18v14H3z M8 7V3h8v4 M8 11v6 M12 11v6 M16 11v6',
  graduate: 'M2 8l10-5 10 5-10 5z M6 10v7c4 3 8 3 12 0v-7 M22 8v8',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  search: 'M21 21l-6-6 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15',
  sliders: 'M3 6h7 M14 6h7 M3 12h11 M18 12h3 M3 18h3 M10 18h11 M10 3v6 M14 9v6 M6 15v6',
  send: 'M22 2L9 15 M22 2l-7 20-6-7-7-6z',
  logout: 'M9 3H4v18h5 M14 8l5 4-5 4 M8 12h11',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
};
export default function Icon({ name, className = 'h-4 w-4', ...props }) {
  return <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.check} /></svg>;
}
