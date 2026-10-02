# 게임 기획 문서 — Version 0.2

Version 0.1([../v0.1/GAME_DESIGN.md](../v0.1/GAME_DESIGN.md))의 후속 버전. 핵심 변경 방향은
**Size(크기)를 게임의 단일 통합 지표로 만드는 것**이다 — 섭취 가능 여부, 같은 색상 개체 간
위계, 스킬 해금, 공격/회피 사거리가 전부 Size 하나로부터 파생된다. 버전 간 구체적인 차이는
루트의 [CHANGELOG.md](../../CHANGELOG.md)를 참고.

## 1. 핵심 관계도

```
              Size
               │
       ┌───────┼────────┐
       ↓       ↓        ↓
   섭취 가능  Skill    Combat
             Stage       │
               │     ┌───┴───┐
               ↓     ↓       ↓
             Attack  Attack  Dodge
             Unlock  Range   Range
```

Color는 더 이상 "섭취 가능 여부"에 관여하지 않는다. Color가 결정하는 것은 오직 **세력/전투
관계**뿐이다 (다른 색 = 적대, 같은 색 = 위계).

## 2. Orb / Fragment 통합

v0.1에서 별도 타입이던 `Orb`와 `Fragment`를 하나의 `behavior: 'orb'` Entity로 통합했다
(`js/entity.js`, `js/spawning.js`). 적 처치 시 생성되는 것은 더 이상 특별한 "Fragment"가
아니라, 죽은 개체의 색을 물려받은 작은 Orb(`spawnDeathOrbs()`)일 뿐이다. 렌더링에서만
`fromDeath` 플래그로 살짝 다른 표시(십자 마크)를 준다 — 게임 로직상의 차이는 없다.

## 3. 두 가지 소비 규칙

플레이 테스트를 통해, 소비 규칙을 두 갈래로 명확히 나누는 것이 v0.1의 스냅피한 손맛을
해치지 않으면서도 새 기획서의 "위계/흡수" 요구를 살리는 가장 자연스러운 해석이라고 판단했다.

### 3-1. Orb 섭취 (색상 무관, 즉시)

```
Orb.size < 포식자.size
→ 색상과 무관하게 즉시 섭취
```

`js/collision.js#canEatOrb()`. 저항 시간 없음 — 방황하는 작은 Orb를 먹는 느낌은 v0.1과 동일하게
스냅피하게 유지한다.

### 3-2. 같은 색상 개체 간 흡수 (위계, 저항 시간 있음)

```
target.color === absorber.color
AND target.size < absorber.size
AND target이 아직 다른 absorber에게 흡수되고 있지 않음
→ 흡수 시작 (즉시 완료되지 않음)
```

`js/collision.js#canAbsorb()` + `js/absorption.js`. Player와 AI 모두 동일 규칙을 따르므로,
성장한 같은 색 AI가 플레이어를 흡수하는 것도 가능하다 — 이 경우 플레이어는 "ABSORBED"
메시지와 함께 리스폰한다(`Game.onEntityDeath`가 아니라 `absorption.js#completeAbsorption`이
직접 `Game.respawnPlayer()`를 호출).

## 4. 흡수 저항 시간 공식

```
sizeRatio = absorber.size / target.size
baseTime  = absorption.baseResistanceTime + target.size * absorption.resistancePerSize

sizeRatio >= sizeRatioForInstantAbsorption   → 저항 시간 0 (즉시 흡수)
sizeRatio >= sizeRatioForFastAbsorption      → baseTime의 40%에서 0%까지 선형 감소
1 < sizeRatio < sizeRatioForFastAbsorption   → baseTime의 100%에서 40%까지 선형 감소
```

`js/absorption.js#computeResistanceTime()`. 대상 자신의 크기가 클수록(`resistancePerSize`)
저항이 늘고, 흡수자와의 상대적 크기 차이가 클수록(`sizeRatio`) 저항이 줄어드는 두 요구사항을
모두 반영한다. 저항 중에는 대상이 흡수자 쪽으로 서서히 끌려가며(`updateAbsorptions`의 pull
보간), 화면에는 둘을 잇는 연결선과 대상 주위의 진행률 링이 표시된다(`Game.drawAbsorptionLinks`,
`Game.drawEntity`).

## 5. 흡수 취소

구현 우선순위대로, **크기 관계가 역전되면 취소**만 구현했다(흡수자가 공격받아 취소되는 것은
향후 확장 과제로 남김):

```
absorber가 죽음  OR  target.size >= absorber.size
→ 즉시 취소, target은 그대로 생존
```

`js/absorption.js#updateAbsorptions()`에서 매 프레임 검사한다. 흡수 중인 대상은
움직임/AI 판단이 완전히 정지되므로(§7), 대상이 스스로 커져서 역전을 일으키는 경우는
현재 구조상 드물지만(제3자의 개입 등 향후 확장 여지), 흡수자가 다른 존재에게 공격받아
죽는 경우는 실제로 자주 발생하며 정확히 취소된다.

## 6. Skill Stage (Size 기준, Player/AI 공통)

```
size <  attackUnlockSize            → Stage 0 (공격 LOCKED, 회피 LOCKED)
attackUnlockSize <= size < dodgeUnlockSize → Stage 1 (공격 READY, 회피 LOCKED)
size >= dodgeUnlockSize             → Stage 2 (공격 READY, 회피 READY)
```

`js/entity.js#computeSkillStage()` 하나를 Player(`player.js`)와 AI(`ai.js`)가 동일하게
호출한다. 따라서 "같은 Size = 같은 Skill Stage"가 코드 구조상으로 보장된다 — 별도로
동기화할 필요가 없다. AI는 이제 막 태어난 개체(Size 17~28 정도)는 공격이 잠겨 있으므로,
`js/ai.js#decideAI()`는 `ai.attackUnlocked`가 false면 적대 개체를 만나도 전투를 선택하지
않는다(대신 도주 조건만 계속 평가).

## 7. 흡수/피격 중 행동 정지

`js/ai.js#updateAI()`와 `js/game.js#updatePlayer()`는 `entity.beingAbsorbedByRef`가 설정된
동안 모든 자발적 행동(이동, 재판단, 공격/회피 시작)을 건너뛴다 — 위치 갱신은 오직
`absorption.js#updateAbsorptions()`의 pull 보간을 통해서만 일어난다. `combat.js`의
`canStartAttack`/`canStartDodge`도 같은 조건을 검사해, 흡수되는 도중에는 공격/회피를 새로
시작할 수 없다.

## 8. 성장형 전투 범위

```
attackRange   = combatScaling.baseAttackRange   + (size - referenceSize) * attackRangePerSize
dodgeDistance = combatScaling.baseDodgeDistance + (size - referenceSize) * dodgeDistancePerSize
```

`js/combat.js#attackRangeForSize()` / `#dodgeDistanceForSize()`. 값은 액션을 **시작하는
순간의 Size로 스냅샷**되어 `entity.currentAttackRange` / `entity.currentDodgeDistance`에
저장된다(액션 도중 크기가 변해도 그 액션의 사거리는 흔들리지 않는다). 공격 판정 반경과
텔레그래프 방향선 길이 모두 이 스냅샷 값을 사용한다.

## 9. 공격 준비 시간

`attack.attackTelegraphTime`을 0.5 → **0.2초**로 단축했다(§3). 텔레그래프 상태 자체는
그대로 유지되며(방향선 + 원형 게이지 표시), 반응할 시간이 줄어들었을 뿐 "준비 없는 즉시
공격"으로 바뀐 것은 아니다.

## 10. 나머지 시스템

맵/카메라/HUD/파티클/디버그 패널/공간 그리드 등은 v0.1과 동일한 구조를 유지한다. 자세한
내용은 [../v0.1/GAME_DESIGN.md](../v0.1/GAME_DESIGN.md) §12-19를 참고하되, "성장에 따른
스킬 해금"과 "공격/회피 범위"는 이 문서 §6, §8의 Size 기준 규칙으로 대체된 것으로 읽는다.

## 11. 향후 확장 방향

- 흡수 취소 조건에 "흡수자가 공격받으면 취소" 추가.
- Skill Stage 3, 4 확장(예: 돌진 강화, 광역 공격 등) — `computeSkillStage()`와
  `gameBalance.json`의 `skills`에 값만 추가하면 됨.
- 같은 색상 팀 내 흡수를 자원 경쟁뿐 아니라 "동맹 강화"(흡수한 개체 수에 따른 보너스) 같은
  방향으로 발전시키는 것도 고려 가능.
