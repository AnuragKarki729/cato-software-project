// Responsibility 1 — Anurag Karki (6838852): what the browser can do with video.
//
// Separate from VideoRecorder.jsx because a page needs to ask "can this browser record?"
// before it decides whether to offer the button, which means asking without loading the
// recorder. A file that exports both a component and a helper also breaks Vite's fast
// refresh, so the helper lives here.
//
// The order matters: Chrome and Firefox prefer WebM, Safari and iOS only do MP4. Unchanged
// from the list this used to carry inside VideoRecorder.jsx.
const TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

/** The best container this browser can record, or null if it cannot record at all. */
export const pickType = () => (typeof MediaRecorder === 'undefined'
  ? null
  : TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || null);

/** True when the browser can both reach the camera and write a file.
 *  getUserMedia also needs a secure context, so this is false on plain http. */
export const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && pickType());
