// Figma "Video poster" (sizes SM 160x90, tile, LG). Shows the video's first frame with a
// play button; pressing play swaps in the native controls and plays inline.
// Responsibilities 2 and 5 — Nusrat Begam (6638009). Videos come from Responsibility 1.
import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { duration as formatDuration, initials } from '../../utils/format.js';

const PREVIEW_SECONDS = 5;

// True only for a real pointer that can hover, which excludes phones and tablets. A touch
// "hover" is just the moment before a tap, so previewing on it would fire on every tap.
const canHover = () => typeof window !== 'undefined'
  && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

export default function VideoPoster({ src, size = 'sm', kind, seconds, name = '', label,
  emptyText = 'No pitch video yet', onPlay, preview = false }) {
  const video = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // With onPlay the poster stays a thumbnail and the caller decides what happens, which is
  // how My profile opens its videos in a viewer instead of playing them in the tile.
  const play = () => {
    if (onPlay) { onPlay(); return; }
    setPlaying(true);
    // Wait for the controls to render, then start playback.
    requestAnimationFrame(() => video.current?.play().catch(() => {}));
  };

  // Hovering plays the opening of the video, muted, looping back so it never runs past the
  // first few seconds. Pointer events rather than mouse events, so a pen behaves too.
  // Muted deliberately: a page of cards that talk when the cursor crosses them is startling,
  // and a browser refuses sound before the page has been interacted with anyway, so it would
  // have been silent on the first hover and loud on the rest.
  const startPreview = (event) => {
    if (!preview || !src || playing || event.pointerType === 'touch' || !canHover()) return;
    const element = video.current;
    if (!element) return;
    element.muted = true;
    element.currentTime = 0;
    element.play().then(() => setPreviewing(true)).catch(() => {});
  };

  const stopPreview = () => {
    if (!previewing) return;
    setPreviewing(false);
    const element = video.current;
    if (!element) return;
    element.pause();
    element.currentTime = 0;
  };

  return (
    <div className={`ui-poster ui-poster--${size}${playing ? ' is-playing' : ''}${preview ? ' ui-poster--preview' : ''}${previewing ? ' is-previewing' : ''}`}
      onPointerEnter={startPreview} onPointerLeave={stopPreview}>
      {!playing && <span className="ui-poster__initials" aria-hidden="true">{initials(name)}</span>}
      {src && (
        // #t=0.1 makes Safari paint the first frame before playback.
        <video ref={video} src={`${src}#t=0.1`} preload="metadata" playsInline controls={playing}
          onEnded={() => setPlaying(false)} aria-label={label || `${name} video`}
          onTimeUpdate={previewing ? (event) => {
            // Loop the opening rather than playing the whole thing under the cursor.
            if (event.currentTarget.currentTime > PREVIEW_SECONDS) event.currentTarget.currentTime = 0;
          } : undefined} />
      )}
      {!playing && (
        <>
          <span className="ui-poster__shade" aria-hidden="true" />
          {src ? (
            <button type="button" className="ui-poster__hit" onClick={play} aria-label={`Play ${label || `${name}'s video`}`}>
              <span className="ui-poster__play" aria-hidden="true">
                <Play fill="currentColor" strokeWidth={0} />
              </span>
            </button>
          ) : (
            <span className="ui-poster__none">{emptyText}</span>
          )}
          {src && seconds ? <span className="ui-poster__duration">{formatDuration(seconds)}</span> : null}
          {kind && <span className="ui-poster__kind">{kind}</span>}
        </>
      )}
    </div>
  );
}
