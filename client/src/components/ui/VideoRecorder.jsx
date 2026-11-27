// Responsibility 1 — Anurag Karki (6838852): recording a pitch in the browser.
//
// Works on desktop and mobile web through getUserMedia + MediaRecorder, so an applicant
// never has to leave the page or find a file. The camera is asked for a portrait 9:16
// stream; phones give exactly that, and most webcams cannot, so the preview shows the real
// frame letterboxed inside the portrait box rather than a cropped lie about what is being
// recorded.
//
// The measured length is handed back with the file. MediaRecorder's WebM output usually
// reports `duration: Infinity`, so reading it back off the blob is not reliable.
import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, RotateCcw, Square, Video } from 'lucide-react';
import { Button } from './primitives.jsx';
import { duration as formatDuration } from '../../utils/format.js';
import { pickType } from '../../utils/media.js';

// First one the browser supports: Chrome and Firefox give WebM, Safari gives MP4.
export default function VideoRecorder({ maxSeconds = 60, onRecorded, onCancel }) {
  const [state, setState] = useState('starting'); // starting | ready | recording | error
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const preview = useRef(null);
  const stream = useRef(null);
  const recorder = useRef(null);
  const chunks = useRef([]);
  const startedAt = useRef(0);
  const ticker = useRef(null);

  const stopCamera = useCallback(() => {
    clearInterval(ticker.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          // Portrait if the camera can do it. A phone obliges; a laptop webcam usually
          // ignores this and stays landscape, which the preview then shows honestly.
          video: {
            facingMode: 'user',
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: { ideal: 9 / 16 },
          },
          audio: true,
        });
        if (cancelled) { media.getTracks().forEach((t) => t.stop()); return; }
        stream.current = media;
        if (preview.current) {
          preview.current.srcObject = media;
          preview.current.play().catch(() => {});
        }
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err?.name === 'NotAllowedError'
          ? 'Your browser blocked the camera. Allow camera and microphone access, then try again.'
          : err?.name === 'NotFoundError'
            ? 'No camera found. You can choose a video file instead.'
            : 'Could not start the camera. You can choose a video file instead.');
        setState('error');
      }
    })();
    // Closed from outside (e.g. the applicant chose a file instead): throw the half-recorded
    // clip away. Without detaching onstop, stopping the camera ends the recorder, which hands
    // the partial clip to onRecorded and it would replace the file they just picked.
    return () => {
      cancelled = true;
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === 'recording') recorder.current.stop();
      }
      stopCamera();
    };
  }, [stopCamera]);

  const finish = useCallback(() => {
    const seconds = Math.min((Date.now() - startedAt.current) / 1000, maxSeconds);
    const type = recorder.current?.mimeType || 'video/webm';
    const extension = type.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks.current, { type: type.split(';')[0] });
    chunks.current = [];
    stopCamera();
    onRecorded(new File([blob], `pitch.${extension}`, { type: type.split(';')[0] }), seconds);
  }, [maxSeconds, onRecorded, stopCamera]);

  function start() {
    if (!stream.current) return;
    const mimeType = pickType();
    try {
      recorder.current = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    } catch {
      setError('This browser cannot record video. Please choose a video file instead.');
      setState('error');
      return;
    }
    chunks.current = [];
    recorder.current.ondataavailable = (event) => { if (event.data?.size) chunks.current.push(event.data); };
    recorder.current.onstop = finish;
    recorder.current.start(250); // flush regularly so nothing is lost if the tab stalls
    startedAt.current = Date.now();
    setElapsed(0);
    setState('recording');
    ticker.current = setInterval(() => {
      const seconds = (Date.now() - startedAt.current) / 1000;
      setElapsed(seconds);
      if (seconds >= maxSeconds) stop();
    }, 100);
  }

  function stop() {
    clearInterval(ticker.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  function cancel() {
    clearInterval(ticker.current);
    if (recorder.current?.state === 'recording') {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    stopCamera();
    onCancel();
  }

  if (state === 'error') {
    return (
      <div className="vr vr--error">
        <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>
        <Button variant="secondary" size="md" onClick={onCancel}>Close</Button>
      </div>
    );
  }

  const left = Math.max(0, maxSeconds - elapsed);

  return (
    <div className="vr">
      {/* Mirrored, the way people expect to see themselves. The recording is not mirrored. */}
      <video ref={preview} className="vr__preview" playsInline muted autoPlay />

      <div className="vr__bar">
        {state === 'recording' ? (
          <>
            <span className="vr__dot" aria-hidden="true" />
            <span className="vr__time" role="timer">{formatDuration(elapsed)} · {Math.ceil(left)}s left</span>
          </>
        ) : (
          <span className="vr__time">Up to {maxSeconds}s</span>
        )}
      </div>

      <div className="vr__actions">
        {state === 'recording' ? (
          <Button variant="accent" size="md" icon={Square} onClick={stop}>Stop</Button>
        ) : (
          <Button variant="accent" size="md" icon={Video} onClick={start} disabled={state !== 'ready'}>
            {state === 'ready' ? 'Start recording' : 'Starting camera…'}
          </Button>
        )}
        <Button variant="secondary" size="md" icon={RotateCcw} onClick={cancel}>Cancel</Button>
      </div>
    </div>
  );
}
