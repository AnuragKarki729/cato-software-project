// Figma "Overlay · Resume viewer": the resume PDF shown inside the app.
// Responsibility 2 — Nusrat Begam (6638009).
import { ExternalLink, FileText } from 'lucide-react';
import { Button, Dialog } from './primitives.jsx';

export default function ResumeViewer({ url, name = 'Resume.pdf', onClose }) {
  return (
    <Dialog label={`Resume: ${name}`} onClose={onClose} className="ui-viewer">
      <div className="ui-viewer__head">
        <FileText aria-hidden="true" />
        <p className="ui-viewer__title">{name}</p>
        <a className="ui-icon-btn" href={url} target="_blank" rel="noreferrer" aria-label="Open in a new tab" title="Open in a new tab">
          <ExternalLink aria-hidden="true" />
        </a>
        <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
      </div>
      <div className="ui-viewer__body">
        <iframe className="ui-viewer__frame" src={url} title={name} />
        <p className="ui-text-xs ui-text-muted">Private file · shared only with recruiters on Cato</p>
      </div>
    </Dialog>
  );
}
