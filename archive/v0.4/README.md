# 탑뷰 2D 성장형 액션 게임 — 웹 프로토타입 (Version 0.4)

Version 0.3의 플레이 QA 결과를 반영한 버전. **Size를 전투력 전체의 통합 지표로 만드는 것**에
집중했다 — 공격력·공격 범위·회피 거리가 모두 Size에 훨씬 강하게 연동되고, HP 자동 회복,
더 적극적인 AI 흡수 행동, 강화된 흡수 피드백, 늘어난 Orb 밀도, 크기 비례 킬 보상이 추가됐다.
배경은 [GAME_DESIGN.md](GAME_DESIGN.md), 실측 결과(특히 흡수 시스템에서 발견된 두 번째
실제 버그)는 [BALANCE_NOTES.md](BALANCE_NOTES.md), 버전 이력은
[../../CHANGELOG.md](../../CHANGELOG.md).

Version 0.1/0.2/0.3은 삭제되지 않고 각 폴더에 그대로 있다.

## 1. 실행 방법

### 가장 쉬운 방법 (Windows)

이 폴더 안의 **`run.bat`을 더블클릭**하세요. Python이 있으면 자동으로 로컬 서버를 띄우고,
없으면 Node.js(`npx serve`)로 대체 시도합니다. 서버가 뜨면 브라우저에서
`http://localhost:8000`으로 접속하세요. macOS/Linux는 `./run.sh`.

### 수동 실행

```bash
cd game/versions/v0.4
python -m http.server 8000
```

`http://localhost:8000` 접속. (`fetch()`로 설정 JSON을 읽으므로 `index.html` 직접 더블클릭은
지원하지 않습니다.)

## 2. 조작법

Version 0.3과 동일합니다 — `WASD` 이동, 마우스 조준, 좌클릭 공격, `Space` 회피(공격 중
어느 단계에서도 즉시 취소하고 발동), `F1` 디버그 패널.

## 3. Version 0.3 대비 달라진 점 (요약)

- **공격력이 Size에 비례**: `Damage = baseAttackDamage + (size - referenceSize) × perSize`.
  작은 공과 큰 공의 전투력 차이가 명확해지고, 전투 시간이 짧아짐.
- **HP 자동 회복**: 마지막 피격 후 `healthRegen.delay`초가 지나면 `healthRegen.rate`
  HP/초로 서서히 회복(다시 맞으면 딜레이 초기화). 전투력 상승으로 전투가 지나치게
  일방적으로 짧아지는 것을 상쇄.
- **공격/회피 범위가 지수적으로 증가**: 고정 기울기 대신
  `range = baseRange × (size/referenceSize)^exponent` — 공격 범위가 회피 거리보다 더
  가파르게 커짐.
- **AI가 적극적으로 흡수 대상을 사냥**: 가장 가까운 대상이 아니라 **가장 유리한 크기비**의
  대상을 우선 탐색(`absorptionDetectionRange`), 압도적으로 유리하면(`highPriorityAbsorptionRatio`)
  전투 중이어도 흡수를 우선.
- **흡수 시스템 2차 개선(중요 버그 수정 포함)**: 흡수 속도를 높이면서도, 도망치는 대상과
  일정 거리 밖에서 힘이 정확히 균형을 이뤄 **영원히 끝나지도 취소되지도 않는 교착 상태**가
  실제로 발생하는 것을 발견해 수정. 자세한 내용은 BALANCE_NOTES 참고.
- **흡수 시작/성공 사운드 분리 + 흡수자 Scale Pulse 이펙트**.
- **킬 보상**: 적 처치 시 크기에 비례한 Growth를 직접 획득 + "+N GROWTH"/"KILL +1" 팝업.
- **Orb 밀도 추가 증가**.

## 4. 프로젝트 구조

```
v0.4/
├── index.html
├── run.bat / run.sh
├── css/style.css
├── js/
│   ├── main.js
│   ├── game.js           # 킬 보상, HP 리젠/넉백 루프, 플로팅 텍스트, 스폰 루프
│   ├── player.js
│   ├── entity.js          # regenTimer, scalePulseTimer, absorptionElapsed 추가
│   ├── ai.js               # absorptionDetectionRange 기반 우선순위 탐색
│   ├── combat.js          # Size 기반 공격력/사거리 공식, HP 리젠
│   ├── absorption.js      # 흡수 속도 개선 + 교착 상태 수정(rubber-band + timeout)
│   ├── collision.js
│   ├── spawning.js        # 적 크기 분포
│   ├── ui.js                # Combat Scaling/Health Regen/Kill Reward 디버그 섹션
│   └── audio.js            # absorbStart/absorbSuccess/killReward 사운드 추가
├── config/gameBalance.json
├── GAME_DESIGN.md
├── BALANCE_NOTES.md
└── README.md
```

## 5. `gameBalance.json`의 새 항목

```json
{
  "combatScaling": {
    "referenceSize": 40,
    "baseAttackDamage": 10, "attackDamageReferenceSize": 20, "attackDamagePerSize": 0.5,
    "baseAttackRange": 80, "attackRangeGrowthExponent": 1.2,
    "baseDodgeDistance": 100, "dodgeDistanceGrowthExponent": 1.1
  },
  "healthRegen": { "delay": 2.0, "rate": 5.0 },
  "absorption": {
    "pullForce": 0.45, "baseResistanceTime": 0.8,
    "escapeDistance": 50, "breakDistance": 110, "maxGrabDuration": 6.0
  },
  "ai": {
    "absorptionDetectionRange": 400,
    "absorptionPriorityRatio": 1.5, "highPriorityAbsorptionRatio": 2.0
  },
  "spawning": { "initialOrbCount": 450, "maxOrbCount": 600, "orbSpawnInterval": 0.25 },
  "killReward": { "baseReward": 10, "referenceSize": 20, "growthExponent": 1.2 }
}
```

`maxGrabDuration`은 기획안에 없던 값입니다 — 흡수 교착 버그를 막는 안전장치로 추가했습니다
(BALANCE_NOTES 참고). `attack.attackDamage`(고정값)는 제거되고 `combatScaling`의 Size 기반
공식으로 완전히 대체되었습니다.

## 6. Debug Mode

`F1` 패널에 **Combat Scaling**(공격력/사거리 공식 전체), **Health Regen**, **AI**(흡수
탐지 범위/우선순위), **Kill Reward** 섹션이 새로 추가되었습니다.

## 7. 새로운 색상 / AI 추가 방법

Version 0.2/0.3과 동일합니다. 자세한 내용은 [../v0.2/README.md](../v0.2/README.md) §8-9 참고.

## 8. 향후 확장 방법

[GAME_DESIGN.md](GAME_DESIGN.md)와 [BALANCE_NOTES.md](BALANCE_NOTES.md)의 "추가로 조정이
필요할 수 있는 수치"를 참고하세요.
