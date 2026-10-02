import { random } from './random.js';

const PREFIXES = ['새벽', '은빛', '붉은', '고요한', '바람', '별빛', '그늘', '푸른', '황금', '안개', '달빛', '잿빛'];
const NAMES = ['여우', '늑대', '매', '사슴', '표범', '까마귀', '수달', '살쾡이', '독수리', '고래', '호랑이', '곰'];

// Called exactly once at birth. The suffix keeps repeated combinations distinguishable.
export function assignDisplayName(entity) {
  if (entity.displayName || entity.behavior === 'orb') return;
  entity.displayName = entity.behavior === 'player' ? '나' :
    `${PREFIXES[Math.floor(random('names') * PREFIXES.length)]} ${NAMES[Math.floor(random('names') * NAMES.length)]} ${entity.id}`;
}

// Preserve committed score-order ties; do not make UI rankings oscillate at equal scores.
export function scoreRanking(units, previous = []) {
  const order = new Map(previous.map((id, index) => [id, index]));
  return units.filter(e => e.alive && e.behavior !== 'orb').sort((a,b) =>
    b.score - a.score || (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) || a.id - b.id);
}

export function durationLabel(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return s < 60 ? `${s}초` : `${Math.floor(s / 60)}분 ${s % 60}초`;
}

export function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// Screen-space label layout: top ranks win crowded areas, and HUD rectangles are reserved.
export function layoutNameLabels(candidates, width, height, reserved = []) {
  const occupied = [...reserved], labels = [];
  for (const candidate of candidates) {
    const {x,y,textWidth} = candidate;
    for (const shift of [0, -22, -44]) {
      const box = {left:x-textWidth/2-5, right:x+textWidth/2+5, top:y+shift-17, bottom:y+shift+3};
      if (box.left < 4 || box.right > width-4 || box.top < 4 || box.bottom > height-4 || occupied.some(r => overlaps(box,r))) continue;
      occupied.push(box); labels.push({...candidate, y:y+shift, box}); break;
    }
  }
  return labels;
}
