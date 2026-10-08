// stats-by-size: player and AI core stats at each size, computed with the game's own functions and config
// (planning 00_기준/master/능력치.md). One place to read HP rules, regen, movement, sprint gauge, attack cadence,
// damage and dodge side by side.
// Usage: node tools/stats-by-size.mjs [--sizes=20,50,100,150,200,300,400,500] [--json] [--ai-hp=<per size>] [--player-hp=<per size>]
//   default prints a markdown table per group; --json prints the raw rows; --ai-hp / --player-hp override
//   balance ai.hpPerSize / player.hpPerSize to compare HP rules (player 0 = growth rule).
import {createGame} from './headless.mjs';
import {aiMaxHp, playerMaxHp, growthFromSize, computeMaxStack} from '../js/entity.js';
import {attackDamageForSize, defenseForSize, applyDefense, attackRangeForSize, attackChargeDistanceForSize, attackChargeDurationForSize, dodgeDistanceForSize} from '../js/combat.js';

const args = process.argv.slice(2);
const sizesArg = args.find((a) => a.startsWith('--sizes='));
const sizes = sizesArg ? sizesArg.split('=')[1].split(',').map(Number) : [20, 50, 100, 150, 200, 300, 400, 500];
const b = createGame(1).balance, flag = (name) => { const a = args.find((s) => s.startsWith(`--${name}=`)); return a ? Number(a.split('=')[1]) : null; };
if (flag('ai-hp') != null) b.ai.hpPerSize = flag('ai-hp');
if (flag('player-hp') != null) b.player.hpPerSize = flag('player-hp');
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100, pct = (v) => `${r1(v * 100)}%`;

export function statsAt(size, balance = b) {
  const growth = growthFromSize(size, balance.player.startingSize, balance.growth.growthToSizeRatio, balance.growth);
  const hp = {player: playerMaxHp(size, growth, balance), ai: aiMaxHp(size, balance)};
  const regen = balance.healthRegen.baseRate + size * balance.healthRegen.regenPerSize;
  const full = 1 + (balance.attack.maxChargeDamageBonus ?? 1), base = balance.attack.baseDamageMultiplier ?? 1;
  const raw = attackDamageForSize(size, balance) * base * full, hit = applyDefense(raw, size, balance);
  const sprint = balance.sprint ?? {};
  return {
    size, growth: Math.round(growth),
    playerMaxHp: Math.round(hp.player), aiMaxHp: Math.round(hp.ai),
    regenPerSecond: r1(regen), playerRegenPct: pct(regen / hp.player), aiRegenPct: pct(regen / hp.ai), regenDelay: balance.healthRegen.delay,
    playerSpeed: balance.player.moveSpeed, aiSpeed: `${r1(balance.ai.movementSpeed * .8)}~${r1(balance.ai.movementSpeed * 1.2)}`,
    sprint: size >= (sprint.unlockSize ?? 150) ? `×${sprint.speedMultiplier ?? 2.1} · ${sprint.capacitySeconds ?? 3}초 · 회복 ${r1((sprint.capacitySeconds ?? 3) / (sprint.recoveryPerSecond ?? .6))}초` : '잠김',
    attackStacks: computeMaxStack(size, balance.skills.attackStackThresholds),
    playerAttackCooldown: balance.attack.attackCooldown, aiAttackCooldown: balance.ai.attackCooldown,
    fullChargeSeconds: balance.attack.manualChargeSeconds ?? .9, dashSeconds: r2(attackChargeDurationForSize(size, balance)),
    range: Math.round(attackRangeForSize(size, balance)), chargeDistance: Math.round(attackChargeDistanceForSize(size, balance)), apexChargeDistance: Math.round(attackChargeDistanceForSize(size, balance, true)),
    fullHitRaw: Math.round(raw), defense: r1(defenseForSize(size, balance)), fullHitSameSize: Math.round(hit),
    fullHitPctOfPlayer: pct(hit / hp.player), fullHitPctOfAi: pct(hit / hp.ai),
    hitsToKillPlayer: Math.ceil(hp.player / hit), hitsToKillAi: Math.ceil(hp.ai / hit),
    dodgeStacks: computeMaxStack(size, balance.skills.dodgeStackThresholds), dodgeCooldown: balance.dodge.dodgeCooldown,
    dodgeDistance: Math.round(dodgeDistanceForSize(size, balance)), dodgeInvincible: balance.dodge.dodgeInvincibleTime,
  };
}

const groups = [
  ['체력·회복', [['size', '크기'], ['growth', '누적 성장'], ['playerMaxHp', '플레이어 최대 체력'], ['aiMaxHp', 'AI 최대 체력'], ['regenPerSecond', '자연 회복/초'], ['playerRegenPct', '플레이어 %/초'], ['aiRegenPct', 'AI %/초']]],
  ['이동·달리기', [['size', '크기'], ['playerSpeed', '플레이어 속도'], ['aiSpeed', 'AI 속도'], ['sprint', '달리기(플레이어)']]],
  ['공격', [['size', '크기'], ['attackStacks', '공격 스택'], ['playerAttackCooldown', '스택 충전(플레이어 초)'], ['aiAttackCooldown', '스택 충전(AI 초)'], ['fullChargeSeconds', '풀차지(초)'], ['dashSeconds', '돌진(초)'], ['range', '사거리'], ['chargeDistance', '돌진 거리'], ['apexChargeDistance', '최상위 돌진 거리']]],
  ['피해·방어(같은 크기끼리 풀차지)', [['size', '크기'], ['fullHitRaw', '풀차지 피해'], ['defense', '방어'], ['fullHitSameSize', '실제 피해'], ['fullHitPctOfPlayer', '플레이어 체력 대비'], ['fullHitPctOfAi', 'AI 체력 대비'], ['hitsToKillPlayer', '플레이어 처치 타수'], ['hitsToKillAi', 'AI 처치 타수']]],
  ['회피', [['size', '크기'], ['dodgeStacks', '회피 스택'], ['dodgeCooldown', '스택 충전(초)'], ['dodgeDistance', '거리'], ['dodgeInvincible', '무적(초)']]],
];

if (process.argv[1]?.endsWith('stats-by-size.mjs')) {
  const rows = sizes.map((s) => statsAt(s));
  if (args.includes('--json')) console.log(JSON.stringify(rows, null, 2));
  else {
    console.log(`HP 규칙: 플레이어 ${b.player.hpPerSize > 0 ? `크기 × ${b.player.hpPerSize}` : `${b.player.startingHp} + 성장 × ${b.player.hpPerGrowth}`} · AI 크기 × ${b.ai.hpPerSize ?? 5}\n`);
    for (const [title, cols] of groups) {
      console.log(`### ${title}\n\n| ${cols.map((c) => c[1]).join(' | ')} |\n|${cols.map(() => '---').join('|')}|`);
      for (const r of rows) console.log(`| ${cols.map((c) => r[c[0]]).join(' | ')} |`);
      console.log('');
    }
  }
}
