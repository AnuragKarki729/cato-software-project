// Responsibility 6 — Aye Myo Myat (6837919)
// The filter-page owner can pass its current form values as `filters`.
// Without props, use the recruiter's persisted current filter.
import { useState } from 'react';
import { api } from '../api.js';

export default function SaveSearchButton({ filters }) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const current = filters || await api.get('/saved/current-filter');
      await api.post('/saved/searches', { ...current, name });
      setName(''); setOpen(false); setMessage('Search saved. You can find it on Saved.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div>
    {!open ? <button type="button" className="btn-secondary" onClick={() => { setOpen(true); setMessage(''); }}>Save search</button> :
      <form className="flex flex-wrap items-end gap-2" onSubmit={save}>
        <label className="text-sm font-medium">Search name<input className="mt-1 block rounded-lg border border-line bg-surface px-3 py-2" required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
      </form>}
    {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    {message && <p className="mt-2 text-sm text-brand-700" role="status">{message}</p>}
  </div>;
}
