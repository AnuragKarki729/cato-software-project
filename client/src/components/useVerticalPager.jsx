// Responsibility 1 — Anurag Karki (6838852): one card at a time, moved by scroll or swipe.
//
// Shared by the video viewer, the recruiter's ranked results, the video feed and Explore so
// they all feel identical: a wheel on a desktop and a thumb on a phone do the same thing, and
// so do the arrow keys and the chevrons. Written once rather than four times, because
// "scrolling here behaves like swiping there" is only true if it is literally the same code.
//
// `useVerticalPager` moves through a list. `useGridPager` moves through a grid: down the
// candidates and sideways through one candidate's videos (Explore).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

const WHEEL_THRESHOLD = 24;   // ignore the small deltas a trackpad emits while settling
const SWIPE_THRESHOLD = 48;   // px of travel before a drag counts as a swipe
const COOLDOWN_MS = 420;      // one gesture moves one card, not a whole run of them

/** Inertial scrolling keeps firing long after the flick, so each move opens a short window
 *  during which further input is ignored. */
function useCooldown() {
  const last = useRef(0);
  return useCallback((move) => {
    const now = Date.now();
    if (now - last.current < COOLDOWN_MS) return;
    last.current = now;
    move();
  }, []);
}

/** Reads a touch gesture: how far it travelled, and whether it was mostly up/down or
 *  mostly sideways. A sideways drag belongs to whatever is inside the card — a row of
 *  skills, or the videos on Explore — so a list pager must not steal it. */
function useTouch() {
  const start = useRef(null);
  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      start.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    },
    read: (event) => {
      const from = start.current;
      start.current = null;
      if (!from) return null;
      const touch = event.changedTouches[0];
      // Positive means "onwards": a swipe up, or a swipe to the left.
      const y = from.y - (touch?.clientY ?? from.y);
      const x = from.x - (touch?.clientX ?? from.x);
      const sideways = Math.abs(x) > Math.abs(y);
      const travelled = sideways ? x : y;
      if (Math.abs(travelled) < SWIPE_THRESHOLD) return null;
      return { sideways, step: travelled > 0 ? 1 : -1 };
    },
  };
}

export function useVerticalPager({ index, count, onIndex, enabled = true }) {
  const [direction, setDirection] = useState(0); // which way the next card comes in from
  const cooldown = useCooldown();
  const touch = useTouch();

  const hasPrevious = index > 0;
  const hasNext = index < count - 1;

  const go = useCallback((step) => {
    const next = index + step;
    if (next < 0 || next >= count) return;
    setDirection(step);
    onIndex(next);
  }, [index, count, onIndex]);

  const nudge = useCallback((step) => cooldown(() => go(step)), [cooldown, go]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event) => {
      if (event.target.closest?.('input, select, textarea, [role="dialog"] input')) return;
      if (event.key === 'ArrowUp') { event.preventDefault(); go(-1); }
      if (event.key === 'ArrowDown') { event.preventDefault(); go(1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, enabled]);

  const handlers = {
    onWheel: (event) => {
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
      nudge(event.deltaY > 0 ? 1 : -1);
    },
    onTouchStart: touch.onTouchStart,
    onTouchEnd: (event) => {
      const gesture = touch.read(event);
      // Swiping up moves on, the same direction a scroll down does.
      if (gesture && !gesture.sideways) nudge(gesture.step);
    },
  };

  // Feeds the CSS: the incoming card slides from below or from above.
  const slide = direction === 0 ? 'none' : direction > 0 ? 'next' : 'previous';

  return { direction, slide, go, nudge, hasPrevious, hasNext, handlers };
}

/**
 * Two axes at once, for Explore: up and down move between candidates, left and right move
 * through what that candidate has — their videos, then their resume.
 *
 * The column axis is a loop. On past the last comes the first again, and back from the first
 * comes the last. The slide direction follows the gesture and not the index, so going on from
 * the end slides in from the right like any other step forward: it never rewinds to get
 * there. The row axis does not loop — a list of candidates has a real end.
 */
export function useGridPager({
  row, rowCount, column, columnCount, onRow, onColumn, enabled = true,
}) {
  const [slide, setSlide] = useState('none'); // 'next' | 'previous' | 'forward' | 'back'
  const cooldown = useCooldown();
  const touch = useTouch();

  const hasAbove = row > 0;
  const hasBelow = row < rowCount - 1;

  const goRow = useCallback((step) => {
    const next = row + step;
    if (next < 0 || next >= rowCount) return;
    setSlide(step > 0 ? 'next' : 'previous');
    onRow(next);
  }, [row, rowCount, onRow]);

  const goColumn = useCallback((step) => {
    if (columnCount <= 1) return;
    // Wrapping both ways, so neither end is a dead end.
    const next = (column + step + columnCount) % columnCount;
    setSlide(step > 0 ? 'forward' : 'back');
    onColumn(next);
  }, [column, columnCount, onColumn]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event) => {
      if (event.target.closest?.('input, select, textarea, [role="dialog"] input')) return;
      if (event.key === 'ArrowUp') { event.preventDefault(); goRow(-1); }
      if (event.key === 'ArrowDown') { event.preventDefault(); goRow(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); goColumn(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); goColumn(1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goRow, goColumn, enabled]);

  const handlers = {
    onWheel: (event) => {
      // A trackpad can report both; the larger movement is the one the person meant.
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const delta = sideways ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < WHEEL_THRESHOLD) return;
      cooldown(() => (sideways ? goColumn : goRow)(delta > 0 ? 1 : -1));
    },
    onTouchStart: touch.onTouchStart,
    onTouchEnd: (event) => {
      const gesture = touch.read(event);
      if (!gesture) return;
      cooldown(() => (gesture.sideways ? goColumn : goRow)(gesture.step));
    },
  };

  return { slide, goRow, goColumn, hasAbove, hasBelow, handlers };
}

/** Live answer to a media query, read straight from `matchMedia` rather than copied into
 *  state, so resizing the window cannot leave the layout and the behaviour disagreeing for a
 *  render. */
function useMedia(query, fallback = false) {
  const subscribe = useCallback((changed) => {
    const media = window.matchMedia?.(query);
    if (!media) return () => {};
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, [query]);
  const read = useCallback(() => !!window.matchMedia?.(query).matches, [query]);
  return useSyncExternalStore(subscribe, read, () => fallback);
}

/** True on a small screen. This is about LAYOUT — how much room there is — so a narrow window
 *  counts whether or not it is a phone: the details become an overlay and the video fills the
 *  card. The breakpoint is the same 760px the CSS uses; keep the two equal.
 *
 *  For how the person actually works the thing, ask `useTouchScreen` instead.
 */
export function useSmallScreen(query = '(max-width: 760px)') {
  return useMedia(query);
}

/** True when the primary pointer is a finger.
 *
 *  This is about INPUT, not room, and the two used to be the same question: a narrow window
 *  was assumed to be a phone, so a desktop browser dragged narrow lost its video controls and
 *  was left with tap-to-play and nothing to scrub with. `(pointer: coarse)` asks the browser
 *  what it actually has, so a mouse keeps its controls at any width and a phone keeps its
 *  gestures on any screen.
 *
 *  It describes the PRIMARY pointer, so a laptop with a touchscreen reads as fine — right for
 *  us, since that person still has the trackpad the controls are built for.
 */
export function useTouchScreen() {
  return useMedia('(pointer: coarse)');
}
