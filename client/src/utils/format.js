// Small display helpers shared by the profile and matching pages (Responsibilities 2 and 5).

export const yearLabel = (year) => (year === 5 ? 'Graduated' : year ? `Year ${year}` : '—');

/** A GPA as typed, tidied: leading zeros gone and rounded to two decimals ("0001.00" -> "1.00",
 *  "3.456" -> "3.46"). Blank stays blank; anything that is not a number is returned as typed,
 *  so the field's own check can say what is wrong with it. */
export function tidyGpa(value) {
  const text = String(value ?? '').trim();
  if (text === '') return '';
  if (!/^\d*\.?\d*$/.test(text) || text === '.') return text;
  // Exponent arithmetic rounds 1.005 to 1.01; multiplying by 100 would give 1.00.
  return Number(`${Math.round(Number(`${Number(text)}e2`))}e-2`).toFixed(2);
}

export const gpaLabel = (gpa) => (gpa === null || gpa === undefined ? '—' : Number(gpa).toFixed(2));

export const internshipsLabel = (count) => {
  if (count === null || count === undefined) return '—';
  if (count >= 5) return '5+ internships';
  return `${count} internship${count === 1 ? '' : 's'}`;
};

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((word) => word[0] || '').join('').toUpperCase();

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || name;

export function fileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function duration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// 62.7 stays 62.7, 91.0 becomes 91.
export const score = (value) => (Number.isInteger(value) ? String(value) : Number(value).toFixed(1).replace(/\.0$/, ''));

// Server datetimes are naive UTC.
const parse = (value) => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);

export function uploadedAgo(value) {
  if (!value) return '';
  const date = parse(value);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'uploaded just now';
  if (minutes < 60) return `uploaded ${minutes} min ago`;
  if (minutes < 60 * 24) return `uploaded ${Math.round(minutes / 60)} h ago`;
  return `uploaded ${shortDate(value)}`;
}

export const shortDate = (value) =>
  value ? parse(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
