// Responsibility 1 and 3 — Anurag Karki (6838852): a row that slides sideways.
//
// Two jobs, one component: the skills on a candidate card, where the list has no upper bound
// and must not be allowed to push the card out of shape, and the field-of-study tabs on
// Explore, which read like a row of genres. A thumb drags the row; a mouse gets the chevrons,
// because there is no way to drag a row with a mouse.
//
// The chevrons appear only when there is something that way, and they keep their place when
// there is not, so the row does not jump as it is scrolled.
import { Children, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EDGE = 2;          // px of slack: a scroll never lands exactly on the end
const STEP_RATIO = 0.8;  // a chevron moves most of a row, leaving a little overlap

/**
 * `batch` groups the children into pages of that many. Each page is the full width of the
 * row and wraps inside it, so everything on the page is visible at once and a chevron or a
 * swipe moves exactly one page — a carousel of batches rather than one endless row. Without
 * `batch` the children form a single row that slides continuously.
 */
export default function Carousel({ label, batch, className, children }) {
  const track = useRef(null);
  const [back, setBack] = useState(false);
  const [forward, setForward] = useState(false);

  const measure = useCallback(() => {
    const row = track.current;
    if (!row) return;
    setBack(row.scrollLeft > EDGE);
    setForward(row.scrollLeft + row.clientWidth < row.scrollWidth - EDGE);
  }, []);

  // Re-measured on every render, because new children change the width of the row. Both
  // values are booleans, so an unchanged measurement does not cost a re-render.
  useEffect(() => {
    measure();
    const row = track.current;
    if (!row || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  });

  const slide = (step) => {
    const row = track.current;
    if (!row) return;
    // A batched row moves exactly one page; an unbatched one moves most of a row.
    const by = batch ? row.clientWidth : Math.max(120, row.clientWidth * STEP_RATIO);
    // `scroll-behavior: smooth` on the track does the animation.
    row.scrollBy({ left: step * by, behavior: 'smooth' });
  };

  const arrow = (shown, step, Icon, text) => (
    <button type="button" className={`cr__arrow${shown ? '' : ' is-off'}`} onClick={() => slide(step)}
      aria-label={text} disabled={!shown} aria-hidden={!shown} tabIndex={shown ? 0 : -1}>
      <Icon aria-hidden="true" />
    </button>
  );

  const pages = [];
  if (batch) {
    // toArray drops empty children and keys the rest, so slicing them is safe.
    const items = Children.toArray(children);
    for (let at = 0; at < items.length; at += batch) pages.push(items.slice(at, at + batch));
  }

  // A single page has nowhere to go, so it gets no chevrons at all rather than two invisible
  // ones holding 24px each — in a narrow panel that space belongs to the content. With more
  // than one page they stay in the layout even when off, so the pages do not reflow while
  // they are being moved through. An unbatched row always reserves the space for the same
  // reason: its width changes as it scrolls.
  const single = !!batch && pages.length <= 1;

  return (
    <div className={['cr', batch && 'cr--batched', className].filter(Boolean).join(' ')}>
      {!single && arrow(back, -1, ChevronLeft, batch ? `Previous ${label}` : `Scroll ${label} left`)}
      <div className="cr__track" ref={track} onScroll={measure} role="group" aria-label={label}>
        {batch
          ? pages.map((page, at) => <div className="cr__batch" key={`page${at}`}>{page}</div>)
          : children}
      </div>
      {!single && arrow(forward, 1, ChevronRight, batch ? `More ${label}` : `Scroll ${label} right`)}
    </div>
  );
}
