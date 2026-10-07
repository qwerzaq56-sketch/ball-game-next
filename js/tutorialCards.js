// R-CTRL-005: tutorial cards for the basic abilities, each species and each terrain with its objects.
// Pure data built from the live balance so numbers on the cards follow tuning. No DOM here.
import {selectedSkill} from './skillCatalog.js';
import {BIOME_OBJECTS, OBJECT_REGIONS, objectPreset} from './biomeObjectCatalog.js';

export const COLOR_NAMES = {cyan: '하늘', blue: '파랑', green: '초록', red: '빨강', yellow: '노랑'};
export const DECKS = [
  {id: 'basic', name: '기본 조작'},
  {id: 'species', name: '종족'},
  {id: 'terrain', name: '지형·오브젝트'},
];
const pct = (v) => `${Math.round(v * 100)}%`;
const num = (v) => String(Math.round(v * 100) / 100);
const unlockAt = (thresholds, stack) => thresholds?.find((t) => t.maxStack >= stack)?.size;

// Basic abilities: attack, dodge, absorb, sprint, companion request.
export function basicCards(balance) {
  const a = balance.attack, d = balance.dodge, s = balance.sprint, sk = balance.skills;
  return [
    {id: 'attack', deck: 'basic', title: '공격', accent: '#f87171',
      keys: {desktop: '좌클릭을 누른 채 충전 · 떼면 발사', touch: '화면 오른쪽을 드래그해 조준 · 손을 떼면 발사'},
      lines: [`크기 ${unlockAt(sk.attackStackThresholds, 1)}에 열리고, 크기 ${unlockAt(sk.attackStackThresholds, 2)}부터 2번 연속 쓸 수 있습니다.`,
        `오래 누를수록 세집니다. 최대 ${num(a.manualChargeSeconds)}초 충전.`,
        '같은 색 아군은 공격하지 않습니다. 다른 색은 공격으로 쓰러뜨려 성장합니다.']},
    {id: 'dodge', deck: 'basic', title: '회피', accent: '#93c5fd',
      keys: {desktop: 'Space를 짧게 눌렀다 떼기', touch: '회피 버튼을 짧게 터치 · 드래그하면 그 방향'},
      lines: [`크기 ${unlockAt(sk.dodgeStackThresholds, 1)}에 열리고, 크기 ${unlockAt(sk.dodgeStackThresholds, 2)}부터 2번 연속 쓸 수 있습니다.`,
        `회피하는 ${num(d.dodgeInvincibleTime)}초 동안 피해를 받지 않습니다. 충전 ${num(d.dodgeCooldown)}초.`,
        '상대의 공격 전조가 보이면 옆으로 피하세요.']},
    {id: 'absorb', deck: 'basic', title: '흡수', accent: '#4ade80',
      keys: {desktop: '흡수 버튼 ON 또는 우클릭 유지', touch: '흡수 ON/OFF 버튼'},
      lines: ['같은 색이면서 나보다 작은 상대에게 붙으면 흡수합니다.',
        '흡수에 성공하면 크게 자랍니다. 흡수하는 동안 체력이 들고, 성공하면 돌려받습니다.',
        '초록 소환 동행은 초록 "흡수 불가" 표시가 사라진 뒤에만 흡수할 수 있습니다.']},
    {id: 'sprint', deck: 'basic', title: '달리기', accent: '#7dd3fc',
      keys: {desktop: 'Space를 0.18초 넘게 누르고 있기', touch: '달리기 버튼'},
      lines: [`크기 ${s.unlockSize}에 열립니다. 이동 속도 ×${num(s.speedMultiplier)}.`,
        `게이지는 체력바 바로 밑에 있습니다. 최대 ${num(s.capacitySeconds)}초 달릴 수 있고, 쉬면 다시 찹니다.`,
        '도망치거나 먹이를 먼저 차지할 때 씁니다.']},
    {id: 'companion', deck: 'basic', title: '동행 요청', accent: '#c4b5fd',
      keys: {desktop: 'Q 동행 제안 · G 동행 이탈', touch: '동행 제안 버튼 · 동행 이탈 버튼'},
      lines: ['근처 같은 색 공에게 함께 다니자고 제안합니다. 5초마다 다시 제안할 수 있습니다.',
        '가까운 같은 색 공 하나마다 공격 +5%, 최대 +15%를 받습니다.',
        '우정 축제 동안에는 다른 색에게도 제안할 수 있습니다.']},
  ];
}

// One line per skill, using the live tuned values.
export function skillLine(s) {
  switch (s.id) {
    case 'cyan-shield': return `주변 아군과 나에게 최대 체력 ${pct(s.shieldHpFraction)} 보호막, ${num(s.shieldDuration)}초.`;
    case 'cyan-chill': return `앞쪽 적에게 피해를 주고 ${num(s.freezeSeconds)}초 얼립니다.`;
    case 'cyan-freeze': return `앞쪽을 크게 휘둘러 피해를 주고 ${num(s.freezeSeconds)}초 얼립니다.`;
    case 'cyan-burst': return `냉기를 휘두른 뒤 ${num(s.blastDelay)}초 뒤에 폭발하고, 냉기 장판이 남습니다.`;
    case 'blue-wave': return '앞으로 파도를 보내 피해를 주고 밀어냅니다. 최상위면 세 갈래가 됩니다.';
    case 'blue-ripple': return '내 주변으로 파도를 퍼뜨려 피해를 주고 밀어냅니다.';
    case 'blue-vortex': return `${num(s.fieldDuration)}초 동안 주변 적을 소용돌이 쪽으로 끌어당깁니다.`;
    case 'blue-trident': return '세 방향으로 파도를 보냅니다.';
    case 'green-invite': return `주변 같은 색을 ${pct(s.acceptChance)} 확률로 동행에 초대하고, 동행을 ${num(s.buffDuration)}초 강화합니다.`;
    case 'green-summon': return `초록 동행 ${s.summonCount}마리를 부릅니다. 소환 동행은 ${num(s.summonAbsorbDelay)}초 동안 흡수할 수 없습니다.`;
    case 'green-morale': return `주변 아군 공격 +${pct(s.buffDamage)}, ${num(s.buffDuration)}초.`;
    case 'red-embers': return `${num(s.fieldDuration)}초 동안 타는 불씨 장판을 깝니다.`;
    case 'red-vigor': return `${num(s.buffDuration)}초 동안 공격 +${pct(s.buffDamage)}, 이동 +${pct(s.buffSpeed - 1)}.`;
    case 'red-muster': return `같은 색을 불러 모아 ${num(s.buffDuration)}초 동안 공격 +${pct(s.buffDamage)}, 이동 +${pct(s.buffSpeed - 1)}.`;
    case 'red-rally': return '조준한 적을 표적으로 찍고, 주변 같은 색 아군을 강화해 함께 공격하게 합니다.';
    case 'yellow-dust': return `${num(s.buffDuration)}초 동안 적 공격이 ${pct(s.missChance)} 빗나가고, 시전 직후 ${num(s.invulnerableSeconds)}초 무적.`;
    case 'yellow-storm': return '넓은 모래바람 장판으로 계속 피해를 줍니다.';
    default: return s.name ?? '';
  }
}

// Species: player-facing bonuses (terrain, absorption), the E/R skills and how that species' AI behaves.
export function speciesCards(balance, colors = balance.colors) {
  const b = balance.biomes ?? {}, ab = balance.absorption ?? {}, unlock = balance.abilitySkills?.unlockSize ?? 100;
  const traits = {
    cyan: [`설원 동상 피해 ${pct(b.cyanFrostResistance ?? .65)} 감소.`],
    blue: [`호수에서 이동 ${pct(b.blueWaterMoveMultiplier ?? .9)} 유지 (다른 종족 ${pct(b.waterMoveMultiplier ?? .65)}).`, `흡수할 때 끌어당기는 힘 ×${num(ab.bluePullMultiplier ?? 1.3)}.`],
    green: ['동행 초대와 소환으로 무리를 만드는 종족입니다.', `흡수로 얻는 성장은 ×${num(ab.greenGrowthMultiplier ?? .85)}로 조금 적습니다.`],
    red: [`화산 용암 피해를 크기에 비례해 줄입니다. 크기 100마다 ${pct(100 * (b.redLavaResistancePerSize ?? .002))}, 최대 ${pct(b.maxRedLavaResistance ?? .85)}.`],
    yellow: [`사막 모래바람 피해 ${pct(b.yellowSandstormResistance ?? .8)} 감소, 모래바람 안에서 방어 +${pct(b.yellowSandstormDefenseBonus ?? .25)}.`],
  };
  const ai = {
    cyan: '하늘 AI는 한곳에 머무는 편이라 천천히 배회합니다.',
    blue: '파랑 AI는 공격을 피한 뒤 1초 안에 반격하려 합니다.',
    green: '초록 AI는 동족을 흡수할 기회의 절반만 잡습니다.',
    red: '빨강 AI는 다른 색 사냥을 더 자주 고릅니다.',
    yellow: '노랑 AI는 목표가 없을 때 방향을 자주 바꿉니다.',
  };
  return colors.map(({id, color}) => {
    const E = selectedSkill(balance, id, 'E'), R = selectedSkill(balance, id, 'R');
    return {id: `species-${id}`, deck: 'species', species: id, title: `${COLOR_NAMES[id] ?? id} 종족`, accent: color,
      lines: [...(traits[id] ?? [])],
      skills: [{slot: 'E', name: E.name, text: skillLine(E), note: `크기 ${unlock}부터`}, {slot: 'R', name: R.name, text: skillLine(R), note: '최상위 포식자 직위'}],
      ai: ai[id] ?? ''};
  });
}

// One line per terrain object, describing what touching it does.
export function objectCardLine(c) {
  switch (c.effect) {
    case 'food': return `먹이 ${c.count}개가 주기적으로 생깁니다.${c.blizzardMultiplier > 1 ? ` 눈보라 때 보상 ×${num(c.blizzardMultiplier)}.` : ''}`;
    case 'heal': return c.continuous ? `안에 있는 동안 초당 최대 체력 ${Math.round(1000 * c.power / Math.max(.001, c.cooldown)) / 10}% 회복.` : `닿으면 체력 +${pct(c.power)}.`;
    case 'shield': return `닿으면 최대 체력 ${pct(c.power)} 보호막, ${num(c.duration)}초.`;
    case 'speed': return `닿으면 이동 +${pct(c.power)}, ${num(c.duration)}초.${c.hpCost ? ` 체력 -${pct(c.hpCost)}.` : ''}`;
    case 'charm': return `닿으면 치장을 하고 ${num(c.duration)}초 동안 동행 수락 +${pct(c.power)}.`;
    case 'frost': return c.continuous ? `안에 있는 동안 동상이 풀리고 동상 저항 +${pct(c.power)}.` : `닿은 뒤 ${num(c.duration)}초 동안 동상 저항 +${pct(c.power)}.`;
    case 'wind-stack': return `${c.stacksRequired}번 모으면 이동 +${pct(c.power)}, ${num(c.duration)}초.`;
    case 'obsidian': return `${c.stacksRequired}번 모으면 최대 체력 ${pct(c.shieldFraction)} 보호막과 공격·방어 +${pct(c.power)}, ${num(c.duration)}초.`;
    case 'berry-spawner': return `열매 ${c.count}개가 주기적으로 열립니다. 일부는 체력 +${pct(c.healFraction)} 회복 열매.`;
    case 'vent': return `${num(c.cycleDuration)}초마다 ${num(c.activeDuration)}초 분출합니다. 분출 중 닿으면 계속 피해. 쉬는 동안은 안전.`;
    case 'current': return '물길을 따라 공과 먹이를 함께 실어 나릅니다.';
    case 'vortex': return '가운데로 천천히 끌어당깁니다. 피해는 없습니다.';
    default: return '';
  }
}

// Range-sustained objects (R-WORLD-014): the effect lasts only while inside.
const CONTINUOUS = ['desert-oasis', 'snow-shelter'];
const TERRAIN = {
  grassland: {lines: () => ['기본 지형입니다. 특별한 위험이 없습니다.'], strong: null},
  forest: {lines: () => ['수풀이 우거져 먹이가 많습니다.'], strong: null},
  lake: {lines: (b) => [`물속에서는 이동이 ${pct(b.waterMoveMultiplier ?? .65)}로 느려집니다.`], strong: 'blue'},
  snow: {lines: (b) => [`${num(b.frostExposureSeconds ?? 6)}초 넘게 머물면 동상에 걸려 체력이 줄어듭니다. 피난석에서 풀립니다.`, '눈보라가 불면 AI의 시야가 좁아집니다.'], strong: 'cyan'},
  desert: {lines: () => ['떠도는 모래바람에 닿으면 계속 피해를 받습니다.', '별 모양 유물을 주우면 60초 동안 보너스를 받습니다.'], strong: 'yellow'},
  volcano: {lines: () => ['주황색 용암 강 위에서는 계속 피해를 받습니다. 가장자리로 지나가세요.'], strong: 'red'},
};

// Terrain: hazards, food reward, the species that handles it best, and the objects placed there.
// `regions` comes from game.biomes.regions ({id,name,reward}); without it the static list is used.
export function terrainCards(balance, regions) {
  const b = balance.biomes ?? {}, list = regions?.length ? regions : Object.entries(OBJECT_REGIONS).map(([id, name]) => ({id, name}));
  let preset; try { preset = objectPreset(balance); } catch { preset = null; }
  const enabled = preset?.enabled ?? [], overrides = preset?.overrides ?? {};
  return list.map((r) => {
    const t = TERRAIN[r.id] ?? {lines: () => [], strong: null};
    const objects = enabled.filter((id) => BIOME_OBJECTS[id]?.region === r.id).map((id) => {
      const c = {...BIOME_OBJECTS[id], ...overrides[id], continuous: CONTINUOUS.includes(id)};
      return {id, name: c.name.split(' · ')[0], text: objectCardLine(c), danger: c.effect === 'vent'};
    });
    const lines = [...t.lines(b)];
    if (r.reward) lines.push(`지역 먹이 보상 ×${num(r.reward)}.`);
    if (t.strong) lines.push(`${COLOR_NAMES[t.strong]} 종족이 이곳에 강합니다.`);
    return {id: `terrain-${r.id}`, deck: 'terrain', region: r.id, title: r.name ?? OBJECT_REGIONS[r.id] ?? r.id, accent: r.color ?? '#94a3b8', lines, objects};
  });
}

export function allCards(balance, regions) {
  return [...basicCards(balance), ...speciesCards(balance), ...terrainCards(balance, regions)];
}

// First start: the five basic cards, then the card for the species the player picked.
export function firstRunDeck(balance, color) {
  return [...basicCards(balance), ...speciesCards(balance).filter((c) => c.species === color)];
}

// Short text for the non-blocking hint shown the first time the player enters a terrain.
export function terrainHint(card) {
  return `${card.title} · ${card.lines[0] ?? ''}`;
}
