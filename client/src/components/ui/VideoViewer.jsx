// Responsibility 1 — Anurag Karki (6838852): one of a candidate's cards, full size.
//
// The thumbnails on a profile are only that, so everything about a card lives here: the title
// across the top of the frame, the badge and caption along the bottom, and the actions. Moving
// between cards works the same way on every device: a scroll of the wheel, a swipe of the
// thumb, the arrow keys, or the chevrons above and below.
//
// It takes videos, and optionally `extra` cards that are not videos at all — the About sheet
// and the resume on the candidate profile. An extra card supplies its own content, so this
// component only frames and pages it; `wide` asks for a landscape frame instead of 9:16,
// which is what makes a resume readable rather than a column of small print.
//
// The row is circular: on past the last card comes the first, and back from the first comes
// the last. The slide follows the gesture and not the index, so going on from the end comes in
// from below like any other step forward.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Badge, Dialog } from './primitives.jsx';

const WHEEL_THRESHOLD = 24;   // ignore the small deltas a trackpad emits while settling
const SWIPE_THRESHOLD = 48;   // px of travel before a drag counts as a swipe
const COOLDOWN_MS = 420;      // one gesture moves one card, not a whole run of them

export default function VideoViewer({ videos = [], extra = [], index, onIndex, onClose, actions }) {
  const [direction, setDirection] = useState(0); // which way the next card slides in from
  const player = useRef(null);
  const lastMove = useRef(0);
  const touchStart = useRef(null);

  // Videos first, then whatever else the page wants paged alongside them, in that order — the
  // same order the row of cards on the page is in, so an index means the same thing in both.
  const items = [
    ...videos.map((video) => ({
      kind: 'video', key: `v${video.id}`, video, title: video.title, caption: video.description,
      badge: video.kind === 'pitch' ? 'Elevator pitch' : 'Extra video',
      tone: video.kind === 'pitch' ? 'accent' : 'neutral',
    })),
    ...extra,
  ];
  const item = items[index];
  const count = items.length;

  const go = useCallback((step) => {
    if (count < 2) return;
    setDirection(step);
    onIndex(((index + step) % count + count) % count);
  }, [index, count, onIndex]);

  // Inertial scrolling keeps firing long after the flick, so each move opens a short
  // window during which further input is ignored.
  const nudge = useCallback((step) => {
    const now = Date.now();
    if (now - lastMove.current < COOLDOWN_MS) return;
    lastMove.current = now;
    go(step);
  }, [go]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowUp') { event.preventDefault(); go(-1); }
      if (event.key === 'ArrowDown') { event.preventDefault(); go(1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);

  // Opening the viewer, and every move within it, starts the video. A card that is not a
  // video has no player, and the ref is simply null.
  useEffect(() => {
    player.current?.play().catch(() => {});
  }, [index]);

  if (!item) return null;

  const onWheel = (event) => {
    if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
    nudge(event.deltaY > 0 ? 1 : -1);
  };

  const onTouchStart = (event) => {
    touchStart.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const travelled = touchStart.current - (event.changedTouches[0]?.clientY ?? touchStart.current);
    touchStart.current = null;
    // Swiping up moves on, the same direction a scroll down does.
    if (Math.abs(travelled) >= SWIPE_THRESHOLD) nudge(travelled > 0 ? 1 : -1);
  };

  const slide = direction === 0 ? 'none' : direction > 0 ? 'next' : 'previous';

  return (
    <Dialog label={`${item.title} · ${item.kind === 'video' ? 'video' : 'card'}`} onClose={onClose} className="vv">
      {/* Always in the layout, invisible when there is nowhere to go: the frame must not
          shift position between one card and the next. With more than one card there is
          always somewhere to go, because the row comes round. */}
      <button type="button" className={`vv__nav${count > 1 ? '' : ' is-off'}`} onClick={() => go(-1)}
        aria-label="Previous card" disabled={count < 2} aria-hidden={count < 2} tabIndex={count > 1 ? 0 : -1}>
        <ChevronUp aria-hidden="true" />
      </button>

      <div className={`vv__viewport${item.wide ? ' is-wide' : ''}`} onWheel={onWheel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Keyed on the card so each one mounts fresh and plays its slide-in. */}
        <div className="vv__frame pager-slide" key={item.key} data-direction={slide}>
          {item.kind === 'video'
            ? <video ref={player} src={item.video.url} controls playsInline autoPlay />
            : <div className="vv__sheet">{item.node}</div>}

          <div className="vv__top">
            <p className="vv__title">{item.title}</p>
            <button type="button" className="vv__close" onClick={onClose} aria-label="Close">
              <X aria-hidden="true" />
            </button>
          </div>

          {/* A card that is not a video carries its own meaning, so nothing is laid over it. */}
          {item.kind === 'video' && (
            <div className="vv__bottom">
              <div className="vv__badges">
                <Badge tone={item.tone} dot={false}>{item.badge}</Badge>
              </div>
              {item.caption && <p className="vv__caption">{item.caption}</p>}
              {actions && <div className="vv__actions">{actions(item.video)}</div>}
            </div>
          )}
        </div>
      </div>

      <button type="button" className={`vv__nav${count > 1 ? '' : ' is-off'}`} onClick={() => go(1)}
        aria-label="Next card" disabled={count < 2} aria-hidden={count < 2} tabIndex={count > 1 ? 0 : -1}>
        <ChevronDown aria-hidden="true" />
      </button>

      {count > 1 && (
        <p className="vv__count" aria-live="polite">{index + 1} of {count}</p>
      )}
    </Dialog>
  );
}
