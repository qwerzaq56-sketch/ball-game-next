// Body-ring gaps outside radius r, in SCREEN pixels (divide by camera zoom when drawing).
// One table so rings keep their order and spacing at every zoom (planning 전투UI.md U-RING-01).
export const BODY_RING_PX = Object.freeze({
  hit: 3,             // hit outline, 0.18 s
  frozen: 4,          // frozen dashed ring
  goldShell: 6,       // invulnerable gold shell (shieldStateArt / actionArt)
  absorbLock: 7,      // summon "cannot absorb" dashed ring
  apex: 9,            // apex gold ring
  absorbProgress: 11, // being-absorbed progress arc
  charm: 13,          // flower / shell ornaments (centre of each)
  frostMark: 16,      // frost mark dashed ring
  morale: 19,         // morale short arc (top)
  obsidian: 22,       // obsidian shield arc
  command: 25,        // command dashed ring
});

export const ringRadius = (r, key, zoom = 1) => r + BODY_RING_PX[key] / zoom;
