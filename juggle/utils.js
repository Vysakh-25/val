export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}
