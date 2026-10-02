# 탑뷰 2D 성장형 액션 게임 — 웹 프로토타입 (Version 0.3)

Version 0.2의 실제 플레이 QA 결과를 반영한 버전. 새 시스템보다 **조작감·피드백 개선**에
집중했다 — 흡수가 탈출 가능해졌고, 맵이 훨씬 붐비며, 타격감이 강화되고, 사운드와 Kill
Count가 추가됐다. 배경은 [GAME_DESIGN.md](GAME_DESIGN.md), 실측 결과는
[BALANCE_NOTES.md](BALANCE_NOTES.md), 버전 이력은 [../../CHANGELOG.md](../../CHANGELOG.md).

Version 0.1/0.2는 삭제되지 않고 [../v0.1/](../v0.1/), [../v0.2/](../v0.2/)에 그대로 있다.

## 1. 실행 방법

### 가장 쉬운 방법 (Windows)

이 폴더 안의 **`run.bat`을 더블클릭**하세요. Python이 있으면 자동으로 로컬 서버를 띄우고,
없으면 Node.js(`npx serve`)로 대체 시도하며, 둘 다 없으면 설치 안내를 보여줍니다. 서버가
뜨면 브라우저에서 `http://localhost:8000`으로 접속하세요.

macOS/Linux는 터미널에서 `./run.sh`를 실행하세요.

### 수동 실행

```bash
cd game/versions/v0.3
python -m http.server 8000
```

`http://localhost:8000` 접속. (`fetch()`로 설정 JSON을 읽으므로 `index.html` 직접 더블클릭은
지원하지 않습니다 — 반드시 로컬 서버를 통해 여세요.)

이 폴더를 통째로 다른 PC에 복사해도 그대로 동작합니다. 오디오가 파일이 아니라 코드로
합성되므로(Web Audio API) 누락될 리소스가 없습니다.

## 2. 조작법

| 입력 | 동작 |
| --- | --- |
| `W` `A` `S` `D` / 방향키 | 이동 (흡수당하는 중에도 작동 — 이동으로 탈출 가능) |
| 마우스 | 공격 방향 조준 |
| 좌클릭(누르고 있으면 쿨다운마다 자동 재시도) | 공격 |
| `Space` | 회피 — 공격 중 어느 단계에서도 즉시 취소하고 발동 가능 |
| `F1` | 디버그/밸런스 패널 열기·닫기 |

## 3. Version 0.2 대비 달라진 점 (요약)

- **흡수**: 당기는 힘이 훨씬 약해지고, 이동(및 회피)으로 실제로 탈출할 수 있음. 일정 거리
  이상 벌어지면 자동 취소. 흡수 중 공격을 받아도 취소.
- **개체 밀도**: Orb/Enemy 모두 큰 폭으로 증가, Enemy는 이제 계속 재생성됨.
- **적 크기**: 소/중/대 분포(60/30/10%)로 스폰 — 초반 평균 크기 하향.
- **사운드**: 공격/피격/회피/사망/흡수/성장/해금에 합성 효과음 추가.
- **Kill Count**: HUD에 표시, 플레이어의 공격으로 처치한 경우만 카운트.
- **넉백 + 강화된 피격 이펙트**.
- **회피 버그 수정**: 잔상이 더 이상 영원히 남지 않음.
- **회피 우선순위**: 공격 중이어도 즉시 회피 가능.
- **배포**: `run.bat`/`run.sh`로 다른 PC에서도 바로 실행.

## 4. 프로젝트 구조

```
v0.3/
├── index.html
├── run.bat / run.sh      # 다른 PC용 원클릭 실행 스크립트
├── css/style.css
├── js/
│   ├── main.js
│   ├── game.js            # 스폰 루프(Orb+Enemy), 넉백 적용, 오디오 훅
│   ├── player.js           # kills 필드 추가
│   ├── entity.js           # 넉백 필드(kx, ky, knockbackTimer) 추가
│   ├── ai.js                 # 흡수 중에도 도주 가능하도록 변경
│   ├── combat.js            # 넉백, 흡수 취소, 회피 우선순위, 회피 잔상 수명
│   ├── absorption.js       # pullForce/escapeDistance/breakDistance 기반 재설계
│   ├── collision.js
│   ├── spawning.js         # 적 크기 분포(rollEnemySize)
│   ├── ui.js                 # Kills HUD, 새 디버그 섹션
│   └── audio.js             # v0.3 신규: Web Audio 기반 합성 SFX
├── config/gameBalance.json
├── GAME_DESIGN.md
├── BALANCE_NOTES.md
└── README.md
```

## 5. `gameBalance.json`의 새 항목

```json
{
  "absorption": { "pullForce": 0.35, "escapeDistance": 50, "breakDistance": 110, ... },
  "combat": { "knockbackForce": 150, "knockbackDuration": 0.15, "knockbackResistance": 1.0,
               "hitFlashDuration": 0.08, "hitParticleLifetime": 0.25 },
  "spawning": { "initialOrbCount": 400, "maxOrbCount": 500, "orbSpawnInterval": 0.4,
                 "initialEnemyCount": 60, "maxEnemyCount": 80, "enemySpawnInterval": 2.0 },
  "enemySpawn": { "smallSizeRatio": 0.6, "mediumSizeRatio": 0.3, "largeSizeRatio": 0.1,
                    "smallSizeMin": 16, "smallSizeMax": 24, ... },
  "dodge": { "effectLifetime": 0.3, ... },
  "audio": { "masterVolume": 1.0, "sfxVolume": 0.8, "attackVolume": 0.8,
              "damageVolume": 1.0, "dodgeVolume": 0.7, "deathVolume": 0.8 }
}
```

`pullForce`/`breakDistance`는 기획안의 초기 예시값(0.25 / 70)대로는 흡수가 거의 항상
실패하는 것을 실측으로 확인하고 0.35 / 110으로 조정했습니다 — 이유는
[BALANCE_NOTES.md](BALANCE_NOTES.md)를 참고하세요.

## 6. Debug Mode

`F1`로 열리는 패널에 v0.3에서 추가된 **Absorption(pullForce/escapeDistance/breakDistance)**,
**Combat(넉백/HitFlash/HitParticle)**, **Spawning**, **Enemy Size Distribution**, **Audio**
섹션이 새로 추가되었습니다. 나머지는 v0.2와 동일합니다.

## 7. 새로운 색상 / AI 추가 방법

Version 0.2와 동일합니다 — `colors` 배열에 항목 추가, `js/ai.js`의 `decideAI()`/`moveAI()`에
분기 추가. 자세한 내용은 [../v0.2/README.md](../v0.2/README.md) §8-9 참고.

## 8. 향후 확장 방법

[GAME_DESIGN.md](GAME_DESIGN.md) §10과 [BALANCE_NOTES.md](BALANCE_NOTES.md)의 "추가로
조정이 필요할 수 있는 수치"를 참고하세요.
