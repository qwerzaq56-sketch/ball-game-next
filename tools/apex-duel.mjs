// apex-duel: player vs apex AI duel with the real game code (planning 00_기준/master/밸런싱.md B-FIGHT-01, inbox g6lbahey 2026-10-08).
// Usage: node tools/apex-duel.mjs [playerSize=500] [aiSize=470] [seconds=60]
// Prints max HP of both, one full-charge hit each way (as % of the target's max HP), then two runs:
//   idle  — the player stands still: how often and how hard the AI attacks;
//   fight — the player full-charges at the AI whenever it can: who wins and how fast.
// Also prints the player/AI max HP at common sizes, because the two use different HP rules (R-GROWTH-002 vs size × 5).
import {createGame} from './headless.mjs';
import {AIEntity} from '../js/ai.js';
import {attackDamageForEntity, applyDefense, startAttack, canStartAttack} from '../js/combat.js';

const [playerSize = 500, aiSize = 470, seconds = 60] = process.argv.slice(2).map(Number);
const grow = (e, size, b) => { while (e.size < size) e.addGrowth(Math.max(1, size - e.size), b); };
function setup() {
  const g = createGame(11), b = g.balance, p = g.player;
  grow(p, playerSize, b); p.color = 'green'; p.hp = p.maxHp; g.biomes.enabled = false;
  const ai = new AIEntity({balance: b, x: p.x + 600, y: p.y, startSize: 20, color: 'red', colorHex: '#f00'});
  grow(ai, aiSize, b); ai.apex = true; ai.hp = ai.maxHp; g.entities = [p, ai];
  return {g, b, p, ai};
}
function run(mode) {
  const {g, b, p, ai} = setup(), attacks = [];
  let playerAttacks = 0, wasAttacking = false;
  for (let i = 0; i < seconds * 60 && p.alive && ai.alive; i++) {
    if (mode === 'fight' && canStartAttack(p) && Math.hypot(ai.x - p.x, ai.y - p.y) < 700) { startAttack(p, Math.atan2(ai.y - p.y, ai.x - p.x), b, 1); playerAttacks++; }
    g.update(1 / 60);
    const attacking = ai.attackState === 'TELEGRAPH' || ai.attackState === 'CHARGING';
    if (attacking && !wasAttacking) attacks.push(ai.currentAttackCharge);
    wasAttacking = attacking;
  }
  return {mode, seconds: +g.gameTime.toFixed(1), winner: !ai.alive ? 'player' : !p.alive ? 'ai' : 'none', playerHp: +(p.hp / p.maxHp).toFixed(2), aiHp: +(ai.hp / ai.maxHp).toFixed(2),
    playerAttacks, aiAttacks: attacks.length, aiFullCharge: attacks.filter((c) => c === 1).length};
}
const {b, p, ai} = setup(), full = 1 + (b.attack.maxChargeDamageBonus ?? 1);
const hit = (a, t) => applyDefense(attackDamageForEntity(a, b) * (b.attack.baseDamageMultiplier ?? 1) * full, t.size, b);
console.log(JSON.stringify({playerSize, aiSize, playerMaxHp: Math.round(p.maxHp), aiMaxHp: Math.round(ai.maxHp),
  aiFullHitOnPlayerPct: +(100 * hit(ai, p) / p.maxHp).toFixed(1), playerFullHitOnAiPct: +(100 * hit(p, ai) / ai.maxHp).toFixed(1)}));
const curve = [50, 100, 200, 300, 400, 500].map((size) => { const g = createGame(11), q = g.player; grow(q, size, g.balance); return {size, playerMaxHp: Math.round(q.maxHp), aiMaxHp: Math.round(q.size * 5)}; });
console.log(JSON.stringify({maxHpBySize: curve}));
for (const mode of ['idle', 'fight']) console.log(JSON.stringify(run(mode)));
