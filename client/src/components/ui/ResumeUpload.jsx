// Figma "Upload" (states Empty and Done). POST /api/profiles/me/resume (multipart, PDF only, 5 MB).
// Responsibility 2 — Nusrat Begam (6638009).
import { useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { api } from '../../api.js';
import { fileSize, uploadedAgo } from '../../utils/format.js';
import { Badge, Button, ConfirmDialog, IconButton } from './primitives.jsx';

const MAX_BYTES = 5 * 1024 * 1024;

export default function ResumeUpload({ profile, onChange, onOpen, onError, showBadge = true }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function upload(file) {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return onError('Please choose a PDF file.');
    if (file.size > MAX_BYTES) return onError('Your resume must be 5 MB or smaller.');
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      onChange(await api.post('/profiles/me/resume', form), 'uploaded');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    try {
      onChange(await api.delete('/profiles/me/resume'), 'removed');
      setConfirming(false);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const picker = (
    <input ref={input} type="file" accept="application/pdf,.pdf" hidden
      onChange={(event) => upload(event.target.files[0])} />
  );

  if (!profile?.resume_url) {
    return (
      <>
        {picker}
        <button type="button" className={`ui-drop${over ? ' is-over' : ''}`} disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => { event.preventDefault(); setOver(false); upload(event.dataTransfer.files[0]); }}>
          <span className="ui-drop__icon"><Upload aria-hidden="true" /></span>
          <span className="ui-drop__line">{busy ? 'Uploading your resume…' : <>Drag your resume here, or <strong>browse files</strong></>}</span>
          <span className="ui-text-xs ui-text-muted">PDF only · up to 5 MB</span>
        </button>
      </>
    );
  }

  return (
    <div className="ui-file">
      {picker}
      <span className="ui-file__icon"><FileText aria-hidden="true" /></span>
      <span className="ui-file__text">
        <button type="button" className="ui-file__name" onClick={onOpen} title="Open in the viewer">{profile.resume_name || 'Resume.pdf'}</button>
        <span className="ui-file__meta">{busy ? 'Uploading…' : [fileSize(profile.resume_size), uploadedAgo(profile.resume_uploaded_at)].filter(Boolean).join(' · ')}</span>
      </span>
      {showBadge && <Badge tone="success">Uploaded</Badge>}
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => input.current?.click()}>Replace</Button>
      <IconButton icon={Trash2} label="Remove resume" disabled={busy} onClick={() => setConfirming(true)} />
      {confirming && (
        <ConfirmDialog title="Remove your resume?" message="Recruiters will no longer be able to open it. You can upload a new one any time."
          confirmLabel="Remove" busy={busy} onConfirm={remove} onCancel={() => setConfirming(false)} />
      )}
    </div>
  );
}
