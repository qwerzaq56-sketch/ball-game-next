import {touchActionFeedback} from './touchFeedback.js';
import {skillCooldownRow} from './statusLabels.js';
// R-VIS-010 B quiet HUD: desktop ability rings (bottom centre) and the toggle tray's ⋯ overflow.
// Phones use the dodge-arc buttons in touchControls.js instead of the rings.

const ABILITIES = [
  {kind: 'attack', name: '공격', key: '좌클릭', color: '#fca5a5'},
  {kind: 'dodge', name: '회피', key: 'Space', color: '#93c5fd'},
  {kind: 'special', slot: 'E', key: 'E'},
  {kind: 'ultimate', slot: 'R', key: 'R'},
];

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

// What one ring shows: fill percent, the big label inside, the name and the key/seconds line under it.
export function abilityRing(game, ability) {
  const player = game.player, feedback = touchActionFeedback(game, ability.kind);
  if (ability.slot) {
    const unlocked = game.abilities.unlocked(player, ability.slot);
    if (!unlocked) return {state: 'locked', fill: 0, label: ability.slot, name: feedback.label.replace('\n', ' '), sub: ability.key, dots: null};
    const row = skillCooldownRow(game, player, ability.slot);
    return {state: row.state, fill: row.progress, label: ability.slot, name: row.name, sub: row.state === 'cooldown' || row.state === 'casting' ? row.text : ability.key, dots: null};
  }
  const attack = ability.kind === 'attack', count = attack ? player.attackStack : player.dodgeStack, max = attack ? player.attackMaxStack : player.dodgeMaxStack;
  if (max <= 0) return {state: 'locked', fill: 0, label: ability.name.slice(0, 1), name: feedback.label.replace('\n', ' '), sub: ability.key, dots: null};
  return {state: feedback.state, fill: count >= max ? 100 : Math.round(feedback.progress * 100), label: String(count), name: ability.name, sub: ability.key, dots: {count, max}};
}

export class HudB {
  constructor(game) {
    this.game = game;
    this.bar = document.getElementById('ability-bar');
    this.items = ABILITIES.map(ability => {
      const root = el('div', 'ab'), ring = el('div', 'ab-ring'), label = el('span', 'ab-label'), dots = el('span', 'ab-dots');
      const name = el('span', 'ab-name'), sub = el('span', 'ab-key');
      root.dataset.kind = ability.kind;
      ring.append(label);
      root.append(ring, dots, name, sub);
      this.bar.append(root);
      return {ability, root, ring, label, dots, name, sub, key: ''};
    });
    this.more = document.getElementById('tray-more');
    this.overflow = document.getElementById('tray-overflow');
    this.more.addEventListener('click', () => this.setOverflow(this.overflow.hidden));
    document.addEventListener('pointerdown', e => {if (!this.overflow.hidden && !e.target.closest?.('#toggle-tray')) this.setOverflow(false);});
  }
  setOverflow(open) {
    this.overflow.hidden = !open;
    this.more.setAttribute('aria-expanded', String(open));
  }
  update() {
    if (!this.bar.getClientRects().length) return;// hidden on phones
    for (const item of this.items) {
      const ring = abilityRing(this.game, item.ability);
      const color = item.ability.slot ? this.game.player.colorHex : item.ability.color;
      const key = [ring.state, ring.fill, ring.label, ring.name, ring.sub, ring.dots?.count, ring.dots?.max, color].join('|');
      if (key === item.key) continue;
      item.key = key;
      item.root.dataset.state = ring.state;
      item.ring.style.setProperty('--p', ring.fill);
      item.ring.style.setProperty('--ab-color', color);
      item.label.textContent = ring.label;
      item.name.textContent = ring.name;
      item.sub.textContent = ring.sub;
      item.dots.replaceChildren(...(ring.dots ? Array.from({length: ring.dots.max}, (_, i) => {const dot = el('i'); if (i < ring.dots.count) dot.className = 'on'; return dot;}) : []));
      item.root.setAttribute('aria-label', `${ring.name} ${ring.dots ? `${ring.dots.count}/${ring.dots.max}` : ''} ${ring.sub}`.trim());
    }
  }
}
