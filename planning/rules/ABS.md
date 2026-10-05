# 흡수 규칙 (ABS)

도메인 규칙 카드. 형식은 `README.md`. 근거: `00_기준/구현추인/cloud-spec-2fd3bd8/GAME_DESIGN.md` M39·M57·M58·M61·M64·M66·M71·M77(번호가 클수록 우선).

### R-ABS-001 · 면적 80% 이전
- 규칙: 흡수 원래 보상은 현재 면적 80%를 이전하도록 산출한다. 실제 수신에는 공통 성장 속도 계수 R-GROWTH-007, 대형 감소와 초록 계수를 적용한다. 먹이 구슬도 공통 속도 계수를 적용한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M39
- 확인:
  - config absorption.areaEfficiency = 0.8
  - symbol js/absorption.js :: absorptionGrowthFor
- 변경 이력: 이전에는 누적 growth만 옮겼다.
- 변경 이력: M79 사용자 성장 속도 절반 요청으로 계산 원본은 80%를 유지하되 최종 수신은 공통 ×0.5 적용. 무감소/무종족 비용 조건에서도 실효 면적 이전은 약 40% 수준이다.

### R-ABS-002 · 흡수 위험 비용 곡선
- 규칙: 기존 Size 비율 비용 곡선과 시작 최대 HP 기준·1% 생존 바닥을 유지한다. 양의 비용에는 (0.2+0.8×대상 시작 HP 비율)을 곱하고 진행에 비례해 실제 비용을 낸다. 작은 대상의 회복은 완료 시 적용한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M58 · M61 · M66 · M71
- 확인:
  - config absorption.healthRatioCurve[1].hpFraction = -0.03
  - config absorption.healthRatioCurve[2].hpFraction = 0.2
  - config absorption.healthRatioCurve[3].hpFraction = 0.75
  - config absorption.healthRatioCurve[4].hpFraction = 0.8
  - config absorption.healthFloorFraction = 0.01
  - config absorption.woundedCostFloor = 0.2
  - config absorption.healthCostProgressFraction = 1
  - symbol js/absorption.js :: absorptionHealthFraction
  - test tests/charge-weather-risk.test.mjs :: healthy absorption curve gives 75 percent at near-equal size, 20 percent at half and 3 percent recovery when tiny
  - test tests/charge-weather-risk.test.mjs :: tiny ally absorption heals a wounded absorber by 3 percent of its starting max HP
  - test tests/charge-weather-risk.test.mjs :: R-ABS-002 absorption pays full proposed cost progressively and success restores actual spending
  - test tests/apex-wars.test.mjs :: absorption floor is one percent of max HP and never cancels or kills due to cost
- 변경 이력: M58 비용 모델 → M59 25%진행/75%완료 충격 → M61 곡선 재정의 → M66 전액 진행 비례 → M71 성공 복구 규칙 확정.
- 변경 이력: M79 부상 비용 하한 0.5→0.2. 대상 HP 25%에서 건강한 대상 비용의 40%, 시간도 40%다. 미승인 변경(M79): 세부 계수는 사용자 저체력 저비용 요청의 초기 밸런스.

### R-ABS-003 · 흡수 성공 복구
- 규칙: 성공 시 기존 크기별 실제 지불 비용 100%~90% 복구를 유지한다. 취소·탈출·실패에서는 R-ABS-010에 따라 진행량 감소와 함께 실제 지불 HP를 복구한다. 외부 공격 피해는 복구하지 않는다.
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
- 변경 이력: M79 실패 무환급→취소 진행 감소에 비례한 환급으로 사용자 요청 반영. 성공 환급률은 유지한다.

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
- 규칙: 유지 거리는 max(30+내 Size×0.5, 두 몸 반지름 합+30+내 Size×0.15)이다. 저항 시간은 (0.2+대상 Size×0.02)×(0.2+0.8×대상 시작 HP 비율)이다. 몸 접촉에서는 진행 속도 5, 표면 간격이 유지 경계에 가까워지면 선형 감소한다. 흡인력은 R-ABS-011을 따른다.
- 상태: 승인
- 출처: v0.4~v0.6 승인 규칙 유지
- 확인:
  - config absorption.baseMaintainDistance = 30
  - config absorption.maintainDistancePerSize = 0.5
  - config absorption.baseResistanceTime = 0.2
  - config absorption.resistancePerSize = 0.02
  - symbol js/absorption.js :: maintainDistanceFor
  - symbol js/absorption.js :: resistanceTimeFor
- 변경 이력: M79 Size700/650 접촉 중심거리675가 기존 유지거리380보다 커 연결 불가였음. 표면 기준으로 보정해 건강 대상 약2.62초·HP25% 약1.05초에 완료. 미승인 변경(M79): 여유거리 계수0.15·부상 시간 하한0.2는 초기 튜닝.

### R-ABS-009 · 흡수 시작 시 대열 이탈
- 규칙: 흡수를 켜면 플레이어는 즉시 대열에서 이탈한다. 비용은 대상 시작 체력에 비례하며 취소 시 R-ABS-010에 따라 환급한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M58
- 확인:
  - test tests/guard-absorption.test.mjs :: activating absorption leaves a formation and progressive cost scales with target health
- 변경 이력: M79 기존 무환급 서술을 사용자 취소 환급 요청으로 대체.

### R-ABS-010 · 흡수 취소 진행 감소·HP 환급
- 규칙: 연결 취소 후 0.6초 동안 진행량을 선형 감소시키고, 실제 지불 비용을 같은 비율로 환급한다. 외부 전투 피해와 지불하지 못한 비용은 환급하지 않는다. 재연결 전 이전 잔여 환급을 정산해 누락·중복을 막고, 사망한 흡수자는 회복하지 않는다.
- 상태: 제안
- 출처: 사용자 요청 2026-10-05 · M79
- 확인:
  - config absorption.cancelDecaySeconds = 0.6
  - symbol js/absorption.js :: settleCancellation
  - test tests/m79-systems.test.mjs :: R-ABS-010 cancellation restores only paid HP
- 변경 이력: M79 신규 카드. 세부 초기 수치는 미승인 변경(M79), 플레이 피드백으로 재조정한다.

### R-ABS-011 · 강화 흡인과 파랑 보너스
- 규칙: 기본 흡인력1→1.2, 파랑은 추가 ×1.3(실효1.56). 지수 감쇠 이동으로 계수가1을 넘어도 NaN·중심 통과가 발생하지 않는다.
- 상태: 제안
- 출처: 사용자 요청 2026-10-05 · M79
- 확인:
  - config absorption.pullForce = 1.2
  - config absorption.bluePullMultiplier = 1.3
  - test tests/m79-systems.test.mjs :: R-ABS-011 blue suction
- 변경 이력: M79 신규 카드. 세부 초기 수치는 미승인 변경(M79), 플레이 피드백으로 재조정한다.
