// small helpers exported for all modules
export function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }
export function dist2(a,b){ const dx=a.x-b.x, dz=a.z-b.z; return dx*dx+dz*dz; }
export function now(){ return performance.now(); }
