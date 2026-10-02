# 탑뷰 2D 성장형 액션 게임 — 웹 프로토타입 (Version 0.2)

Version 0.1을 기반으로 **Size(크기)를 게임의 핵심 통합 지표**로 삼도록 확장한 버전입니다.
Orb/Fragment를 하나의 자원으로 통합하고, 같은 색상 개체 사이에는 크기 기반 위계와 "흡수
저항 시간"을 추가했으며, 공격/회피 해금과 사거리도 모두 Growth가 아닌 **Size** 기준으로
동작합니다. 전체 변경 배경은 [GAME_DESIGN.md](GAME_DESIGN.md), 실제 플레이 테스트 결과는
[BALANCE_NOTES.md](BALANCE_NOTES.md), 버전 간 변경 이력은 상위 폴더의
[../../CHANGELOG.md](../../CHANGELOG.md)를 참고하세요.

Version 0.1은 삭제되지 않고 [../v0.1/](../v0.1/)에 그대로 남아 있습니다.

## 1. 실행 방법

```bash
cd game/versions/v0.2
python -m http.server 8422
```

`http://localhost:8422` 접속. (`fetch()`로 `config/gameBalance.json`을 읽으므로 `file://`
직접 열기는 지원하지 않습니다.)

## 2. 조작법

Version 0.1과 동일합니다.

| 입력 | 동작 |
| --- | --- |
| `W` `A` `S` `D` / 방향키 | 이동 |
| 마우스 | 공격 방향 조준 |
| 좌클릭(누르고 있으면 쿨다운마다 자동 재시도) | 공격 (Size ≥ `skills.attackUnlockSize` 이후 사용 가능) |
| `Space` | 회피 (Size ≥ `skills.dodgeUnlockSize` 이후 사용 가능) |
| `F1` | 디버그/밸런스 패널 열기·닫기 |

## 3. Version 0.1과 달라진 점 (요약)

- **Orb/Fragment 통합**: 적 처치 시 생성되던 "Fragment"는 이제 별도 타입이 아니라 죽은
  개체의 색을 물려받은 일반 Orb입니다.
- **색상 무관 Orb 섭취**: 방황하는 Orb는 색상에 상관없이, 크기만 충분히 작으면 누구든
  먹을 수 있습니다. 색상은 이제 "세력/전투 관계"만 결정합니다.
- **같은 색상 개체 간 흡수(Absorption)**: 같은 색상의 Player/AI끼리는 크기가 큰 쪽이 작은
  쪽을 "흡수"할 수 있습니다. 단, 즉시 흡수되지 않고 크기 차이에 따른 저항 시간이 존재하며,
  저항 중 크기 관계가 역전되면 흡수가 취소됩니다. 흡수 중에는 화면에 연결선 + 진행률 링이
  표시됩니다.
- **Skill Stage(Size 기준)**: 공격/회피 해금 기준이 Growth에서 **Size**로 바뀌었고, Player와
  AI가 완전히 동일한 규칙을 공유합니다. 즉, 같은 크기의 Player와 AI는 항상 같은 능력을
  가집니다.
- **성장형 전투 범위**: 공격 사거리와 회피 거리가 고정값이 아니라 Size에 비례해서 커집니다.
- **공격 준비 시간 단축**: 0.5초 → 0.2초.

## 4. 프로젝트 구조

```
v0.2/
├── index.html
├── css/style.css
├── js/
│   ├── main.js         # 부트스트랩: 설정 로드, 입력 처리, 게임 루프
│   ├── game.js          # Game 클래스: 월드/카메라/파티클/렌더링/스폰/소비 루프
│   ├── player.js        # Player 엔티티(성장, Size 기반 Skill Stage)
│   ├── entity.js        # 공통 Entity 베이스 + growth→size 공식 + computeSkillStage()
│   ├── ai.js             # AI 엔티티 + 상태 머신(Search/Chase/Attack/Dodge/Flee)
│   ├── combat.js         # 공격/회피 상태 머신(공유) + Size 기반 사거리 계산
│   ├── absorption.js    # v0.2 신규: 같은 색상 위계 흡수 시스템
│   ├── collision.js     # 거리/Orb 섭취 조건/흡수 가능 여부/적대 관계 판정
│   ├── spawning.js      # 오브/AI/사망-오브 생성 팩토리
│   └── ui.js             # HUD 갱신 + 디버그 패널 생성/바인딩
├── config/
│   └── gameBalance.json # 모든 밸런스 수치
├── GAME_DESIGN.md
├── BALANCE_NOTES.md
└── README.md
```

## 5. `gameBalance.json` 설명

```json
{
  "player": { "startingSize": 20, "startingHp": 100, "moveSpeed": 250, "hpPerGrowth": 0.4 },
  "growth": { "growthToSizeRatio": 1.6, "minEatSizeDifference": 0 },
  "attack": { "attackDamage": 20, "attackTelegraphTime": 0.2, ... },
  "dodge":  { "dodgeDuration": 0.2, "dodgeCooldown": 3.0, ... },
  "skills": { "attackUnlockSize": 40, "dodgeUnlockSize": 80 },
  "absorption": { "baseResistanceTime": 1.0, "resistancePerSize": 0.1,
                   "sizeRatioForFastAbsorption": 2.0, "sizeRatioForInstantAbsorption": 3.0 },
  "combatScaling": { "referenceSize": 40, "baseAttackRange": 80, "attackRangePerSize": 1.0,
                       "baseDodgeDistance": 100, "dodgeDistancePerSize": 1.0 },
  "ai":     { "spawnCount": 40, "detectionRange": 320, ... },
  "world":  { "worldWidth": 5000, "worldHeight": 5000, ... },
  "deathOrb": { "deathOrbCount": 5, "deathOrbGrowthValue": 5, "deathOrbSize": 9 },
  "colors": [ { "id": "blue", "color": "#3B82F6" }, ... ]
}
```

값을 바꾼 뒤 새로고침하면 반영됩니다. 플레이 중이라면 `F1` 디버그 패널로 새로고침 없이 즉시
반영할 수 있습니다.

## 6. 주요 밸런스 변수

| Category | Variable | Default | Description |
| -------- | ------------------- | ------: | ----------- |
| Player   | startingSize        |      20 | 플레이어 시작 크기 |
| Player   | startingHp          |     100 | 플레이어 시작 HP |
| Player   | moveSpeed           |     250 | 플레이어 이동속도 |
| Player   | hpPerGrowth         |     0.4 | growth 1당 최대 HP 증가량 |
| Growth   | growthToSizeRatio   |     1.6 | growth→size 변환 계수(제곱근 커브) |
| Growth   | minEatSizeDifference |      0 | Orb 섭취에 필요한 최소 크기 차이 |
| **Skills** | **attackUnlockSize** | **40** | **공격 해금 기준 Size (모든 개체 공통)** |
| **Skills** | **dodgeUnlockSize**  | **80** | **회피 해금 기준 Size (모든 개체 공통)** |
| Attack   | attackDamage        |      20 | 공격 피해량 |
| Attack   | attackTelegraphTime |     0.2 | 공격 준비시간(v0.1의 0.5초에서 단축) |
| Attack   | attackChargeSpeed   |     650 | 돌진 속도 |
| Attack   | attackChargeDuration |    0.25 | 돌진 지속시간 |
| Attack   | attackCooldown      |     1.5 | 공격 쿨다운 |
| Attack   | attackRecoveryTime  |     0.4 | 공격 후딜레이 |
| Dodge    | dodgeDuration       |     0.2 | 회피 이동 지속시간 |
| Dodge    | dodgeInvincibleTime |    0.22 | 회피 무적 시간 |
| Dodge    | dodgeCooldown       |       3 | 회피 쿨다운 |
| **Absorption** | **baseResistanceTime** | **1.0** | **흡수 기본 저항 시간(초)** |
| **Absorption** | **resistancePerSize** | **0.1** | **대상 크기 1당 저항 시간 추가량** |
| **Absorption** | **sizeRatioForFastAbsorption** | **2.0** | **이 크기비 이상이면 저항 급격히 감소** |
| **Absorption** | **sizeRatioForInstantAbsorption** | **3.0** | **이 크기비 이상이면 즉시 흡수** |
| **CombatScaling** | **baseAttackRange / attackRangePerSize** | **80 / 1.0** | **공격 사거리 = base + (size-referenceSize)×perSize** |
| **CombatScaling** | **baseDodgeDistance / dodgeDistancePerSize** | **100 / 1.0** | **회피 거리 = base + (size-referenceSize)×perSize** |
| AI       | spawnCount          |      40 | 초기 AI 총 수(색상별 균등 분배) |
| AI       | detectionRange      |     320 | AI 감지 범위 |
| AI       | aggression          |    0.55 | 적대 대상 발견 시 전투를 선택할 확률 |
| AI       | fleeThreshold       |     0.3 | 이 HP 비율 이하 + 상대가 더 크면 도주 |
| World    | maxOrbCount         |     320 | 동시 존재 가능한 최대 Orb 수 |
| Death Orb | deathOrbCount / deathOrbGrowthValue / deathOrbSize | 5 / 5 / 9 | 적 처치 시 생성되는 Orb 개수/성장량/크기 |

## 7. Debug Mode 사용법

`F1`로 열리는 디버그 패널에 Player/Growth/**Skills**/**Absorption**/**Combat Scaling**/
Attack/Dodge/AI/World/Death Orb 섹션이 있습니다. 값 변경은 새로고침 없이 즉시 반영됩니다.

## 8. 새로운 색상 추가 방법

Version 0.1과 동일 — `config/gameBalance.json`의 `colors` 배열에 항목만 추가하면 됩니다.

## 9. 새로운 AI 추가 방법

Version 0.1과 동일한 구조(`js/ai.js`의 `decideAI()`/`moveAI()`)를 사용합니다. 다만 v0.2에서는
AI의 공격 가능 여부도 `ai.attackUnlocked`(Size 기반)로 게이팅되므로, 새 행동을 추가할 때
`ai.attackUnlocked`/`ai.dodgeUnlocked`를 확인하고 분기하세요.

## 10. 향후 확장 방법

- **흡수 취소 조건 확장**: 현재는 "크기 역전"만으로 흡수를 취소합니다(`js/absorption.js`).
  "흡수자가 공격받으면 취소" 같은 추가 조건은 `updateAbsorptions()`에 조건을 하나 더
  추가하면 됩니다.
- **Skill Stage 확장**: `js/entity.js`의 `computeSkillStage()`에 분기를 추가하고,
  `gameBalance.json`의 `skills`에 새 임계값을 추가하면 Stage 3, 4 등을 확장할 수 있습니다.
- 그 외 확장 방법은 [GAME_DESIGN.md](GAME_DESIGN.md) §19를 참고하세요.
