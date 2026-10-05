# 전투·이동 규칙 (COMBAT)

도메인 규칙 카드. 형식은 `README.md`. 구현 근거는 `00_기준/구현추인/cloud-spec-2fd3bd8/GAME_DESIGN.md`(M 번호가 클수록 우선). 승인: 사용자 2026-10-04 "구현 초과는 플레이해 보고 구현한 것이니 승인".

### R-COMBAT-001 · 기본 공격 수동 충전
- 규칙: 공격 버튼을 누르는 동안 충전하고 손을 떼면 추가 선딜 없이 즉시 돌진한다. 완충 0.9초. 충전 0→1에서 피해 계수는 0.35→2배로 선형 증가하고, 이동거리는 "최소 70 또는 풀차징 거리의 12% 중 큰 값"에서 풀차징 거리까지 늘어난다. 취소·일시정지·창 전환에는 발사하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M58 · M61 · M77
- 확인:
  - config attack.manualChargeSeconds = 0.9
  - config attack.minChargeDamageMultiplier = 0.35
  - config attack.maxChargeDamageBonus = 1
  - config attack.minimumChargeDistance = 70
  - config attack.minChargeDistanceFraction = 0.12
  - symbol js/combat.js :: chargedAttackDistance
  - test tests/charge-weather-risk.test.mjs :: released manual attacks have no telegraph
  - test tests/m77-mobility.test.mjs :: zero charge has a real minimum advance
- 변경 이력: v0.6 즉발 공격 → M57 충전(1.5초) → M58 0.9초 → M61 선형 곡선 → M77 최소 이동 보장.

### R-COMBAT-002 · 몸 캡슐 판정과 통과 방지
- 규칙: 공격은 돌진 경로의 캡슐 영역으로 표시하고 실제 몸 반지름끼리 닿으면 타격한다. 숨은 판정 여유는 없고, 프레임 사이 경로도 검사해 빠른 돌진이 상대를 통과하지 못한다. 같은 편은 타격하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M38
- 확인:
  - symbol js/combat.js :: updateAttack
  - test tests/group-combat.test.mjs :: swept attacks hit touching bodies without hidden padding or tunneling

### R-COMBAT-003 · 회피와 달리기 (Space)
- 규칙: Space를 0.18초 안에 떼면 보는 방향으로 회피하고, 그 이상 누르면 이동 중 달리기 게이지를 쓴다. 회피 거리는 100+Size×0.8, 회피 충전은 별도로 유지한다. 달리기는 Size 150부터 해금, 게이지 3초(소모 초당 1, 회복 초당 0.6), 속도 2.1배이며 회피 충전을 소모하지 않는다. 공격·회피 중에는 달리지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M63 · M74 · M77
- 확인:
  - config dodge.baseDistance = 100
  - config dodge.distanceGrowth = 0.8
  - config sprint.unlockSize = 150
  - config sprint.capacitySeconds = 3
  - config sprint.recoveryPerSecond = 0.6
  - config sprint.speedMultiplier = 2.1
  - symbol js/combat.js :: dodgeDistanceForSize
  - symbol js/sprint.js :: updateSprint
  - test tests/sprint-food-lava.test.mjs :: sprint unlock, available dodge independence, stamina exhaustion and release recovery
  - test tests/m77-mobility.test.mjs :: sprint actually moves 2.1 times the unboosted speed without consuming dodge charges
- 변경 이력: v0.6 지수 회피 → 선형(100+0.8×Size). 달리기 속도 1.5배(M63) → 2.1배(M77).

### R-COMBAT-004 · 큰 공 공격 템포
- 규칙: 공격 예고·돌진 시간 계산에 쓰는 Size는 200까지 그대로 반영하고 그 이후 증가분은 25%만 반영한다. 공격 소요시간은 Size에 비례(0.004초×Size)한다. 크기 350·400·600의 공격 템포가 과도하게 느려지지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · v0.6 · M58
- 확인:
  - config combatScaling.attackChargeDurationPerSize = 0.004
  - config combatScaling.attackTimingSoftcapSize = 200
  - config combatScaling.attackTimingBeyondScale = 0.25
  - symbol js/combat.js :: attackChargeDurationForSize
  - test tests/guard-absorption.test.mjs :: large attack timing is capped gently and manual full charge is shorter

### R-COMBAT-005 · 성장 시각 스프링과 화면 점유 상한
- 규칙: 성장하면 실제 Size·충돌은 즉시 바뀌고 그려지는 몸만 감쇠 스프링으로 따라간다(최대 3% 오버슈트). 자기 몸 직경은 화면 짧은 변의 42%를 넘지 않도록 카메라 줌을 추가 제한한다. 실제 몸 크기는 줄이지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M55 · M64
- 확인:
  - config camera.maxBodyScreenFraction = 0.42
  - test tests/large-size-play.test.mjs :: camera bounds player diameter even after instant growth and mobile rotation

### R-COMBAT-006 · 기본 공격 피해 보정
- 규칙: 기본 공격의 원시 피해에 0.7배를 곱한다(방어 적용 전, 스킬 자체 피해는 별도). 기본 피해는 10+Size×1, 막타 예상도 같은 계수를 쓴다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M63
- 확인:
  - config attack.baseDamageMultiplier = 0.7
  - config combatScaling.baseAttackDamage = 10
  - config combatScaling.attackDamagePerSize = 1
  - symbol js/combat.js :: attackDamageForEntity
- 변경 이력: 기본 공격 피해 30% 감소(M63).

### R-COMBAT-007 · 공격 이동거리 상한
- 규칙: 기본 공격의 실제 이동거리는 최대 600이다. 최상위 포식자는 그 0.7배인 420이다. 이동·예상 경로·AI 접근 거리·충돌 후보 조회가 같은 함수를 쓴다. 피해량과 공격 시간은 유지한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M55
- 확인:
  - config combatScaling.maxChargeDistance = 600
  - symbol js/combat.js :: attackChargeDistanceForSize
  - code js/combat.js :: \(apex\?\.7:1\)
  - test tests/large-size-play.test.mjs :: large attack travels capped distance and preview uses the same distance

### R-COMBAT-008 · AI 충전과 공격 간격
- 규칙: AI 공격도 사람과 같은 충전 계수·거리·피해 규칙을 쓴다. 유효한 표적이 있으면 표적까지 거리에 따라 충전량(최소 30%, 목표 없을 때 75%)을 고르며, 충전 중에는 움직이지 않고 시간이 끝나면 즉시 돌진한다. AI는 스택이 남아도 공격 사이에 간격(1.8초)을 둔다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · v0.6(2.5초) → M4 이후 조정 · M65
- 확인:
  - config attack.aiChargeFraction = 0.75
  - config attack.aiMinChargeFraction = 0.3
  - config ai.attackCooldown = 1.8
  - symbol js/combat.js :: aiAttackCharge
  - symbol js/combat.js :: aiAttackGateTimer
  - test tests/charge-weather-risk.test.mjs :: AI prefers full charge and only shortens for incoming contact strikes
- 변경 이력: **AI 공격 간격이 v0.6의 2.5초에서 1.8초로 줄었다(구현 추인 카탈로그에 없던 변경을 이 카드 작성 중 발견).** 의도는 "AI가 공격을 너무 안 한다"는 플레이 피드백 대응으로 추정된다.

### R-COMBAT-009 · 피해와 방어
- 규칙: 받는 피해는 원시 피해에서 방어(Size×0.5)를 뺀 값이며 최소 1이다. 방어는 크기에 비례해 커지고 최소 피해는 보장된다.
- 상태: 승인
- 출처: v0.5·v0.6 승인 규칙 유지
- 확인:
  - config combatScaling.defensePerSize = 0.5
  - config combatScaling.minimumDamage = 1
  - symbol js/combat.js :: applyDefense

### R-COMBAT-010 · 일반 반격
- 규칙: 어떤 역할·색의 AI든 다른 색에게 피해를 받으면 공격자를 3초 기억한다(환경 장판 틱 제외). 생존 규칙 뒤에서 공격 스택이 있고 체력 30% 초과이며 공격자가 위협(자기 Size 1.2배 이상)이 아니고 일반 감지 안이면 반격한다. 리스크 회피형은 공격자 위치가 다른 위협으로부터 안전해야 한다.
- 상태: 승인
- 출처: 사용자 지시 2026-10-03 "반격 복원"(기획서 v0.25)
- 확인:
  - symbol js/combat.js :: RETALIATION_MEMORY
  - symbol js/ai.js :: retaliateTarget
  - test tests/ai-rules.test.mjs :: retaliation: a hit prey fights back against an equal-size attacker
  - test tests/ai-rules.test.mjs :: retaliation: survival still wins over it
  - test tests/ai-rules.test.mjs :: R-AI-010 retaliation memory expires after the configured six seconds

### R-COMBAT-011 · 대형 성장 보상 감소
- 규칙: 성장을 받는 개체의 Size가 400까지는 기존 보상, 400~500에서 1배→0.5배로 연속 감소, 500 이상은 0.5배다(1500 이후도 0.5배 유지). 먹이·사냥 드롭·동족 흡수·직접 사냥 성장에 같은 규칙을 쓰며 월드의 드롭 자체는 줄이지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M55
- 확인:
  - config growth.rewardReductionStart = 400
  - config growth.rewardReductionFull = 500
  - config growth.largeRewardMultiplier = 0.5
  - test tests/large-size-play.test.mjs :: reward reduction is smooth and halves all rewards throughout large-size bands

### R-COMBAT-012 · 대형 처치 드롭 밀집
- 규칙: Size 300 이상 처치 드롭은 개수의 90% 이상을 사망한 개체 중심에서 직경 0.9배 반경 안에 생성하고 최대 10%만 0.9~2.25배 반경으로 퍼뜨린다. 드롭 개수·개별 크기·총 성장치·난수 소비는 바꾸지 않는다. 300 미만은 기존 분산을 쓴다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M62
- 확인:
  - config killReward.compactDropMinSize = 300
  - config killReward.compactDropRadiusDiameters = 0.9
  - config killReward.compactDropOuterFraction = 0.1
  - config killReward.compactDropOuterRadiusDiameters = 2.25
  - test tests/balance-growth.test.mjs :: large kill drops keep at least ninety percent close without changing rewards or random consumption
