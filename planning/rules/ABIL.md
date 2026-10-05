# 종족 능력 규칙 (ABIL)

도메인 규칙 카드. 형식은 `README.md`. **수치의 정본은 구현의 `js/skillCatalog.js`(기본 후보)이며 M75 1대1 조정이 반영되어 있다.** 일부 설계 문서(`cloud-spec-2fd3bd8/SKILL_CATALOG_DESIGN.md`·`GAME_DESIGN.md`)의 M42~M64 시점 수치와 다를 수 있고, 그 차이는 각 카드의 변경 이력에 적었다. 승인: 사용자 2026-10-04 "구현 초과는 플레이해 보고 구현한 것이니 승인".

### R-ABIL-001 · 능력 슬롯과 사용 규칙
- 규칙: 일반 E는 Size 100부터 쓰고, 최상위 직위 보유 중에는 E와 R을 쓴다(소환체는 쓰지 못한다). E/R 쿨다운은 독립이고 시전 동작은 공유한다. 빙결·흡수 중에는 시작하지 않고, 공격·회피 중에도 E/R 시전은 동작을 취소하지 않고 가능하다(M74). 회피로 시전을 취소해도 쿨다운은 돌려주지 않는다. 직위를 잃으면 R 시전과 유지형 R 효과를 해제하고 E는 크기 조건이면 유지한다. 범위(반경·길이·폭·시전/버프/명령 거리)는 `max(0.6, Size/100)`배로 커지며 표시와 판정은 같은 시전 스냅샷을 쓴다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M42 · M55 · M61 · M74
- 확인:
  - config abilitySkills.unlockSize = 100
  - config abilitySkills.rangeReferenceSize = 100
  - symbol js/skillCatalog.js :: scaledSkill
  - test tests/abilities.test.mjs :: cooldown consumes at windup, attack forbidden, dodge cancels without refund
  - test tests/m74-controls.test.mjs :: skills remain usable during attack and dodge without cancelling the action
  - test tests/large-size-play.test.mjs :: all E/R geometry scales above size 350 while small skills retain their geometry
- 변경 이력: v0.9 5색 E 단일 → M42 E/R 2슬롯 → M55 `max(1,Size/350)` → M61 `max(0.6,Size/100)`.

### R-ABIL-002 · 하늘색 E — 서리 보호막
- 규칙: 자신과 범위(240×Size/100, 최소 0.6배) 안의 같은 색·평화 동행 아군에게 각자 최대 HP 15% 보호막을 6초 준다. 준비 0.25초, 쿨다운 9초. 방어·저항을 적용한 뒤 피해를 먼저 흡수하고, 재시전은 남은 양과 새 양 중 큰 값으로 갱신한다(더하지 않음). 만료·사망 시 해제, 흡수 HP 비용에는 적용하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M64
- 확인:
  - skill cyan-shield windup = 0.25
  - skill cyan-shield cooldown = 9
  - skill cyan-shield radius = 240
  - skill cyan-shield shieldHpFraction = 0.15
  - skill cyan-shield shieldDuration = 6
  - test tests/frost-shield-apex-motion.test.mjs :: cyan shield protects self and nearby allies after defense, expires and refreshes without stacking
- 변경 이력: 이전 E 냉기 찌르기(`cyan-chill`, 쿨 7·반경 200·피해 0.35·빙결 0.35초)는 복구 후보로 보존.

### R-ABIL-003 · 하늘색 R — 냉기 휘두르기
- 규칙: 전방 원뿔 반경 260에 공격력 0.62배 피해를 주고 대상을 1초 빙결한다(빙결 해제 후 2초 면역, 회피·방어로 저항). 준비 0.6초, 쿨다운 10초. 빙결은 공격·회피·시전·흡수 연결을 끊는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M74(기본값 롤백) · M75(피해 조정)
- 확인:
  - skill cyan-freeze windup = 0.6
  - skill cyan-freeze cooldown = 10
  - skill cyan-freeze radius = 260
  - skill cyan-freeze damage = 0.62
  - skill cyan-freeze freezeSeconds = 1
  - config abilitySkills.loadout.cyan.R = cyan-freeze
  - test tests/abilities.test.mjs :: cyan windup then tuned damage and defense, one second freeze and immunity
  - test tests/m74-controls.test.mjs :: default cyan R is direct freeze while frost-field candidate remains selectable
- 변경 이력: M64 기본 R=`cyan-burst`(지연 폭발·15초 냉기 장판·누적 빙결) → **M74에서 기본값을 이 능력으로 되돌림**(`cyan-burst`는 선택 대기 후보로 보존: 쿨 12·표식 1.2초·폭발 반경 150·장판 15초·3타격 빙결 1.2초). **구현 추인 카탈로그 R-ABIL-001의 "R=냉기 폭발" 서술은 M64 시점이며 현재 기본값은 이 카드가 정본.**

### R-ABIL-004 · 파랑 E — 파도 밀치기
- 규칙: 전방 반경 240(Size 비례)에 공격력 0.8배 피해와 0.15초 동안 속도 400의 밀침을 준다. 준비 0.3초, 쿨다운 8초. 파도 면역은 공유한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M42 · M75
- 확인:
  - skill blue-ripple windup = 0.3
  - skill blue-ripple cooldown = 8
  - skill blue-ripple radius = 240
  - skill blue-ripple damage = 0.8
  - skill blue-ripple pushDuration = 0.15
  - skill blue-ripple pushSpeed = 400
- 변경 이력: M42 피해 0.4 → M75 조정 0.8(1대1 균형). E 전용 테스트는 미연결(R 파도 검증에 묶여 있음).

### R-ABIL-005 · 파랑 R — 삼중 파도
- 규칙: 중심 조준 방향과 좌우 각 한 방향(중심 대비 [-120°,-40°], [40°,120°]에서 시전 시작 때 한 번 샘플)으로 길이 440·폭 205의 파도 3개를 발사한다. 세 방향은 전조·발사·표시가 공유하고, 같은 대상은 한 시전의 모든 파도에서 한 번만 맞는다(중복 피해·밀침·MISS 판정 방지). 공격력 1.08배·0.2초 동안 속도 600 밀침, 파도 지속 0.5초, 준비 0.6초, 쿨다운 10초(시전당 한 번). 회피로 전조를 취소하면 3방향 모두 취소되고 쿨다운은 돌려주지 않는다. 4초 동족 흡수 지시(반경 350)를 유지한다. 방향 샘플링에 AI 난수 2회를 쓴다.
- 상태: 승인
- 출처: 사용자 아이디어 2026-10-03(3방향) · 사용자 추인 2026-10-04 · M5 · M75
- 확인:
  - skill blue-trident windup = 0.6
  - skill blue-trident cooldown = 10
  - skill blue-trident length = 440
  - skill blue-trident width = 205
  - skill blue-trident damage = 1.08
  - skill blue-trident pushDuration = 0.2
  - skill blue-trident pushSpeed = 600
  - skill blue-trident waveDuration = 0.5
  - skill blue-trident commandDuration = 4
  - test tests/abilities.test.mjs :: blue three-lane directions use two AI draws once, within separated side ranges
  - test tests/abilities.test.mjs :: overlapping blue lanes cannot triple damage, knockback or consume multiple MISS rolls
  - test tests/abilities.test.mjs :: dodging a blue windup cancels all three lanes without refund or fire event
- 변경 이력: v0.9 단일 파도 → M5 삼중(길이 400·폭 180·피해 0.5배·밀침 120) → M75 길이 440·폭 205·피해 1.08·밀침 600으로 조정. 설계 문서의 M5 수치와 다르다. **선딜 제거(즉발)는 수신함 I-005로 남아 있고 미반영.** 이전 단일 파도(`blue-single-wave`)는 복구 후보로 설계만 있다.

### R-ABIL-006 · 초록 E — 동행 초대
- 규칙: 반경 350 안 같은 색 동족을 가까운 순서로 모집한다(수락 80%, 성향 무관). 최대 6명, 다른 대열 소속·흡수 중·HP 30% 이하는 제외하되 다른 동족 대열은 통째로 합칠 수 있다(합계 6명 이하·전원 동색·비전쟁). 수락한 새 동료·현재 대열 전체·시전자에게 공격 +4%·방어 +5%를 30초(개별 만료·최대 5중첩) 준다. 혼자 써도 자신에게 강화된다. 준비 0.3초, 쿨다운 9초.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M56 · M63 · M75
- 확인:
  - skill green-invite windup = 0.3
  - skill green-invite cooldown = 9
  - skill green-invite radius = 350
  - skill green-invite acceptChance = 0.8
  - skill green-invite buffDuration = 30
  - skill green-invite buffDamage = 0.04
  - skill green-invite buffDefense = 0.05
  - skill green-invite buffStackCap = 5
  - test tests/green-companions.test.mjs :: green E provides solo attack and real defense, stacks to cap, then expires
  - test tests/green-companions.test.mjs :: 80 percent E acceptance ignores personality and buffs accepted and existing companions
  - test tests/sprint-food-lava.test.mjs :: green E merges whole existing groups and buffs each member once
- 변경 이력: 공격 버프 5%(M56 문서) → M75 4%. 수신함 I-003("초록=체력 재생")은 이 능력과 다르며 미반영.

### R-ABIL-007 · 초록 R — 숲의 부름
- 규칙: 동족 소환체 최대 2명(시전자당 생존 상한)을 소환한다. 각 소환체 직경은 시전자 Size×0.16×(0.8~1.2)이며 하드 상한 20%다. 소환체는 시간·시전자 사망·직위 상실로 사라지지 않고, 소환 30초 후부터 흡수 가능하다. 자체 공격력에 시전자 기본 공격력의 44%를 계승하고, 공격·회피 충전을 최소 1회 해금한다. 자연 먹이를 소비하지 않으며 사냥 드롭·성장 보상은 시전자에게 주지 않는다. 시전 반경 350·5초 공격 +15% 사기·대열 모집 포함. 준비 0.5초, 쿨다운 18초, 대열 상한 6명.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M42 · M56 · M58 · M75
- 확인:
  - skill green-summon windup = 0.5
  - skill green-summon cooldown = 18
  - skill green-summon summonCount = 2
  - skill green-summon summonAbsorbDelay = 30
  - skill green-summon summonSizeFraction = 0.16
  - skill green-summon summonSizeVariation = 0.2
  - skill green-summon summonSizeCapFraction = 0.2
  - skill green-summon summonAttackInheritance = 0.44
  - test tests/green-companions.test.mjs :: size-scaled randomized summons never exceed one fifth, keep actions and cannot consume food
- 변경 이력: 15초 한시 소환·소환자 소멸(M42) → M58 영구·30초 후 흡수 가능. 공격 계승 50% → M75 44%. 이전 컨셉 `green-morale`(사기 +15%·모집·소환 없음)은 복구 후보로 보존.

### R-ABIL-008 · 빨강 E — 불씨 장판
- 규칙: 시전자 위치에 5초 지속 장판(반경 240, 큰 몸은 비례 확대, 최소 몸 반지름+100)을 두고 0.5초마다 공격력 0.43배 피해를 준다(방어 적용, 동색은 피해 없음). 장판은 시전자 현재 위치를 따라가며 표시와 판정 중심이 같다. 준비 0.25초, 쿨다운 9초. 최상위가 아니어도 쓰며 직위 상실로 취소하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M60 · M68 · M75
- 확인:
  - skill red-embers windup = 0.25
  - skill red-embers cooldown = 9
  - skill red-embers radius = 240
  - skill red-embers fieldDuration = 5
  - skill red-embers tickInterval = 0.5
  - skill red-embers damage = 0.43
  - test tests/environment-muster.test.mjs :: red E produces real repeated damage without apex and respects allies, snapshot range and duration
  - test tests/environment-muster.test.mjs :: red damage aura and muster center follow their moving owner
- 변경 이력: 반경 260·틱 피해 0.65(M60 문서) → M75 반경 240·피해 0.43. 이전 E `red-vigor`(사냥 박동)는 복구 후보로 보존.

### R-ABIL-009 · 빨강 R — 혈족 집결
- 규칙: 시전 순간 최상위 오오라 반경(Size×0.6) 안의 아군(동족 또는 평화 혼색 대열, 전쟁 상대 제외)을 스냅샷한다. 대열 6명·옛 명령 4명 상한은 적용하지 않는다. 3초 동안 시전자 근처에 모인 뒤 공동 사냥하며, 총 11초 동안 이동 +25%·공격 +30%를 받는다(버프 8초 구간 포함). 시전자가 때린 적과 시전자를 때린 적을 누적 표적으로 삼아 가까운 생존 표적을 공격한다. 생명 위험·환경 탈출이 우선, 시전자 사망·직위 상실·종료 시 해제. 시전자와 다른 수동 플레이어는 강제 이동 없이 버프만 받는다. 준비 0.6초, 쿨다운 16초.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M60 · M67 · M68
- 확인:
  - skill red-muster windup = 0.6
  - skill red-muster cooldown = 16
  - skill red-muster gatherDuration = 3
  - skill red-muster buffDuration = 8
  - skill red-muster buffDamage = 0.3
  - skill red-muster buffSpeed = 1.25
  - config abilitySkills.redTerritoryRadiusMultiplier = 0.6
  - test tests/environment-muster.test.mjs :: red R recruits all aura allies, gathers then follows caster attacks and attackers with buffs
  - test tests/environment-muster.test.mjs :: muster cancels on title loss and turns hostile allies out of the buff
- 변경 이력: 이전 R `red-rally`(사냥 지휘: 영역 마킹·조준 350)는 복구 후보로 보존.

### R-ABIL-010 · 노랑 E — 먼지 장막
- 규칙: 자신에게 15초 동안 직접 공격 15% MISS를 주고(환경 지속 피해에는 무효), 시전 직후 0.8초 무적(회피 무적과 별도 타이머, 공격·스킬·환경 피해 차단, 흡수 HP 비용에는 불적용)을 준다. 표시는 몸 반경 기준 3배의 장막 링이며 주변 적에게 피해를 주지 않는다. 준비 0.3초, 쿨다운 9초. 사망·생명 교체 시 해제한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M70
- 확인:
  - skill yellow-dust windup = 0.3
  - skill yellow-dust cooldown = 9
  - skill yellow-dust buffDuration = 15
  - skill yellow-dust missChance = 0.15
  - skill yellow-dust visualRadiusMultiplier = 3
  - skill yellow-dust invulnerableSeconds = 0.8
  - test tests/charge-weather-risk.test.mjs :: yellow dust lasts fifteen seconds and short immunity survives dodge updates then expires
  - test tests/abilities.test.mjs :: invincibility blocks damage and freeze without consuming miss RNG

### R-ABIL-011 · 노랑 R — 모래바람
- 규칙: 조준 지점(PC는 마우스 월드 좌표, 모바일은 버튼 드래그 지점, 최대 거리 350을 크기 비례로 제한)에 반경 259.2(Size 비례)의 장판을 5초 두고 0.25초마다 대상 최대 HP의 12.2%를 원시 피해로 준 뒤 방어를 적용한다. 겹친 장판은 같은 틱에 가장 강한 피해 하나만 적용한다. 자신의 장판 안에서 직접 공격 25% MISS. 준비 0.8초, 쿨다운 14초.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M8 · M67 · M70 · M74 · M75
- 확인:
  - skill yellow-storm windup = 0.8
  - skill yellow-storm cooldown = 14
  - skill yellow-storm radius = 259.2
  - skill yellow-storm castRange = 350
  - skill yellow-storm fieldDuration = 5
  - skill yellow-storm tickInterval = 0.25
  - skill yellow-storm hpFraction = 0.122
  - skill yellow-storm missChance = 0.25
  - test tests/abilities.test.mjs :: yellow field ticks quarter-second; exact lifetime and same-tick overlap uses maximum
  - test tests/m74-controls.test.mjs :: yellow storm uses supplied target position, clamps range and scales radius
- 변경 이력: 반경 220(M8 설계 360) → 288(M67) → 216(M70) → 259.2(M74 ×1.2). 틱 비율 20%(M8) → 10%(M70) → 12.2%(M75).

### R-ABIL-012 · 최상위 영역 반경
- 규칙: 영역 반경은 `900×√(max(100,Size)/100)×영역 배율`이다(Size 100=900, 200≈1273, 400=1800). 빨강은 오오라가 `Size×0.6×영역 배율`이다. 표시와 AI의 최상위 관계 탐색·유지 범위가 같은 함수를 쓴다. 일반 전투 시야는 영역만큼 늘리지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M42 · M67
- 확인:
  - config abilitySkills.territoryMultiplier = 1
  - config abilitySkills.redTerritoryRadiusMultiplier = 0.6
  - symbol js/skillCatalog.js :: apexTerritoryRadius
  - code js/skillCatalog.js :: 900\*Math\.sqrt
- 변경 이력: 영역 반경 600 고정(v0.7 R600) → Size 비례(M42). **승인된 "반경 600 영역" 규칙을 대체.**

### R-ABIL-013 · 능력 후보 선택·프리셋·복구
- 규칙: F1에서 종족별 E/R 후보를 바꾸고 수치를 편집해 기기 저장·JSON 교환·기본값 복구를 할 수 있다. 새 시전부터 적용하며 이미 시전 중인 스킬은 당시 정의를 끝까지 유지한다. 교체해도 쿨다운은 초기화하지 않는다. 잘못된 파일은 기존 설정을 유지하며 거부한다. 이전 후보(`cyan-chill`·`cyan-burst`·`green-morale`·`red-vigor`·`red-rally`)는 삭제하지 않고 복구 후보로 둔다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M42 · M44
- 확인:
  - symbol js/skillCatalog.js :: selectedSkill
  - skill cyan-burst cooldown = 12
  - skill cyan-chill cooldown = 7
  - skill green-morale cooldown = 12
  - skill red-vigor cooldown = 9
  - skill red-rally cooldown = 12
  - test tests/skill-presets.test.mjs :: preset import is transactional, rejects unknown fields/races/IDs and is independently copied
  - test tests/skill-presets.test.mjs :: R frost real reach, windup and damage follow cast snapshot despite mid-cast edits

### R-ABIL-014 · 능력 사용 가시성
- 규칙: 완료된 능력마다 0.75초 동안 채움/외곽 범위·시전 지점 펄스·짧은 능력 이름을 표시한다(이름은 화면 고정 크기). 상대의 기본 공격 차징은 흰색 충전 링만 보이고 공격 방향·예상 범위는 숨긴다. 직위 설명 배너·아이콘은 두지 않는다. 표시는 난수를 쓰지 않는다.
- 상태: 승인
- 출처: 사용자 요청 2026-10-03(능력 가시성) · 사용자 추인 2026-10-04 · M4 Unit 5 · M74
- 확인:
  - test tests/abilities.test.mjs :: cast flash captures origin and expires independently of damage/cooldown

### R-ABIL-015 · 최상위 AI의 시전 우선순위
- 규칙: 최상위 AI는 일반 공격보다 먼저 준비된 R, 그다음 E의 사용을 검토한다. 도주·회복 판단 중에도 사용 가능하다. 공격형 능력은 실제 확대 범위 안의 유효한 적이, 지원형은 자신만 있어도 시전한다. R을 쓸 수 없으면 E를 확인한다. 소환 상한과 행동·빙결 제한은 유지한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M61
- 확인:
  - test tests/charge-weather-risk.test.mjs :: apex prioritizes ready R and then E over available basic attacks even outside the old sensing radius
  - test tests/charge-weather-risk.test.mjs :: support apex uses summon and invitation without needing a hostile enemy

### R-ABIL-016 · 최상위 1대1·스킬 영향력 평가
- 규칙: 동크기 최상위 1대1(크기 200/400/800, 5색 10조합, 시드·좌우 교환 반복, 일반 AI/전쟁 AI)로 승률·무승부·상성을 측정하고, 스킬 영향력은 지도 장악·개체 노출·피해 압박으로 분리해 비교한다. 수치 조정의 근거이며 불쾌도 평가는 사용자 체감으로 후속 검증한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M75
- 확인:
  - test tests/skill-influence.test.mjs :: real geometry counts enemies in a cone and excludes allies and targets behind the caster
  - test tests/skill-influence.test.mjs :: mirrored duel runner is reproducible and preserves draw information
