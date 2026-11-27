// Responsibility 1 — Anurag Karki (6838852): choosing, checking, trimming and uploading a video.
// UI from Figma "P4b · Onboarding – pitch video" — Nusrat Begam (6638009).
//
// One page, two modes:
//   mode="pitch" (default)  the onboarding elevator pitch, step 2 of 2
//   mode="extra"            an extra video added later from My profile (/videos/add)
// Every video carries a title from the fixed list and an optional caption (issue #3).
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, CircleAlert, Sparkles, RotateCcw, Upload, Video } from 'lucide-react';
import { VideoTrim } from 'react-video-trim';
import { trimVideo } from 'react-video-trim/plugins/webcodecs';
import 'react-video-trim/style.css';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext.jsx';
import AppHeader from '../../components/AppHeader.jsx';
import OnboardingStepper from '../../components/OnboardingStepper.jsx';
import { Button, Dialog, Logo, SelectField } from '../../components/ui/primitives.jsx';
import VideoRecorder from '../../components/ui/VideoRecorder.jsx';
import { canRecord } from '../../utils/media.js';
import { duration as formatDuration, fileSize } from '../../utils/format.js';

// Used until GET /api/options answers; the server is the source of truth for all of these.
const FALLBACK = {
  max_video_seconds: 60,
  recommended_pitch_seconds: 20,
  max_video_caption: 200,
  max_video_title: 80,
  video_titles: ['About me', "A project I'm proud of", 'Why this field', 'Free topic'],
  free_topic_title: 'Free topic',
};

const OnboardingVideo = ({ mode = 'pitch' }) => {
  const isPitch = mode === 'pitch';
  const [limits, setLimits] = useState(FALLBACK);
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState(isPitch ? 'About me' : 'Free topic');
  // Issue #3: the three structured titles are fixed, but a free-topic video is the
  // applicant's own, so they may write their own wording over it. Blank keeps the default.
  const [topic, setTopic] = useState('');
  const [caption, setCaption] = useState('');
  // The fixed title to go back to from a free topic, and whether Free topic was just picked
  // (so the text box takes the cursor then, but not when the page opens on it).
  const [lastFixed, setLastFixed] = useState(FALLBACK.video_titles[0]);
  const [pickedFree, setPickedFree] = useState(false);
  const [trimSource, setTrimSource] = useState(0); // the chosen file's full length, for the trim dialog
  const [isTrimming, setIsTrimming] = useState(false);
  const [showTrimming, setShowTrimming] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recording, setRecording] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [picker, setPicker] = useState(null);

  const MAX_SECONDS = limits.max_video_seconds;
  const SUGGESTED = limits.recommended_pitch_seconds;

  // Talking points read off the resume (the same background read that fills the profile).
  // The read may still be running when this page opens, so keep asking for up to a minute.
  // "loading" until it lands; "ready" with points; "none" means the timed tips stay.
  const [points, setPoints] = useState([]);
  const [pointsStatus, setPointsStatus] = useState(isPitch ? 'loading' : 'none');
  useEffect(() => {
    if (!isPitch) return undefined;
    let active = true;
    let tries = 0;
    let timer;
    const check = () => {
      api.get('/profiles/me').then((profile) => {
        if (!active) return;
        if (profile.talking_points?.length) { setPoints(profile.talking_points); setPointsStatus('ready'); return; }
        if (profile.parse_status === 'pending' && tries < 24) { tries += 1; timer = setTimeout(check, 2500); return; }
        setPointsStatus('none');
      }).catch(() => { if (active) setPointsStatus('none'); });
    };
    check();
    return () => { active = false; clearTimeout(timer); };
  }, [isPitch]);

  useEffect(() => {
    let active = true;
    api.get('/options')
      .then((options) => { if (active) setLimits({ ...FALLBACK, ...options }); })
      .catch(() => {}); // the fallback limits are fine; the server validates anyway
    return () => { active = false; };
  }, []);

  // One blob URL per chosen file, not one per render.
  const trimUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    event.target.value = ''; // so picking the same file again still counts as a change
    if (!selectedFile) return;

    // Changed their mind mid-recording: the file wins and the camera switches off.
    setRecording(false);
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
      // Browsers often report a clip half a second longer than it is, so allow for that
      // before sending anyone to the trimmer.
      setFile(selectedFile);
      setTrimSource(vidDuration);
      setDuration(Math.min(vidDuration, MAX_SECONDS));
      if (vidDuration > MAX_SECONDS + 0.5) {
        setShowTrimming(true);
        setMessage(`Select the beginning and end of a clip of up to ${MAX_SECONDS} seconds, then trim it.`);
      } else {
        setMessage('Your video is ready to upload.');
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Could not read video metadata. Please try another file.');
    };
  };

  // Recorded in the browser: the length is the one the recorder measured, because a
  // MediaRecorder blob normally reports its duration as Infinity.
  const onRecorded = (recorded, seconds) => {
    setRecording(false);
    setError('');
    setSaved(false);
    setShowTrimming(false);
    setFile(recorded);
    setDuration(Math.min(seconds, MAX_SECONDS));
    setMessage('Your video is ready to upload.');
  };

  const startRecording = () => {
    if (showTrimming) { setShowTrimming(false); setFile(null); setMessage(''); }
    setError('');
    setRecording(true);
  };

  const trimInBrowser = async (range) => {
    if (isTrimming) return;

    const clipLength = range.endTime - range.startTime;
    if (clipLength <= 0 || clipLength > MAX_SECONDS) {
      setError(`Please select a clip that is ${MAX_SECONDS} seconds or less.`);
      return;
    }

    try {
      setIsTrimming(true);
      setError('');
      setMessage('Creating your trimmed video…');

      const result = await trimVideo(file, { ...range, outputFormat: 'mp4' });
      const trimmedFile = new File([result.blob], isPitch ? 'pitch.mp4' : 'video.mp4', { type: 'video/mp4' });

      setFile(trimmedFile);
      setDuration(clipLength);
      setShowTrimming(false);
      setMessage(`Your ${formatDuration(clipLength)} clip is ready to upload.`);
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
      form.append('kind', isPitch ? 'pitch' : 'extra');
      form.append('duration_seconds', duration.toFixed(1));
      form.append('title', isFreeTopic ? (topic.trim() || freeTitle) : title);
      form.append('description', caption.trim());

      await api.post('/videos', form);
      setSaved(true);
      setMessage('');
      // Saving the video is the last thing this step asks for, so it moves on by itself:
      // the pitch to the review step, an extra video back to My profile.
      navigate(isPitch ? '/onboarding/review' : '/profile', isPitch ? undefined : { state: { toast: 'Video added' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const ready = file && !showTrimming;
  const choose = () => picker?.click();
  const tooLong = caption.length > limits.max_video_caption;
  // The server names the one title the applicant may write over, so the string is not
  // hardcoded twice. `shownTitle` is what the video will actually be called.
  const freeTitle = limits.free_topic_title || 'Free topic';
  const isFreeTopic = title === freeTitle;
  const shownTitle = isFreeTopic ? (topic.trim() || freeTitle) : title;

  // Chosen first: the title is the question the video answers, so it frames what they record.
  // One box. A dropdown of the fixed titles until "Free topic" is picked; then the same box
  // becomes a text field for the applicant's own title, with the arrow taking them back to
  // the list (and to the fixed title they had before).
  const titleField = (
    <div className="pv-title">
      {isFreeTopic ? (
        <div className="ui-field">
          <label className="ui-label" htmlFor="video-title">Title</label>
          <div className="ui-control-wrap">
            <input id="video-title" className="ui-control pv-title__input" autoFocus={pickedFree}
              value={topic} maxLength={limits.max_video_title} placeholder={`${freeTitle}: type your own title`}
              aria-describedby="video-title-help" onChange={(event) => setTopic(event.target.value)} />
            <button type="button" className="pv-title__back" aria-label="Choose from the list of titles"
              onClick={() => { setTopic(''); setTitle(lastFixed); }}>
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
          <p id="video-title-help" className="ui-help">Left blank it stays “{freeTitle}”. Up to {limits.max_video_title} characters.</p>
        </div>
      ) : (
        <SelectField
          label="Title"
          help={isPitch ? 'What this pitch is about.' : 'What this video is about.'}
          value={title}
          onChange={(next) => {
            if (next === freeTitle) setPickedFree(true); else setLastFixed(next);
            setTitle(next);
          }}
          options={limits.video_titles.map((option) => ({ value: option, label: option }))}
        />
      )}
    </div>
  );

  const captionField = (
    <div className="pv-about">
      <div className="ui-field">
        <label className="ui-label" htmlFor="video-caption">Caption (optional)</label>
        <textarea
          id="video-caption"
          className="ui-control"
          rows={3}
          value={caption}
          maxLength={limits.max_video_caption}
          placeholder={isFreeTopic ? 'Say what this video is about…' : 'Add a little context…'}
          onChange={(event) => setCaption(event.target.value)}
        />
        <p className={tooLong ? 'ui-field-error' : 'ui-help'}>
          {caption.length} / {limits.max_video_caption}
        </p>
      </div>
    </div>
  );

  // The status and the three buttons. Rendered twice and CSS shows one: laid over the video on
  // a phone, so the video can have the whole width, and stacked in the side column from tablet
  // up, under the tips. Both sit inside the form, so "Use this video" submits from either.
  const actionBar = (where) => (
    <div className={`pv-bar pv-bar--${where}`}>
      <span className="ui-text-xs ui-text-muted pv-bar__status">
        {ready ? `${formatDuration(duration)} · ${fileSize(file.size)} · ${saved ? 'saved' : 'looks good'}` : isTrimming ? 'Trimming…' : message || 'No video chosen yet'}
      </span>
      {recording ? (
        // While the camera is on, the recorder has its own controls; the only thing left to
        // offer is changing their mind, which closes the recorder (handleFileChange).
        <div className="pv-bar__actions">
          <Button variant="secondary" size="md" icon={Upload} onClick={choose}>Choose a file instead</Button>
        </div>
      ) : (
      <div className="pv-bar__actions">
        {canRecord() && (
          <Button variant="secondary" size="md" icon={Video} onClick={startRecording} disabled={isUploading || isTrimming}>
            {file ? 'Record again' : 'Record'}
          </Button>
        )}
        <Button variant="secondary" size="md" icon={RotateCcw} onClick={choose} disabled={isUploading || isTrimming}>{file ? 'Choose another' : 'Choose video'}</Button>
        <Button type="submit" variant="accent" size="md" icon={Check} disabled={!ready || isUploading || saved || tooLong}>
          {isUploading ? 'Uploading…' : saved ? 'Saved' : isPitch ? 'Use this video' : 'Add video'}
        </Button>
      </div>
      )}
    </div>
  );

  const beforeYouRecord = (
    <section className="ui-card">
      <h2 className="ui-h5">Before you record</h2>
      <ul className="in-points">
        {['Face a light source, not a window behind you', 'Quiet room, phone on silent', 'Look at the camera, not at the screen', `Max ${MAX_SECONDS} s; MP4, MOV or WebM`].map((tip) => <li key={tip}><Check aria-hidden="true" />{tip}</li>)}
      </ul>
    </section>
  );

  const form = (
    <form className="pv-column" onSubmit={upload}>
      <div className="ob-heading">
        {isPitch && <p className="ui-overline">Step 2 of 3</p>}
        <h1 className="ui-h2">{isPitch ? 'Record your pitch' : 'Add a video'}</h1>
        <p className="ui-lead">
          {isPitch
            ? 'This is the first thing a recruiter sees. Be yourself: say who you are, one thing you are proud of, and what you are looking for.'
            : `An extra video sits on your profile next to your pitch. Keep it under ${MAX_SECONDS} seconds.`}
        </p>
      </div>

      <div className="pv-grid">
        <div className="pv-left">
          {/* Phones have no side column, so the talking points shrink to one line here. */}
          {isPitch && pointsStatus === 'ready' && (
            <p className="pv-hint"><Sparkles aria-hidden="true" /><span><strong>Hint:</strong> talk about {points.join(' · ')}</span></p>
          )}
          {titleField}

          <section className="ui-card pv-player" aria-label={isPitch ? 'Your pitch video' : 'Your video'}>
            <input ref={setPicker} type="file" accept="video/mp4,video/quicktime,video/webm" capture="user" hidden onChange={handleFileChange} />
            <div className="pv-stage">
              {recording ? (
                <VideoRecorder maxSeconds={MAX_SECONDS} onRecorded={onRecorded} onCancel={() => setRecording(false)} />
              ) : file && trimUrl ? (
                <>
                  <span className="pv-stage__label">{isPitch ? 'Your pitch' : shownTitle}</span>
                  <span className="pv-stage__label pv-stage__label--right">{formatDuration(duration)}</span>
                  <video key={trimUrl} src={trimUrl} controls playsInline />
                </>
              ) : (
                <div className="pv-empty">
                  <span className="pv-empty__icon"><Upload aria-hidden="true" /></span>
                  <strong>Record or choose a video</strong>
                  <span>Portrait works best. Up to {MAX_SECONDS} seconds; longer clips can be trimmed.</span>
                  <div className="pv-empty__actions">
                    {canRecord() && <Button variant="accent" size="md" icon={Video} onClick={startRecording}>Record now</Button>}
                    <Button variant="secondary" size="md" icon={Upload} onClick={choose}>Choose a file</Button>
                  </div>
                </div>
              )}
            </div>
            {actionBar('overlay')}
          </section>

          {captionField}

          {message && !ready && !saved && <p className="ui-alert ui-alert--info" role="status"><CircleAlert />{message}</p>}
          {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}
        </div>

        {/* Desktop: what to say on the left, the video in the middle, getting ready and the
            buttons on the right. "Add a video" has no script card, so its tips take the left. */}
        <aside className="pv-side pv-side--start">
          {isPitch && pointsStatus === 'ready' ? (
            <section className="ui-card pv-points" aria-live="polite">
              <h2 className="ui-h5">Talk about these</h2>
              <p className="ui-text-xs ui-text-muted">Picked from your resume. In about {SUGGESTED} seconds, two or three of them is plenty.</p>
              <ul className="pv-points__list">
                {points.map((point) => <li key={point}><Sparkles aria-hidden="true" />{point}</li>)}
              </ul>
            </section>
          ) : isPitch ? (
            <section className="ui-card">
              <h2 className="ui-h5">What to say in about {SUGGESTED} seconds</h2>
              {pointsStatus === 'loading' && (
                <p className="pv-points__reading" role="status">
                  <span className="rv-dots" aria-hidden="true"><i /><i /><i /></span>
                  Reading your resume for talking points…
                </p>
              )}
              <p className="ui-text-xs ui-text-muted">A short pitch holds attention. You have up to {MAX_SECONDS} seconds if you need them.</p>
              {[['0–5 s', 'Your name, field of study and year'],
                [`5–${Math.round(SUGGESTED * 0.75)} s`, 'One project or result you are proud of'],
                [`${Math.round(SUGGESTED * 0.75)}–${SUGGESTED} s`, 'The kind of role you are looking for']].map(([time, text]) => (
                <p className="fc-part" key={time}><span className="pv-time">{time}</span><span className="ui-text-soft">{text}</span></p>
              ))}
            </section>
          ) : beforeYouRecord}
        </aside>
        <aside className="pv-side pv-side--end">
          {isPitch && beforeYouRecord}
          <section className="ui-card pv-side-actions" aria-label="Video actions">{actionBar('side')}</section>
        </aside>
      </div>

      {/* Trimming gets a popup of its own: its timeline needs the width, which the video
          column does not have once the page is in three columns, nor does a phone. */}
      {showTrimming && trimUrl && (
        <Dialog label="Trim your video" className="ui-dialog pv-trim-dialog"
          onClose={() => { if (!isTrimming) onCancelTrimming(); }}>
          <div className="pv-trim-dialog__head">
            <h2 className="ui-h5">Trim your video</h2>
            <p className="ui-text-soft">It is {formatDuration(Math.round(trimSource))} long. Pick a part of up to {MAX_SECONDS} seconds, then trim it.</p>
          </div>
          <div className="trim-box">
            <VideoTrim src={trimUrl} onTrim={trimInBrowser} onCancel={onCancelTrimming} maxDuration={MAX_SECONDS} />
          </div>
        </Dialog>
      )}

      <div className="pv-actions">
        <Button variant="secondary" size="lg" icon={ArrowLeft} to={isPitch ? '/onboarding/profile' : '/profile'}>
          {isPitch ? 'Back' : 'Cancel'}
        </Button>
      </div>
    </form>
  );

  // Extra videos are added from inside the app, so they keep the normal header.
  if (!isPitch) {
    return (
      <div className="ui-app">
        <AppHeader />
        {/* --app: inside the app, so the phone layout also leaves room for the tab bar. */}
        <main className="pv-main pv-main--app">{form}</main>
      </div>
    );
  }

  return (
    <div className="ui-app">
      <header className="ob-header">
        <Logo />
        <OnboardingStepper current={2} />
        <Button variant="ghost" size="md" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>Save and exit</Button>
      </header>
      <main className="pv-main">{form}</main>
    </div>
  );
};

export default OnboardingVideo;
