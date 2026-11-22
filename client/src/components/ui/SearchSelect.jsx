// Search-to-select for a growing vocabulary (university, field of study).
// Owner: Anurag Karki (6838852).
//
// A plain <select> could only ever offer the seeded list, so a university read off a real
// resume had no option to land on and silently showed blank. This filters as you type and,
// when nothing matches, offers to add what you typed. The server decides the canonical
// spelling, so typing "mahidol university" resolves to the existing "Mahidol University"
// rather than creating a second entry.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';

export default function SearchSelect({
  label, value, onChange, options = [], placeholder = 'Search…', help, error,
  allowAdd = true, addLabel = (text) => `Add “${text}”`, note,
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!box.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  const typed = query.trim();
  const matches = useMemo(() => {
    const needle = typed.toLowerCase();
    const list = needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options;
    return list.slice(0, 50);
  }, [options, typed]);

  // Same comparison the server uses, so "Add" never appears for something already there.
  const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const exists = typed && options.some((o) => normalize(o) === normalize(typed));
  const canAdd = allowAdd && typed.length > 1 && !exists;

  function pick(next) {
    onChange(next);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="ui-field" ref={box}>
      <label className="ui-label" htmlFor={id}>{label}</label>
      <div className={`ss${open ? ' is-open' : ''}`}>
        <button type="button" id={id} className={`ui-control ss__button${value ? '' : ' is-empty'}`}
          aria-haspopup="listbox" aria-expanded={open} aria-invalid={error ? 'true' : undefined}
          onClick={() => setOpen((o) => !o)}>
          <span>{value || placeholder}</span>
          <ChevronDown aria-hidden="true" />
        </button>

        {open && (
          <div className="ss__panel">
            <div className="ss__search">
              <Search aria-hidden="true" />
              <input autoFocus type="text" value={query} placeholder="Type to search…"
                aria-label={`Search ${label.toLowerCase()}`}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (matches.length) pick(matches[0]);
                    else if (canAdd) pick(typed);
                  }
                }} />
            </div>
            <ul className="ss__list" role="listbox" aria-label={label}>
              {matches.map((option) => (
                <li key={option}>
                  <button type="button" role="option" aria-selected={option === value}
                    className={`ss__option${option === value ? ' is-on' : ''}`} onClick={() => pick(option)}>
                    {option}
                    {option === value && <Check aria-hidden="true" />}
                  </button>
                </li>
              ))}
              {canAdd && (
                <li>
                  <button type="button" className="ss__option ss__option--add" onClick={() => pick(typed)}>
                    <Plus aria-hidden="true" />{addLabel(typed)}
                  </button>
                </li>
              )}
              {!matches.length && !canAdd && (
                <li><p className="ss__empty">{typed ? 'Nothing matches.' : 'Start typing to search.'}</p></li>
              )}
            </ul>
          </div>
        )}
      </div>
      {note}
      {(error || help) && <p className={error ? 'ui-field-error' : 'ui-help'}>{error || help}</p>}
    </div>
  );
}
