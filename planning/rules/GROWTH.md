# 성장·시야·생존 규칙 (GROWTH)

도메인 규칙 카드. 형식은 `README.md`. 기획서 §4(성장과 카메라, 제안 008)와 v0.4~v0.6 승인 규칙 중 구현으로 확인된 것만 카드로 옮겼다. 구현이 이후 바뀐 부분은 변경 이력과 `00_기준/구현추인/30_구승인규칙_대조표.md`에 적었다.

### R-GROWTH-001 · 성장에 따른 카메라 줌아웃
- 규칙: 몸이 커질수록 시야가 넓어진다. 줌은 절대 크기(지름)로 정하며 `zoom = baseZoom / min(maxZoomOut, 1 + Size×0.003)`이다(크기 약 333부터 0.5 상한). 기존의 부드러운 추적을 유지하고, 자기 몸 직경이 화면 짧은 변의 42%를 넘지 않도록 줌을 추가로 제한한다. 카메라가 넓어져도 AI 감지 거리는 늘리지 않는다.
- 상태: 승인
- 출처: 제안 008 사용자 승인 2026-10-02 · v0.6 · M55
- 확인:
  - config camera.baseZoom = 1
  - config camera.zoomOutPerSize = 0.003
  - config camera.maxZoomOut = 2
  - config camera.maxBodyScreenFraction = 0.42
  - symbol js/game.js :: updateCamera
  - test tests/large-size-play.test.mjs :: camera bounds player diameter even after instant growth and mobile rotation

### R-GROWTH-002 · 성장치·크기·체력 관계
- 규칙: 플레이어는 크기 20·성장 0·HP 100·이동속도 250으로 시작한다. 성장치는 1.6의 비율로 크기(지름)로 환산되고, 성장 1당 최대 HP가 0.4 늘어난다. 초기 성장값은 첫 먹이 전부터 크기·HP·능력 해금에 반영된다. 크기를 잃지 않는 Life 부활(최대 3회)을 유지한다.
- 상태: 승인
- 출처: v0.4~v0.6 승인 규칙 유지 · M14
- 확인:
  - config player.startingSize = 20
  - config player.startingGrowth = 0
  - config player.startingHp = 100
  - config player.moveSpeed = 250
  - config player.hpPerGrowth = 0.4
  - config growth.growthToSizeRatio = 1.6
  - config lives.maxLives = 3
  - test tests/progression.test.mjs :: initial growth immediately sets size, HP and skill capacity before the first pickup

### R-GROWTH-003 · 공격·회피 스택 해금
- 규칙: 공격은 크기 40에서 1스택, 100에서 2스택, 회피는 50에서 1스택, 70에서 2스택을 얻는다. 스택은 크기에 따라 해금·증가하며 해금 기준은 F1에서 바꿀 수 있고 바뀌면 생존 개체의 스택이 0~용량 안으로 보정된다(증가한 슬롯만 새로 충전). 성장 안내는 점수가 아니라 현재 크기와 임계값으로 다음 해금을 계산한다.
- 상태: 승인
- 출처: v0.5 승인 규칙 유지 · M14
- 확인:
  - config skills.attackStackThresholds[0].size = 40
  - config skills.attackStackThresholds[0].maxStack = 1
  - config skills.attackStackThresholds[1].size = 100
  - config skills.attackStackThresholds[1].maxStack = 2
  - config skills.dodgeStackThresholds[0].size = 50
  - config skills.dodgeStackThresholds[1].size = 70
  - test tests/progression.test.mjs :: capacity reductions clamp empty or partly spent player/AI stacks and increases award only new slots
  - test tests/progression.test.mjs :: growth guidance follows configured nearest unlocks and ignores score

### R-GROWTH-004 · 자연 회복
- 규칙: 피격 후 5초가 지나면 체력이 서서히 회복된다. 회복 속도는 기본 2에 크기당 0.05를 더하며, 피격하면 회복 지연이 초기화된다. 성장으로 최대 HP가 늘어도 자동 회복은 주지 않는다(흡수 비용 규칙과 공통). 회복 유물은 속도만 1.25배 한다.
- 상태: 승인
- 출처: v0.5 승인 규칙 유지 · M61 · M71
- 확인:
  - config healthRegen.delay = 5
  - config healthRegen.baseRate = 2
  - config healthRegen.regenPerSize = 0.05
  - test tests/relics.test.mjs :: regen relic scales rate but keeps damage delay and maximum HP

### R-GROWTH-005 · 공통 점수
- 규칙: 플레이어와 AI는 같은 점수 규칙을 쓴다. 모든 개체의 점수는 생성 시 0이며, 먹이는 성장값 반올림, 동족 흡수는 흡수한 성장값 반올림, 처치는 직접 성장 보상+100을 점수로 얻는다. HUD·로컬 Top 10은 플레이어 점수를 한 번만 가산한다. 점수는 직위 판정에 쓰지 않는다(직위는 크기 기준, R-ECO-001).
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 002-r2 · v0.7 · M7로 직위 기준 분리
- 확인:
  - symbol js/game.js :: awardScore
  - test tests/ecology.test.mjs :: common score credited to AI and player without HUD duplication
- 변경 이력: 제안 002-r2에서는 점수가 직위 기준이었으나 M7에서 직위가 크기 기준으로 바뀌어 점수는 순위 표시용이다.

### R-GROWTH-006 · 후반 성장 곡선
- 규칙: 후반에도 성장이 정체되지 않도록 크기 25 이후 보상 배율을 최대 1.4배까지 서서히 올린다(전환 구간 50). 단 크기 400~500에서는 대형 성장 보상 감소(R-COMBAT-011)가 함께 적용된다. 먹이 밀도는 면적당 최소 밀도로 보충된다(R-ECO-007).
- 상태: 승인
- 출처: 사용자 요청(v0.6 후반 정체 방지) · M41
- 확인:
  - config growth.lateThreshold = 25
  - config growth.lateMultiplier = 1.4
  - config growth.lateTransition = 50
