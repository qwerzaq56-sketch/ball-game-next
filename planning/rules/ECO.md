# 생태계·직위·표시 규칙 (ECO)

도메인 규칙 카드. 형식은 `README.md`. 근거: `00_기준/구현추인/cloud-spec-2fd3bd8/GAME_DESIGN.md`(M 번호가 클수록 우선). 승인: 사용자 2026-10-04 "구현 초과는 플레이해 보고 구현한 것이니 승인".

### R-ECO-001 · 최상위 직위는 크기 기준
- 규칙: 최상위 포식자는 생존 개체 전체(플레이어·AI 동일)의 **크기 상위 N위 중 Size 100 이상이고, 현재 살아 있는 최대 크기의 50% 이상**인 개체다. 기본 상한 N=5이며 F1에서 실행 중 조절한다. 점수는 직위 판정에 쓰지 않는다. 동점은 기존 크기 순위를 유지하고 새 개체는 id 순이다. 2초마다 평가하고 같은 후보가 2회 연속 확인되어야 확정되며, 죽으면 즉시 상실, 부활 후 재확정한다. 상대 기준(50%) 미달은 다음 평가에서 즉시 해제한다.
- 상태: 승인
- 출처: 사용자 지시 2026-10-03(M7) · 사용자 추인 2026-10-04 · M7·M8·M38·M64
- 확인:
  - config ecology.maxApex = 5
  - config ecology.minLargestSizeFraction = 0.5
  - symbol js/ecology.js :: apex
  - test tests/ecology.test.mjs :: apex eligibility follows size even when score order disagrees
  - test tests/ecology.test.mjs :: equal-size apex candidates keep their previous size order and ignore score swaps
  - test tests/frost-shield-apex-motion.test.mjs :: apex eligibility requires half of the largest live size and immediately removes ineligible titles
  - test tests/group-combat.test.mjs :: apex cap defaults to five and live changes retain size order under confirmation
- 변경 이력: 점수 상위 5위 중 크기≥100(v0.7, 사용자 승인) → M7 크기 상위 5 → M8 상위 3 → M38 기본 상한 5(F1 조절) → M64 최대 크기 50% 자격. **점수 기준이던 이전 승인 규칙을 대체**(사용자 피드백 "최상위가 최대 크기가 아님" 해소).

### R-ECO-002 · 최상위 생태 다양성 방향
- 규칙: 목표는 한 가지 패턴에 고정되지 않는 생태계다. 어떤 시기에는 최상위가 희소하고 자주 교체되며, 다른 시기에는 한 개체가 오래 독점하는 모습이 여러 시드·시간 흐름에서 다양하게 나타나는 것을 지향한다. 누적 점유량 감소 자체는 실패가 아니다. 교체를 강제하는 타이머나 독점 보장 보정은 두지 않는다. 평가는 `apex.dynamics`(0/1/여러 마리인 시간, 보유자 수, 획득·상실, 연속 보유 기간, 단독 기간)로 한다.
- 상태: 승인
- 출처: 사용자 지시 2026-10-03 · 사용자 추인 2026-10-04 · GAME_DESIGN NEXT
- 확인:
  - code tools/behavior-metrics.mjs :: dynamics
  - test tests/autoplay-metrics.test.mjs :: phase observation attributes actual titles and transitions without enforcing occupancy
- 변경 이력: "최상위 등장/점유율 악화 금지" 합격선을 대체. 클라우드 보고는 시드 23에서 점유 감소(600→252)를 남은 확인 항목으로 적었다.

### R-ECO-003 · 이름과 순위 HUD
- 규칙: 개체 이름은 출생 시 한 번 정해져 순위·직위가 바뀌어도 유지된다(전용 표현 난수, 게임플레이 난수 비소비). 점수 상위 20개체의 이름을 화면 고정 글자 크기로 표시하며, 겹치면 순위가 높은 이름을 우선한다. 순위 HUD는 생존 개체만 포함하는 점수 TOP10과 크기 TOP10을 전환해 보여 주고, apex는 ★로 표시, 내 순위는 TOP10 밖에서도 하단에 보인다. 표시 단계는 접기(풀→축약→바)를 지원한다. 플레이어는 시작 때 이름(16자)과 5색 중 하나를 고른다.
- 상태: 승인
- 출처: 사용자 요청 2026-10-03 · 사용자 추인 2026-10-04 · M5·M6·M41·M57
- 확인:
  - test tests/presentation.test.mjs :: names are seeded, assigned once and independent of gameplay and particle streams
  - test tests/presentation.test.mjs :: ranking excludes dead/orb entities, uses raw scores and keeps committed tie order
  - test tests/presentation.test.mjs :: size ranking is independent of score and preserves committed size ties
  - test tests/presentation.test.mjs :: name labels stay inside screen and avoid reserved panels and each other
  - test tests/player-profile.test.mjs :: profile normalizes blank names, unsupported colors, control characters and length
- 변경 이력: 수신함 I-006(순위바 접기) 구현 포함.

### R-ECO-004 · 접촉 방어와 대형 경계
- 규칙: 몸이 닿을 만큼 가까운 동급 이하의 적은 체력 30% 초과·공격 준비 시 즉시 공격하고, 아니면 도주한다(공격 가능성 매 프레임 재확인). 큰 개체(Size 300+)는 몸 표면 거리까지 포함해 위협을 감지하고, 몸 표면 140에서 경계하며 거리를 벌린다. 추격당하면 반격하며 경계 반격 간격은 1.5초다. 낮은 체력·지형·흡수 탈출이 우선한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M54 · M58 · M59 · M4 Unit 3
- 확인:
  - config ai.guardSurfaceDistance = 140
  - test tests/guard-absorption.test.mjs :: guard retreats from a larger nearby threat, continues retreat and counterattacks when pursued
  - test tests/ai-rules.test.mjs :: contact defense flees without a stack and still yields to recovery
  - test tests/guard-absorption.test.mjs :: large threat sensing includes the body surface beyond the old center-distance limit

### R-ECO-005 · 도주 해제 히스테리시스
- 규칙: 위협 진입 감지는 일반 감지 320을 유지하고, 한 번 감지한 위협은 400까지 벗어나야 잊는다(도주↔탐색 반복 완화). 흡수 탈출은 흡수자의 유지 거리+80까지 이어지며, 모래 장판 탈출은 진입 360에서 420까지 유지한다.
- 상태: 승인
- 출처: 사용자 피드백 2026-10-03(도주→탐색 반복) · M4 Unit 2·4
- 확인:
  - config ai.detectionRange = 320
  - test tests/ai-rules.test.mjs :: flee hysteresis keeps a remembered threat beyond sensing and releases at 400
  - test tests/ai-rules.test.mjs :: absorption escape releases beyond maintain distance plus margin
  - test tests/ai-rules.test.mjs :: sand escape holds to 420 and releases when the field expires
- 변경 이력: 클라우드 보고 — 같은 조건 300초 측정에서 search↔flee 전환 10,226→3,173(-69%).

### R-ECO-006 · 지속 탐색 목적지
- 규칙: 목표가 없는 AI는 감지 밖 먹이를 조회하지 않고 거리 600의 탐색 지점을 유지한다. 최근 출발점 4곳을 피하고 월드 안에서 고르며, 도착(40 이내)·만료·경계에서 재선정한다(노랑 4~6초/기타 6~10초). 전투·먹이·위험·명령·관계·동행이 우선한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M18 (사용자 피드백 "탐색 거리가 짧다" 대응)
- 확인:
  - config ai.explorationEnabled = true
  - config ai.explorationDistance = 600
  - test tests/exploration.test.mjs :: exploration retains a destination, respects body bounds and replaces it on arrival/expiry
  - test tests/exploration.test.mjs :: perception remains local: unseen food does not become a chase target

### R-ECO-007 · 먹이 밀도와 보충
- 규칙: 먹이는 면적당 최소 밀도(12.5)를 유지하도록 보충되고 월드 최대 2400개를 넘지 않는다(초기 1800). 한 번에 보충하는 양은 최대 6개다. 자연 먹이 성장 배율은 1이다. 사냥 드롭은 피해자 크기에 비례하며 축적 성장의 90%를 회수한다(`retainedGrowthFraction`).
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M41 · M46 · M53
- 확인:
  - config spawning.minimumOrbDensity = 12.5
  - config spawning.maxOrbCount = 2400
  - config spawning.initialOrbCount = 1800
  - config spawning.maximumReplenishBatch = 6
  - config spawning.naturalFoodGrowthMultiplier = 1
  - config killReward.retainedGrowthFraction = 0.9
  - test tests/balance-growth.test.mjs :: hunting drops scale with victim size and retain its accumulated capital without duplicate direct reward
  - test tests/balance-growth.test.mjs :: natural food Growth can be tuned independently of food shape, RNG, hunting drops and density
- 변경 이력: v0.6 최대 먹이 600·초기 450 → 8,000 월드 확대에 맞춰 2,400·1,800(밀도 기반 보충). **카탈로그 R-ECO-007의 "목표 800개" 서술은 M46 시점 값이며 현재 값은 이 카드가 정본.**

### R-ECO-008 · 역할·성격·관계와 성격 비율 유지
- 규칙: 역할(프레이/포레이저/프레데터)은 크기 순위로 정하고(프레데터 상위 20%, 프레이 하위 40%), 성격 3종(성장 추구 34/리스크 회피 33/기회주의 33)은 출생 시 배정되어 역할이 바뀌어도 유지된다. 프레데터 관계 3종(종속 40/도전 30/독립 30)은 처음 프레데터가 될 때 배정한다. 개체 수가 5 미만이면 모두 포레이저다.
- 상태: 승인
- 출처: 제안 004·005·v0.7 승인 유지
- 확인:
  - code js/ecology.js :: r<\.34\?'growth':r<\.67\?'cautious':'opportunist'
  - code js/ecology.js :: r<\.4\?'subordinate':r<\.7\?'challenger':'independent'
  - symbol js/ecology.js :: assignPersonality
  - test tests/ecology.test.mjs :: role quotas and rank 3 eligibility does not promote rank 4
  - test tests/ecology.test.mjs :: small populations are foragers and personalities persist across role changes
  - test tests/species.test.mjs :: AI personality exists at birth and green may approach before start-distance roll

### R-ECO-009 · AI 감지·흡수 탐색·도주 체력
- 규칙: AI 일반 감지 거리는 320, 동족 흡수 탐색 400이다. 체력 30% 이하에서는 위협으로부터 도주하되 낮은 체력에서도 15% 확률로 공격 시도가 남는다. AI 이동 속도 130, 흡수 시도 확률 60%.
- 상태: 승인
- 출처: v0.4~v0.6 승인 유지
- 확인:
  - config ai.detectionRange = 320
  - config ai.absorptionDetectionRange = 400
  - config ai.fleeThreshold = 0.3
  - config ai.lowHealthAttackChance = 0.15
  - config ai.absorptionAttemptChance = 0.6
  - config ai.movementSpeed = 130
