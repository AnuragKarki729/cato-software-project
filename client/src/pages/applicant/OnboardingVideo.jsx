// Responsibility 1 — Anurag Karki (6838852): choosing, checking, trimming and uploading the pitch.
// UI from Figma "P4b · Onboarding – pitch video" — Nusrat Begam (6638009).
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CircleAlert, CircleCheck, RotateCcw, Upload } from 'lucide-react';
import { VideoTrim } from 'react-video-trim';
import { trimVideo } from 'react-video-trim/plugins/webcodecs';
import 'react-video-trim/style.css';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Logo } from '../../components/ui/primitives.jsx';
import { duration as formatDuration, fileSize } from '../../utils/format.js';

const MAX_SECONDS = 20;

const OnboardingVideo = () => {
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [showTrimming, setShowTrimming] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [picker, setPicker] = useState(null);

  // One blob URL per chosen file, not one per render.
  const trimUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setError('');
    setMessage('');
    setFile(null);
    setSaved(false);
    setShowTrimming(false);

    // Hidden video element to read the metadata
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(selectedFile);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const { duration: vidDuration } = video;
      if (!Number.isFinite(vidDuration) || vidDuration <= 0) {
        setError('Could not read how long this video is. Please try another file.');
        return;
      }

      // Portrait and landscape are both fine: the Figma pitch player is 16:9.
      // Browsers often report a 20 s clip as 20.02 s, so allow half a second before asking to trim.
      setFile(selectedFile);
      setDuration(Math.min(vidDuration, MAX_SECONDS));
      if (vidDuration > MAX_SECONDS + 0.5) {
        setShowTrimming(true);
        setMessage('Select the beginning and end of a 20-second clip, then trim it.');
      } else {
        setMessage('Your video is ready to upload.');
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Could not read video metadata. Please try another file.');
    };
  };

  const trimInBrowser = async (range) => {
    if (isTrimming) return;

    const clipLength = range.endTime - range.startTime;
    if (clipLength <= 0 || clipLength > MAX_SECONDS) {
      setError('Please select a clip that is 20 seconds or less.');
      return;
    }

    try {
      setIsTrimming(true);
      setError('');
      setMessage('Creating your trimmed video…');

      const result = await trimVideo(file, { ...range, outputFormat: 'mp4' });
      const trimmedFile = new File([result.blob], 'pitch.mp4', { type: 'video/mp4' });

      setFile(trimmedFile);
      setDuration(clipLength);
      setShowTrimming(false);
      setMessage('Your 20-second clip is ready to upload.');
    } catch {
      setError('Could not trim this video. Please try another video or use Chrome/Edge.');
      setMessage('');
    } finally {
      setIsTrimming(false);
    }
  };

  const onCancelTrimming = () => {
    setShowTrimming(false);
    setFile(null);
    setMessage('');
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file || isUploading || showTrimming) return;

    try {
      setIsUploading(true);
      setError('');

      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'pitch');
      form.append('duration_seconds', duration.toFixed(1));

      await api.post('/videos', form);
      setSaved(true);
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const ready = file && !showTrimming;
  const choose = () => picker?.click();

  return (
    <div className="ui-app">
      <header className="ob-header">
        <Logo />
        <ol className="ui-stepper" aria-label="Onboarding steps">
          <li className="ui-step is-done"><span className="ui-step__dot"><Check aria-hidden="true" /></span><span className="ui-step__text"><small>Step 1</small><strong>Profile &amp; resume</strong></span></li>
          <li aria-hidden="true" className="ui-step__line is-done" />
          <li className="ui-step is-current" aria-current="step"><span className="ui-step__dot">2</span><span className="ui-step__text"><small>Step 2</small><strong>Pitch video</strong></span></li>
        </ol>
        <Button variant="ghost" size="md" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>Save and exit</Button>
      </header>

      <main className="pv-main">
        <form className="pv-column" onSubmit={upload}>
          <div className="ob-heading">
            <p className="ui-overline">Step 2 of 2</p>
            <h1 className="ui-h2">Record your pitch</h1>
            <p className="ui-lead">This is the first thing a recruiter sees. Be yourself: say who you are, one thing you are proud of, and what you are looking for.</p>
          </div>

          <div className="pv-grid">
            <div className="pv-left">
              <section className="ui-card pv-player" aria-label="Your pitch video">
                <input ref={setPicker} type="file" accept="video/mp4,video/quicktime,video/webm" capture="user" hidden onChange={handleFileChange} />
                <div className="pv-stage">
                  {showTrimming && trimUrl ? (
                    <div className="trim-box">
                      <VideoTrim src={trimUrl} onTrim={trimInBrowser} onCancel={onCancelTrimming} maxDuration={MAX_SECONDS} />
                    </div>
                  ) : file && trimUrl ? (
                    <>
                      <span className="pv-stage__label">Your pitch</span>
                      <span className="pv-stage__label pv-stage__label--right">{formatDuration(duration)}</span>
                      <video key={trimUrl} src={trimUrl} controls playsInline />
                    </>
                  ) : (
                    <button type="button" className="pv-empty" onClick={choose}>
                      <span className="pv-empty__icon"><Upload aria-hidden="true" /></span>
                      <strong>Record or choose a video</strong>
                      <span>On a phone this opens the camera. Up to {MAX_SECONDS} seconds; longer clips can be trimmed.</span>
                    </button>
                  )}
                </div>
                <div className="pv-bar">
                  <span className="ui-text-xs ui-text-muted">
                    {ready ? `${formatDuration(duration)} · ${fileSize(file.size)} · ${saved ? 'saved' : 'looks good'}` : isTrimming ? 'Trimming…' : message || 'No video chosen yet'}
                  </span>
                  <div className="pv-bar__actions">
                    <Button variant="secondary" size="md" icon={RotateCcw} onClick={choose} disabled={isUploading || isTrimming}>{file ? 'Re-record' : 'Choose video'}</Button>
                    <Button type="submit" variant="accent" size="md" icon={Check} disabled={!ready || isUploading || saved}>
                      {isUploading ? 'Uploading…' : saved ? 'Saved' : 'Use this video'}
                    </Button>
                  </div>
                </div>
              </section>
              {message && !ready && !saved && <p className="ui-alert ui-alert--info" role="status"><CircleAlert />{message}</p>}
              {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}
              {saved && <p className="ui-alert ui-alert--success" role="status"><CircleCheck />Pitch saved: {formatDuration(duration)}, checked and ready. You can replace it any time from My profile.</p>}
            </div>

            <aside className="pv-side">
              <section className="ui-card">
                <h2 className="ui-h5">What to say in {MAX_SECONDS} seconds</h2>
                {[['0–5 s', 'Your name, field of study and year'], ['5–15 s', 'One project or result you are proud of'], [`15–${MAX_SECONDS} s`, 'The kind of role you are looking for']].map(([time, text]) => (
                  <p className="fc-part" key={time}><span className="pv-time">{time}</span><span className="ui-text-soft">{text}</span></p>
                ))}
              </section>
              <section className="ui-card">
                <h2 className="ui-h5">Before you record</h2>
                <ul className="in-points">
                  {['Face a light source, not a window behind you', 'Quiet room, phone on silent', 'Look at the camera, not at the screen', `Max ${MAX_SECONDS} s; MP4, MOV or WebM`].map((tip) => <li key={tip}><Check aria-hidden="true" />{tip}</li>)}
                </ul>
              </section>
            </aside>
          </div>

          <div className="pv-actions">
            <Button variant="secondary" size="lg" icon={ArrowLeft} to="/onboarding/profile">Back</Button>
            <Button variant="primary" size="lg" icon={Check} to="/profile" disabled={!saved}>Finish and see my profile</Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default OnboardingVideo;
