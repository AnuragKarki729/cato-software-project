// Figma "Overlay · Resume viewer": the resume PDF shown inside the app.
// Responsibility 2 — Nusrat Begam (6638009).
// Shared component; changed by Anurag Karki (6838852) for Responsibility 3 — see PAGE_ONLY.
import { ExternalLink, FileText, X } from 'lucide-react';
import { Dialog } from './primitives.jsx';

// The dialog shows the page and nothing else: the browser's own PDF toolbar and sidebar are
// hidden, because this dialog already has a title, a close button and a way out to a new tab,
// and `FitH` scales the page to the width of the frame so the text is readable without
// zooming in. `scrollbar` is left alone on purpose — a resume runs to more than one page.
// The "open in a new tab" link keeps the plain URL, where the browser's toolbar is wanted.
const PAGE_ONLY = '#toolbar=0&navpanes=0&view=FitH';

/** `actions` puts buttons in the head, beside Close: a recruiter reading a resume should be
 *  able to save or invite without closing it first. Left out, the head is as it was. */
export default function ResumeViewer({ url, name = 'Resume.pdf', actions, onClose }) {
  return (
    <Dialog label={`Resume: ${name}`} onClose={onClose} className="ui-viewer">
      <div className="ui-viewer__head">
        <FileText aria-hidden="true" />
        <p className="ui-viewer__title">{name}</p>
        <a className="ui-icon-btn" href={url} target="_blank" rel="noreferrer" aria-label="Open in a new tab" title="Open in a new tab">
          <ExternalLink aria-hidden="true" />
        </a>
        {/* Actions sit immediately left of the close, which is a circled cross in the corner
            rather than a word: it is the one control that must be unmistakable. */}
        {actions && <div className="ui-viewer__actions">{actions}</div>}
        <button type="button" className="ui-viewer__close" onClick={onClose} aria-label="Close" title="Close">
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="ui-viewer__body">
        <iframe className="ui-viewer__frame" src={`${url}${PAGE_ONLY}`} title={name} />
        <p className="ui-text-xs ui-text-muted">Private file · shared only with recruiters on Cato</p>
      </div>
    </Dialog>
  );
}
