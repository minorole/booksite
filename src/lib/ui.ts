export const HOVER_LIFT_SHADOW = [
  // Smooth micro-interaction: lift on hover, subtle shadow, keep focus ring
  "transition-all duration-200 ease-out",
  "hover:-translate-y-0.5 hover:shadow-md",
  "active:translate-y-0",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
  "focus-within:ring-2 focus-within:ring-neutral-300",
].join(" ")

// Standard focus treatment for input-like controls
// - Keep an accessible ring; hide the inner border to avoid a double outline
export const FOCUS_RING = [
  // Global focus style: no outer ring/offset; highlight with inner border
  "focus-visible:outline-none",
  "focus-visible:ring-0",
  "focus-visible:ring-offset-0",
  "focus-visible:border-ring",
  // Include non-:visible fallbacks for components using plain :focus
  "focus:outline-none",
  "focus:ring-0",
  "focus:ring-offset-0",
  "focus:border-ring",
].join(" ")

// Home page input thresholds
// - EN: words (space-separated)
// - ZH: characters (ignoring whitespace), since spaces are uncommon
export const HOME_INPUT_MIN_WORDS_EN = 6
export const HOME_INPUT_MIN_CHARS_ZH = 12

// Toast configuration (single source of truth)
export const TOAST_LIMIT = 1
export const TOAST_REMOVE_DELAY = 1000000
