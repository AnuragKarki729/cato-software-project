// Responsibility 1 — Anurag Karki (6838852): a tap standing in for a hover, on a static card.
//
// Static cards only. A card that sits still — a fact tile, a file row — shows the text it had
// to cut off when you point at it. On a desktop that is plain CSS `:hover`; a touch device has
// no hover at all, so a tap takes its place, and that is what this hook is for.
//
// The cards on the video pages are deliberately left out. Hover there already means "scale up
// and play the first few seconds", and a card that a swipe pages through must not react to the
// swipe passing over it.
//
// Nothing measures whether the text is actually cut off, because nothing needs to:
// un-clamping text that already fits changes nothing, so only a card with something hidden
// grows. See the "Static cards" block in styles/pages.css for the CSS side.
import { useRef, useState } from 'react';

const TAP_SLOP = 10; // px of travel still counted as a tap rather than a swipe

/**
 * Props to spread onto the card element, including its class name.
 * `useReveal('ex-fact')` → `{ className: 'ex-fact' | 'ex-fact is-open', onPointerDown, onPointerUp }`
 */
export default function useReveal(baseClass) {
  const [open, setOpen] = useState(false);
  const from = useRef(null);

  return {
    className: open ? `${baseClass} is-open` : baseClass,
    onPointerDown: (event) => {
      // A mouse is ignored: it has :hover, and clicking to expand would fight with it.
      from.current = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event) => {
      const start = from.current;
      from.current = null;
      if (!start) return;
      // A drag is a swipe meant for the pager underneath, not a tap meant for this card.
      const moved = Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y);
      if (moved <= TAP_SLOP) setOpen((was) => !was);
    },
  };
}
