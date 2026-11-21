// Figma "Video poster" (sizes SM 160x90, tile, LG). Shows the video's first frame with a
// play button; pressing play swaps in the native controls and plays inline.
// Responsibilities 2 and 5 — Nusrat Begam (6638009). Videos come from Responsibility 1.
import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { duration as formatDuration, initials } from '../../utils/format.js';

export default function VideoPoster({ src, size = 'sm', kind, seconds, name = '', label, emptyText = 'No pitch video yet' }) {
  const video = useRef(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    setPlaying(true);
    // Wait for the controls to render, then start playback.
    requestAnimationFrame(() => video.current?.play().catch(() => {}));
  };

  return (
    <div className={`ui-poster ui-poster--${size}${playing ? ' is-playing' : ''}`}>
      {!playing && <span className="ui-poster__initials" aria-hidden="true">{initials(name)}</span>}
      {src && (
        // #t=0.1 makes Safari paint the first frame before playback.
        <video ref={video} src={`${src}#t=0.1`} preload="metadata" playsInline controls={playing}
          onEnded={() => setPlaying(false)} aria-label={label || `${name} video`} />
      )}
      {!playing && (
        <>
          <span className="ui-poster__shade" aria-hidden="true" />
          {src ? (
            <button type="button" className="ui-poster__play" onClick={play} aria-label={`Play ${label || `${name}'s video`}`}>
              <Play fill="currentColor" strokeWidth={0} aria-hidden="true" />
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
