// Cato design-system primitives (Figma page "1 · Design system").
// Responsibilities 2 and 5 — Nusrat Begam (6638009). Styles live in styles/ui.css.
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, CircleAlert, CircleCheck, Play, X } from 'lucide-react';
import { initials } from '../../utils/format.js';

const cx = (...names) => names.filter(Boolean).join(' ');

// Keeps the newest callback without re-running effects when a parent passes an inline function.
function useLatest(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

/** <Button variant="primary|secondary|ghost|accent|danger" size="sm|md|lg" icon={Send} to="/x"> */
export function Button({ variant = 'primary', size = 'md', icon: Icon, to, block, className, children, ...props }) {
  const classes = cx('ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`, block && 'ui-btn--block', className);
  const content = <>{Icon && <Icon aria-hidden="true" />}{children}</>;
  if (to && !props.disabled) return <Link to={to} className={classes} {...props}>{content}</Link>;
  return <button type="button" className={classes} {...props}>{content}</button>;
}

/** Square icon-only button. `label` is read by screen readers and shown as a tooltip. */
export function IconButton({ icon: Icon, label, size = 'sm', variant, className, ...props }) {
  return (
    <button type="button" className={cx('ui-icon-btn', size === 'md' && 'ui-icon-btn--md', variant && `ui-icon-btn--${variant}`, className)}
      aria-label={label} title={props.title ?? label} {...props}>
      <Icon aria-hidden="true" />
    </button>
  );
}

/** <Badge tone="success|info|warning|neutral|accent" dot> */
export function Badge({ tone = 'success', dot = true, children }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{dot && <span className="ui-badge__dot" aria-hidden="true" />}{children}</span>;
}

/** Skill tag; `match` shows a check and turns it green. */
export function Tag({ match, children }) {
  return <span className={cx('ui-tag', match && 'ui-tag--match')}>{match && <Check aria-hidden="true" />}{children}</span>;
}

export function Avatar({ name, size = 'sm' }) {
  return <span className={`ui-avatar ui-avatar--${size}`} aria-hidden="true">{initials(name)}</span>;
}

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="ui-logo" aria-label="Cato home">
      <span className="ui-logo__mark"><Play fill="currentColor" strokeWidth={0} aria-hidden="true" /></span>
      Cato
    </Link>
  );
}

/** Labelled <select> from a fixed list of options: [{ value, label }]. */
export function SelectField({ label, value, onChange, options, placeholder = 'Select…', help, error, required, name }) {
  const id = useId();
  const empty = value === '' || value === null || value === undefined;
  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={id}>{label}</label>
      <div className="ui-control-wrap">
        <select id={id} name={name} className={cx('ui-control', empty && 'is-empty')} value={empty ? '' : value} required={required}
          aria-invalid={error ? 'true' : undefined} aria-describedby={help || error ? `${id}-help` : undefined}
          onChange={(event) => onChange(event.target.value)}>
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown aria-hidden="true" />
      </div>
      {(error || help) && <p id={`${id}-help`} className={error ? 'ui-field-error' : 'ui-help'}>{error || help}</p>}
    </div>
  );
}

export function TextField({ label, help, error, ...props }) {
  const id = useId();
  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={id}>{label}</label>
      <input id={id} className="ui-control" aria-invalid={error ? 'true' : undefined}
        aria-describedby={help || error ? `${id}-help` : undefined} {...props} />
      {(error || help) && <p id={`${id}-help`} className={error ? 'ui-field-error' : 'ui-help'}>{error || help}</p>}
    </div>
  );
}

/** Toast from the Figma "Overlay · Draft saved" frame. toast = { title, message, tone } */
export function Toast({ toast, onClose }) {
  const close = useLatest(onClose);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => close.current(), 4500);
    return () => clearTimeout(timer);
  }, [toast, close]);
  if (!toast) return null;
  const error = toast.tone === 'error';
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <div className={cx('ui-toast', error && 'ui-toast--error')} role={error ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <div className="ui-toast__text">
        <p className="ui-toast__title">{toast.title}</p>
        {toast.message && <p className="ui-toast__message">{toast.message}</p>}
      </div>
      <IconButton icon={X} label="Dismiss" onClick={onClose} />
    </div>
  );
}

/** Modal shell: closes on Escape and on a click outside `children`. */
export function Dialog({ label, onClose, className = 'ui-dialog', children }) {
  const panel = useRef(null);
  const close = useLatest(onClose);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [close]);
  return (
    <div className="ui-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} className={className} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>{children}</div>
    </div>
  );
}

/** Figma "Overlay · Delete confirm". */
export function ConfirmDialog({ title = 'Delete for good?', message = "This can't be undone.", confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <Dialog label={title} onClose={onCancel}>
      <h2 className="ui-h5">{title}</h2>
      <p className="ui-text-soft">{message}</p>
      <div className="ui-dialog__actions">
        <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" size="lg" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</Button>
      </div>
    </Dialog>
  );
}
