# 게임 기획 문서 — Version 0.4

Version 0.3([../v0.3/GAME_DESIGN.md](../v0.3/GAME_DESIGN.md))의 후속 버전. 이번 버전의 주제는
**Size를 전투력 전체의 단일 통합 지표로 완성하는 것**이다 — HP/공격력/공격 범위/회피 거리/
흡수력/흡수 저항이 전부 Size 하나로부터 파생되도록 만들고, 그 성장 루프를 더 빠르게 돈다.
구체적 변경 목록은 [CHANGELOG.md](../../CHANGELOG.md), 수치 조정 근거는
[BALANCE_NOTES.md](BALANCE_NOTES.md).

## 1. Size 기반 공격력

```
damage = baseAttackDamage + (size - attackDamageReferenceSize) * attackDamagePerSize
```

`js/combat.js#attackDamageForSize()`. 기획안 예시(Size 20→10, 40→20, 80→40)와 정확히
일치하도록 구현했다. 이전까지 고정값이던 `attack.attackDamage`는 완전히 제거되고 이 공식이
유일한 소스가 되었다 — 공격력이 두 곳에서 따로 관리되며 어긋나는 상황을 원천 차단한다.

## 2. Size 기반 공격/회피 범위 (지수 성장)

v0.3까지는 `range = base + (size - reference) * perSize`(선형)이었다. v0.4는 지수 공식으로
교체했다:

```
attackRange   = baseAttackRange   * (size / referenceSize) ^ attackRangeGrowthExponent   (1.2)
dodgeDistance = baseDodgeDistance * (size / referenceSize) ^ dodgeDistanceGrowthExponent (1.1)
```

지수가 1보다 크므로 크기가 커질수록 증가폭 자체가 커진다(체감상 "커질수록 더 유리해진다"는
느낌이 강해진다). 공격 범위의 지수(1.2)가 회피 거리의 지수(1.1)보다 커서, 크게 성장할수록
공격 범위가 회피 거리보다 상대적으로 더 빠르게 벌어진다 — 기획안이 명시한 "공격 범위
증가폭 > 회피 거리 증가폭" 요구사항.

## 3. HP 자동 회복

```
피격 → regenTimer = 0
매 프레임 → regenTimer += dt
regenTimer >= healthRegen.delay(2초) → hp += healthRegen.rate(5)/초, maxHp 상한
```

`js/combat.js#updateHealthRegen()`이 Player/AI 모두에 매 프레임 적용된다(`Game.update()`).
공격력 상승으로 전투가 지나치게 빨리 끝나는 것을 상쇄하는 목적 — 도망쳐서 몇 초 버티면
체력을 회복할 수 있으므로, 전투에 "숨 고르기" 구간이 생긴다.

## 4. AI 흡수 적극성

v0.3까지 AI는 "가장 가까운" 소비 가능 대상을 골랐다. v0.4는 흡수 가능한 대상에 한해
**가장 유리한 크기비(sizeRatio = 내 크기 / 대상 크기)**를 우선한다(`js/ai.js#decideAI()`).
탐지 범위도 별도로 분리했다(`ai.absorptionDetectionRange`, 기본 400 — 일반 감지 범위 320보다
넓음 — "약한 사냥감은 더 멀리서도 알아챈다"는 의도).

우선순위 사다리(기획안 §18):

```
1. 생존(저체력 + 위협적인 상대 → 도주)
2. sizeRatio >= highPriorityAbsorptionRatio(2.0) → 무엇보다 우선 흡수
3. 방금 피격당함 + 반격 가능 → 반격
4. sizeRatio >= absorptionPriorityRatio(1.5) → 흡수 우선
5. 가장 가까운 소비 가능 대상(오브 또는 약한 동색 개체)
6. 적대 개체와 전투(확률적)
7. 배회
```

## 5. 흡수 시스템: 두 번째 실제 버그와 수정

v0.3에서 "당김이 너무 강해 탈출 불가능"을 고쳤는데, v0.4에서 "흡수 속도를 좀 더 높여라"는
요구를 그대로 따르자(`pullForce` 0.35→0.45, `baseResistanceTime` 1.0→0.8) **정반대의
새로운 버그**가 나타났다: 도망치는 대상과 당기는 힘이 `escapeDistance`와 `breakDistance`
사이의 특정 거리에서 정확히 힘의 평형을 이루면서, **흡수가 완료되지도 취소되지도 않고
영원히 그 자리에 멈춰버리는 교착 상태**가 실측으로 확인됐다(재현: sizeRatio 1.5 근방에서
거리가 ~88px에 고정된 채 4.5초 이상 아무 변화 없음). 두 가지 독립적인 수정을 적용했다:

1. **연속적으로 강해지는 당김(rubber-band)**: `escapeDistance`를 넘어선 뒤로는 당기는
   힘이 거리에 비례해 `breakDistance`에 가까워질수록 2차 함수로 강해진다
   (`js/absorption.js#pullRateFor()`). 도망치는 속도가 고정값이라도, 당기는 힘이 계속
   커지므로 이론상 안정적인 평형점이 존재할 수 없다.
2. **탈출 시간 상한(`maxGrabDuration`, 6초)**: 위 수정과 무관하게, 어떤 미래의 수치
   조합에서도 절대 무한정 멈추지 않도록 거리와 무관한 순수 경과 시간 타이머
   (`absorptionElapsed`)를 별도로 두고, 이 시간을 넘기면 무조건 흡수를 취소한다. "몇 초
   안에 끝내지 못하면 놓친다"는 직관적인 규칙이기도 하다.

두 수정 모두 §1(흡수 조작감: 탈출 가능해야 함)을 깨지 않는지 반드시 재검증했다 — 자세한
수치와 테스트 절차는 BALANCE_NOTES 참고.

## 6. 흡수 피드백 강화

- 흡수 시작 시 `absorbStart()` 사운드, 완료 시 `absorbSuccess()` 사운드로 분리
  (`js/audio.js`) — 두 사운드 모두 플레이어가 관련된 흡수에서만 재생(소음 방지).
- 흡수 완료 시 흡수자에게 0.3초짜리 Scale Pulse(반경이 잠깐 18% 커졌다 돌아옴,
  `entity.scalePulseTimer`, `Game.drawEntity()`) — "커졌다"는 감각을 시각적으로 강조.
- 플레이어가 흡수로 성장하면 "+N GROWTH" 플로팅 텍스트 팝업(`Game.spawnFloatingText`).

## 7. 킬 보상

```
reward = killReward.baseReward * (deadEnemySize / killReward.referenceSize) ^ killReward.growthExponent
```

`Game.onEntityDeath()`에서 공격으로 마지막 타격을 가한 주체(Player 또는 AI, Size 기준
전투력 통합 철학에 따라 둘 다 동일 규칙)에게 직접 Growth를 지급한다. 죽은 개체가 남기는
Death Orb(파편)와는 별개의 보상이다 — Orb는 주변 누구나 주울 수 있는 자원이고, Kill Reward는
"직접 끝장낸" 대가로 즉시 지급된다. 플레이어가 처치한 경우 "+N GROWTH"/"KILL +1" 팝업과
전용 사운드(`audio.killReward()`)가 추가로 재생된다.

## 8. Orb 밀도 재조정

`spawning.initialOrbCount/maxOrbCount/orbSpawnInterval`을 v0.3의 400/500/0.4에서
450/600/0.25로 더 올렸다 — v0.3에서 이미 크게 늘렸음에도 실제 플레이에서는 60~80마리
AI + 플레이어가 동시에 소비하다 보니 여전히 부족하게 느껴질 수 있다는 QA를 반영했다(정확한
수치 판단 근거는 BALANCE_NOTES 참고).

## 9. Size 통합 관계도 (최종형)

```
              Size
               │
   ┌────┬────┬─┴──┬────┬──────┬────────┐
   ↓    ↓    ↓    ↓    ↓      ↓        ↓
  HP  Damage Range Dodge Absorb  Absorb   Skill
                          Power  Resist   Stage
```

Player와 AI 양쪽 모두 완전히 동일한 함수(`sizeFromGrowth`, `computeSkillStage`,
`attackDamageForSize`, `attackRangeForSize`, `dodgeDistanceForSize`,
`absorption.js#computeResistanceTime`)를 공유한다 — "같은 Size = 같은 전투력"이 v0.2부터
이어진 핵심 불변 조건이며, v0.4는 여기에 공격력까지 마저 통합해 완성했다.

## 10. 나머지 시스템

맵/카메라/HUD/넉백/사운드 구조 등은 v0.3과 동일하다. 자세한 내용은
[../v0.3/GAME_DESIGN.md](../v0.3/GAME_DESIGN.md)를 참고.

## 11. 향후 확장 방향

- 흡수 교착 방지용 `maxGrabDuration`이 "무조건 6초 후 취소"라는 다소 인위적인 규칙이다.
  더 자연스러운 해법(예: 저항 시간 자체에 상한을 두거나, 흡수 시도 실패 시 짧은 재시도
  쿨다운을 부여하는 방식)으로 대체하는 것을 고려할 수 있다.
- Kill Reward와 Death Orb가 둘 다 "적 크기에 비례한 보상"이라 다소 중복처럼 느껴질 수
  있다 — 장기적으로는 Death Orb를 줄이고 Kill Reward 비중을 높이는 식으로 통합하는 것도
  검토 가능.
- HP Regen이 회피/도주와 결합하면 사실상 무적에 가까워질 수 있다("때리고 도망가서 회복,
  다시 때리고 도망" 루프) — 장시간 플레이 후 체감 난이도를 지켜볼 필요가 있다.
