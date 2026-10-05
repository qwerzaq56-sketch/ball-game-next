# 흡수 규칙 (ABS)

도메인 규칙 카드. 형식은 `README.md`. 근거: `00_기준/구현추인/cloud-spec-2fd3bd8/GAME_DESIGN.md` M39·M57·M58·M61·M64·M66·M71·M77(번호가 클수록 우선).

### R-ABS-001 · 면적 80% 이전
- 규칙: 같은 색 개체를 흡수하면 상대의 기본 크기까지 포함한 현재 면적의 80%를 이전한다. 새 Size = √(내 Size² + 0.8×상대 Size²). 먹이 구슬은 기존 성장값을 유지한다. 흡수 자격·시간·탈출은 그대로다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M39
- 확인:
  - config absorption.areaEfficiency = 0.8
  - symbol js/absorption.js :: absorptionGrowthFor
- 변경 이력: 이전에는 누적 growth만 옮겼다.

### R-ABS-002 · 흡수 위험 비용 곡선
- 규칙: 흡수는 시작 당시 내 최대 HP를 기준으로 비용을 내며, 상대 Size/내 Size 비율이 0.15 이하면 최대 HP 3% 회복, 0.5면 20% 피해, 0.95면 75% 피해, 1이면 80% 피해이고 사이 구간은 선형 보간한다. 양의 비용에는 (0.5+0.5×상대 남은 HP 비율)을 곱한다. 비용은 진행률에 비례해 전액 차감한다. 성장으로 최대 HP가 늘어도 자동 회복은 주지 않는다. 흡수 비용으로는 죽지 않으며 최대 HP의 1%를 남긴다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M58 · M61 · M66 · M71
- 확인:
  - config absorption.healthRatioCurve[1].hpFraction = -0.03
  - config absorption.healthRatioCurve[2].hpFraction = 0.2
  - config absorption.healthRatioCurve[3].hpFraction = 0.75
  - config absorption.healthRatioCurve[4].hpFraction = 0.8
  - config absorption.healthFloorFraction = 0.01
  - config absorption.woundedCostFloor = 0.5
  - config absorption.healthCostProgressFraction = 1
  - symbol js/absorption.js :: absorptionHealthFraction
  - test tests/charge-weather-risk.test.mjs :: healthy absorption curve gives 75 percent at near-equal size, 20 percent at half and 3 percent recovery when tiny
  - test tests/charge-weather-risk.test.mjs :: tiny ally absorption heals a wounded absorber by 3 percent of its starting max HP
  - test tests/charge-weather-risk.test.mjs :: absorption pays the full proposed cost progressively and refunds only successful actual spending
  - test tests/apex-wars.test.mjs :: absorption floor is one percent of max HP and never cancels or kills due to cost
- 변경 이력: M58 비용 모델 → M59 25%진행/75%완료 충격 → M61 곡선 재정의 → M66 전액 진행 비례 → M71 성공 복구 규칙 확정.

### R-ABS-003 · 흡수 성공 복구
- 규칙: 흡수에 성공하면 실제로 지불한 비용을 기준으로 회복한다. 상대 Size/내 Size가 0.6 이하면 100% 복구, 0.6~0.9는 100%→90%로 선형, 0.9 이상은 90% 복구라 약간의 순비용만 남는다. 상대 비율은 흡수 시작 때 고정한다. 취소·탈출·실패는 복구하지 않고, 외부 공격 피해는 되돌리지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M71
- 확인:
  - config absorption.successHealthRefundFraction = 1
  - config absorption.nearEqualRefundStartRatio = 0.6
  - config absorption.nearEqualRefundFullRatio = 0.9
  - config absorption.nearEqualHealthRefundFraction = 0.9
  - symbol js/absorption.js :: payAbsorptionHealth
  - test tests/apex-wars.test.mjs :: absorption pays all cost during progress and restores medium-sized absorption cost on success
- 변경 이력: 성공 환급 25%(M66) → 크기별 복구(M71, 이전 규칙 대체).

### R-ABS-004 · 흡수 입력 (기본 OFF)
- 규칙: 동족 흡수는 시작할 때 꺼져 있다. PC는 우클릭을 누르는 동안 켜지고 놓으면 진행 중인 연결도 끊긴다. 모바일은 흡수 ON/OFF 버튼으로 토글한다. PC·최소 UI 하단 도구에도 버튼이 있다. 일반 먹이 수집에는 영향이 없다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M57 · M60
- 확인:
  - test tests/charged-controls.test.mjs :: right hold and mobile toggle gate absorption; releasing cancels an existing connection
  - test tests/environment-muster.test.mjs :: desktop absorption toggle works without touch mode and right hold remains an alternative
- 변경 이력: v0.6 기본 ON(디버그 패널 체크박스) → M57 기본 OFF·입력 방식 변경.

### R-ABS-005 · 초록 동족 흡수 수신 ×0.85
- 규칙: 초록이 동족을 흡수해 받는 Growth에 0.85를 곱한다. 면적 이전 80%와 대형 보상 감소를 적용한 최종 수신에서 15% 비용이 반영된다. 자연 먹이·사냥 드롭에는 적용하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M57
- 확인:
  - config absorption.greenGrowthMultiplier = 0.85
  - test tests/charged-controls.test.mjs :: green same-species absorption receives 85 percent of the original growth reward

### R-ABS-006 · 흡수당하는 AI의 탈출
- 규칙: 흡수 연결이 걸린 AI는 회피 충전이 있으면 흡수자 반대 방향으로 회피를 써서 탈출한다. 충전이 없으면 기존 도주를 유지한다. 탈출은 흡수자의 연결 범위+80까지 이어지며 흡수자가 죽거나 더는 흡수할 수 없으면 즉시 해제한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M11 · M64
- 확인:
  - test tests/frost-shield-apex-motion.test.mjs :: absorbed AI spends dodge charge to flee even before ordinary decisions
  - test tests/ai-rules.test.mjs :: absorption escape releases beyond maintain distance plus margin

### R-ABS-007 · 회피 중에도 흡수 유지
- 규칙: 회피를 시작하거나 회피 무적 상태라는 이유만으로 흡수 연결·진행이 끊기지 않는다. 실제 거리가 유지 거리를 넘어서야 끊어진다. 흡수자·대상 어느 쪽이 회피해도 같다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M77
- 확인:
  - test tests/m77-mobility.test.mjs :: target dodge preserves absorption and progress until actual separation exceeds maintained distance
  - test tests/m77-mobility.test.mjs :: absorber dodge also preserves the link while the target stays close

### R-ABS-008 · 흡수 유지 거리와 저항 시간
- 규칙: 흡수 연결 유지 거리는 30+Size×0.5이고, 대상은 0.2+Size×0.02초의 저항 시간을 가진다. 큰 상대일수록 더 오래 걸리고 더 멀리서도 유지된다. 당기는 힘은 1, 최대 흡수 속도는 5다.
- 상태: 승인
- 출처: v0.4~v0.6 승인 규칙 유지
- 확인:
  - config absorption.baseMaintainDistance = 30
  - config absorption.maintainDistancePerSize = 0.5
  - config absorption.baseResistanceTime = 0.2
  - config absorption.resistancePerSize = 0.02
  - symbol js/absorption.js :: maintainDistanceFor
  - symbol js/absorption.js :: resistanceTimeFor

### R-ABS-009 · 흡수 시작 시 대열 이탈
- 규칙: 흡수를 켜면 플레이어는 즉시 대열에서 이탈한다. 진행 비용은 상대 체력에 비례한다. 해제·실패에도 이미 지불한 비용은 반환하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M58
- 확인:
  - test tests/guard-absorption.test.mjs :: activating absorption leaves a formation and progressive cost scales with target health
