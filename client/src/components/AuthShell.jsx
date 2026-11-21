// Figma "P2 · Sign up" / "P3 · Log in" shell: dark brand panel on the left, form on the right.
// On phones the panel is replaced by a top bar with a switch button. UI by Nusrat Begam (6638009).
import { CircleCheck, Play } from 'lucide-react';
import { Button, Logo } from './ui/primitives.jsx';

const POINTS = ['Fixed filters, no guesswork', 'A score breakdown for every match', 'You decide who sees your data'];

export default function AuthShell({ title, lead, switchLabel, switchTo, children }) {
  return (
    <div className="ui-app au">
      <header className="au-mobile-bar">
        <Logo />
        <Button variant="secondary" size="sm" to={switchTo}>{switchLabel}</Button>
      </header>
      <aside className="au-brand">
        <span className="au-brand__logo"><Logo /></span>
        <div className="au-brand__pitch">
          <h2 className="au-brand__title">{title}</h2>
          <p className="au-brand__lead">{lead}</p>
          <ul>{POINTS.map((point) => <li key={point}><CircleCheck aria-hidden="true" />{point}</li>)}</ul>
        </div>
        <div className="au-brand__preview" aria-hidden="true">
          <div className="ui-poster au-brand__poster">
            <span className="ui-poster__initials">NB</span>
            <span className="ui-poster__shade" />
            <span className="ui-poster__play"><Play fill="currentColor" strokeWidth={0} /></span>
            <span className="ui-poster__kind">Pitch</span>
            <span className="ui-poster__duration">0:28</span>
          </div>
          <p>Recruiters watch your pitch before they read your CV.</p>
        </div>
      </aside>
      <main className="au-form-area">
        <div className="au-form">{children}</div>
      </main>
    </div>
  );
}
