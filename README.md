## NEXT M8 변경

- 같은 색 가까운 공은 연결선과 공격 보너스(이웃당 +5%, 최대 +15%)를 받습니다.
- 확률적으로 대열 동행에 들어가 함께 이동합니다. 동행 중에는 공격/특수능력/흡수를 하지 않습니다.
  이탈하면 자유 행동으로 돌아갑니다. 플레이어는 **G 또는 동행 이탈 버튼**으로 바로 나갈 수 있습니다.
- 최상위 포식자는 **크기 상위 3위/크기 100 이상, 최대 3명**입니다.
- 모래바람 반경 360, 피해 강화. 장판 중앙의 표준 프레이가 탈출할 때 체력 약 80%를 잃도록 검증했습니다.
  가장자리에서 빨리 나오면 피해가 줄어듭니다.

최신 기획: [아군 대열](ALLY_CHAIN_DESIGN.md), [게임 기획](GAME_DESIGN.md).
아래 M7/M6/M5 절은 버전별 변경 기록이며 최신 규칙은 M8을 따릅니다.

## NEXT M7 변경

최상위 포식자는 **크기 상위 5위 중 크기 100 이상**에서 선정합니다. 점수와 성장 계산은
그대로이며, 점수가 높아도 몸집이 작으면 직위를 얻지 않습니다. 직위 확정에는 기존 평가 지연이 있습니다.

같은 색 아군이 인접하면 버프와 연결선을 만드는 시스템은 [기획서](ALLY_CHAIN_DESIGN.md)로
작성했습니다. 이번에는 기획만 작성했으며 게임에는 아직 추가하지 않았습니다.

> **NEXT 저장소** — 기존 공개 게임(`/ball-game/`, 커밋 4e552a6, 태그 `public-twitter-2026-09-23`)과 분리된 새 버전 작업본입니다.
> 이 저장소는 https://qwerzaq56-sketch.github.io/ball-game-next/ 로 배포됩니다. 같은 도메인이라 localStorage를 공유하므로
> 저장 키는 `ballgamenext_*` 접두어를 씁니다(기존 `ballgame_*` 키는 읽지도 지우지도 않음). 첫 릴리스 `next-0.6.0 build 1` = v0.6 동작 + 키 분리 + 빌드 ID 표시.

## NEXT M6: 내 이름·색상과 두 가지 순위

시작 화면에서 내 이름(최대 16자)과 파랑/빨강/초록/노랑/하늘 색상을 선택하세요.
‘게임 시작’을 누르기 전까지 게임은 멈춰 있습니다. 마지막 이름·색상은 다음 접속에 다시
채워지고, 전체 초기화/새 게임에서도 선택 화면이 열립니다. Life 부활 시에는 선택을 유지합니다.

TOP 10의 **점수 / 크기** 버튼으로 순위 기준을 전환할 수 있습니다. 각 행은 두 값을 함께
보여 주며, 하단에는 선택한 기준의 내 순위가 나옵니다. 점수 보상·성장은 유지하며 최신 직위 규칙은 위 M7 변경을 따릅니다.
더 큰 개체가 더 낮은 점수를 가질 수 있으며, 크기 순위에서 그 차이를 확인할 수 있습니다.

검증: 테스트 77개와 이름·5색 선택/저장/입력/순위 브라우저 확인 통과.
자세한 내용은 [M6 변경 기록](reports/M6-player-setup.md).

## NEXT M5 작업 브랜치의 새 기능

- AI는 태어날 때 고정 이름을 받습니다. 점수 상위 20개체의 이름을 화면에 표시하며, 겹치는 이름은 이동하거나 생략합니다.
- 오른쪽 TOP 10은 현재 살아 있는 개체의 점수 순위입니다. 내 순위는 아래에 항상 표시됩니다. F2 인스펙터를 열어 둔 상태에서 AI 행을 클릭하면 해당 상세 정보를 표시합니다. 클릭만으로 인스펙터를 켜지는 않습니다. 게임 종료 후 로컬 고득점 기록과는 별개입니다.
- **F4 또는 생태계 버튼**으로 이번 런의 apex 보유자·보유 시간·등장/상실 기록을 볼 수 있습니다. 부재·단독·공존 시간을 함께 보여 주며, 교체를 강제하지 않습니다.
- 이름·순위·생태계 표시 설정은 새로고침 후에도 유지됩니다. 전체 초기화는 현재 런의 생태계 기록을 지웁니다.
- 파란색 apex의 **E 특수능력**은 조준 방향과 두 측면의 3방향 파동입니다. 0.6초 전조에 실제 발사 방향을 표시하며, 같은 시전의 세 파동에 겹쳐도 피해는 한 번만 받습니다. 재사용 대기시간은 시전당 10초입니다.

현재 저장소 **루트**에서 `python3 -m http.server 8001 --bind 127.0.0.1`로 실행합니다.
수동 실행 절의 `game/versions/v0.6`는 과거 구조입니다.

검증 결과와 측정 원본은 [M5 개발 보고서](reports/M5-development.md)에 있습니다.
이 기능은 `codex/cloud-next-m4` 작업 브랜치에 있으며 공개 main 배포와 구분됩니다.

# 탑뷰 2D 성장형 액션 게임 — 웹 프로토타입 (Version 0.6)

Version 0.5의 수정 기획을 반영한 버전. 새 핵심 시스템보다 **다듬기와 지속가능한 플레이
루프(Life/Score/전체 초기화), 그리고 배포**에 집중했다 — AI 공격 페이스 완화, 공격/회피
곡선 재조정, 카메라 줌아웃, 아군 흡수 ON/OFF, AI 행동 확률화, 진행률 기반 흡수 사운드,
처치 보상을 "가서 주워야 하는" 구조로 재편, Life 3회 + 로컬 Top 10 스코어보드, 음소거,
그리고 **GitHub Pages로 링크 하나면 바로 플레이 가능한 배포**. 배경은
[GAME_DESIGN.md](GAME_DESIGN.md), 실측 결과는 [BALANCE_NOTES.md](BALANCE_NOTES.md), 버전
이력은 [../../CHANGELOG.md](../../CHANGELOG.md).

Version 0.1~0.5는 삭제되지 않고 각 폴더에 그대로 있다.

## 1. 실행 방법

### 온라인 (설치 없음)

다른 사람에게 그냥 링크만 보내면 됩니다. 브라우저에서 열리면 바로 플레이할 수 있습니다.

```
https://qwerzaq56-sketch.github.io/ball-game/
```

### 로컬 (Windows)

이 폴더 안의 **`run.bat`을 더블클릭**하세요. 로컬 서버가 자동으로 시작되고, 약 2초 뒤
브라우저가 자동으로 열립니다. macOS/Linux는 `./run.sh`.

### 수동 실행

```bash
cd game/versions/v0.6
python -m http.server 8000
```

`http://localhost:8000` 접속.

## 2. 조작법

| 입력 | 동작 |
| --- | --- |
| `W` `A` `S` `D` / 방향키 | 이동 |
| 마우스 | 공격 방향 조준 |
| 좌클릭(누르고 있으면 스택이 남는 한 자동 재시도) | 공격 |
| `Space` | 회피 |
| `F1` | 디버그/밸런스 패널 열기·닫기 |

HUD의 **SOUND** 버튼으로 음소거, **전체 초기화** 버튼으로 현재 런을 완전히 리셋할 수
있습니다(Top 10 랭킹은 유지됩니다). 아군(같은 색) 흡수 ON/OFF는 `F1` 디버그 패널의
**Gameplay** 섹션 체크박스로 조절합니다(전투 중 실수로 꺼지지 않도록 일부러 우클릭이 아닌
여기에 뒀습니다) — 기본값은 ON.

## 3. Version 0.5 대비 달라진 점 (요약)

- **Debug Panel 구조 정리**: Defense가 Combat Scaling 섹션 안으로 이동.
- **AI 공격 페이스 완화**: AI 전용 쿨다운(2.5초) + 스택과 무관한 공격 게이트 타이머로,
  스택이 쌓여 있어도 순식간에 연타하지 못하게 변경.
- **공격 텔레그래프 0.4초**, **Size 기반 차지 시간**(Size 200 ≈ 0.8초) 추가.
- **카메라 줌아웃**: Size가 커질수록 더 넓은 시야 확보.
- **Dodge Distance 선형화**: `100 + Size × 0.8`.
- **아군 흡수 ON/OFF**(F1 디버그 패널의 Gameplay 섹션 체크박스, 기본 ON — 실수로 꺼지지
  않도록 우클릭이 아닌 여기로 이동).
- **AI 흡수 행동 확률화**(60%) + **저체력 AI도 15% 확률로 공격 시도**.
- **흡수 사운드 진행률 반영**: 흡수 중 피치/음량이 실시간으로 변하는 연속 드론음 추가.
- **처치 보상 재구성**: 직접 Growth 보상 절반 축소, 대신 적 크기에 비례해 필드 Orb와 똑같이
  생긴(크기 다양, 십자 마크 없음) Orb를 더 많이·더 크게·더 넓게 드롭 — 개수 상한에 도달해도
  개별 Orb 가치가 계속 커져 후반에도 보상이 정체되지 않음.
- **Life 시스템**: 3회 — 사망해도 Size/Growth 유지한 채 부활, 0이 되면 Game Over.
- **로컬 Top 10 스코어보드**(`localStorage` 기반, 브라우저별 개별 기록).
- **전체 초기화 버튼**(스코어보드는 별도 유지).
- **음소거 버튼**(설정 유지).
- **GitHub Pages 배포**: 링크 클릭만으로 실행.

## 4. 프로젝트 구조

```
v0.6/
├── index.html               # HUD/Game Over 오버레이 등 정적 마크업 추가
├── run.bat / run.sh
├── css/style.css
├── js/
│   ├── main.js                 # 음소거/리셋/재시작 버튼 wiring
│   ├── game.js                 # reset(), Life/Score, 카메라 줌아웃, 흡수 드론 훅
│   ├── player.js                # allyAbsorptionEnabled
│   ├── entity.js                # currentChargeDuration, aiAttackGateTimer
│   ├── ai.js                      # 확률적 흡수 시도, 저체력 공격 확률
│   ├── combat.js                 # Defense 이동, Size 기반 차지시간, AI 게이트, 선형 Dodge
│   ├── absorption.js             # handlePlayerDefeat로 통합(흡수사망도 Life 소모)
│   ├── collision.js
│   ├── spawning.js               # 적 Size 비례 Orb 드롭
│   ├── ui.js                       # LIFE/SCORE/ALLY ABSORB HUD, Gameplay 체크박스, Game Over+스코어보드 렌더링
│   ├── audio.js                   # 흡수 드론, setMuted()
│   └── storage.js                 # 신규: localStorage 스코어보드 + 음소거 영속화
├── config/gameBalance.json
├── GAME_DESIGN.md
├── BALANCE_NOTES.md
└── README.md
```

## 5. `gameBalance.json`의 새/변경 항목

```json
{
  "combatScaling": {
    "attackChargeDurationBase": 0.4, "attackChargeDurationPerSize": 0.002,
    "baseDefense": 0, "defensePerSize": 0.5, "minimumDamage": 1,
    "knockbackForce": 500
  },
  "dodge": { "baseDistance": 100, "distanceGrowth": 0.8 },
  "ai": { "attackCooldown": 2.5, "absorptionAttemptChance": 0.6, "lowHealthAttackChance": 0.15 },
  "killReward": {
    "growthRewardMultiplier": 0.5,
    "orbBaseCount": 3, "orbPerEnemySize": 0.1, "orbMaxCount": 40,
    "orbSizeGrowthPerEnemySize": 0.25,
    "orbSpreadBase": 20, "orbSpreadMultiplier": 2.0
  },
  "lives": { "maxLives": 3 },
  "camera": { "baseZoom": 1.0, "zoomOutPerSize": 0.003, "maxZoomOut": 2.0 }
}
```

`defense`(독립 섹션)와 `deathOrb` 섹션은 v0.6에서 제거되었다 — 전자는 `combatScaling`으로,
후자는 `killReward`의 `orb*` 필드로 흡수됐다.

## 6. Debug Mode

`F1` 패널 맨 위의 **Gameplay** 섹션에 아군 흡수 ON/OFF 체크박스가 있다(기본 ON). 그 아래
**Combat Scaling** 섹션에 Defense/차지시간/넉백이 모두 합쳐져 있고, **AI** 섹션에
`attackCooldown`/`absorptionAttemptChance`/`lowHealthAttackChance`가, **Dodge** 섹션에
`baseDistance`/`distanceGrowth`가, **Kill Reward** 섹션에 orb 관련 필드들이, 그리고 새로운
**Lives**/**Camera** 섹션이 추가됐다.

## 7. 로컬 Top 10 스코어보드에 대하여

이 프로젝트는 서버가 없는 순수 정적 웹 게임입니다. Top 10 기록은 `localStorage`에
저장되며, **오직 그 브라우저·그 기기에서만** 유지됩니다. GitHub Pages에 배포해도 방문자마다
서로 다른 Top 10을 보게 됩니다 — 전역(글로벌) 랭킹이 아닙니다. 브라우저의 사이트 데이터를
지우거나 시크릿 모드로 접속하면 기록도 함께 사라집니다.

## 8. GitHub Pages로 배포하기

이 폴더(`game/public/`에 복사된 최신 버전)는 순수 정적 파일만으로 구성되어 있어 별도 빌드
과정 없이 그대로 GitHub Pages에 올릴 수 있습니다. 모든 리소스 경로가 상대 경로이므로
`https://<user>.github.io/<repo>/` 형태의 서브 경로에서도 정상 동작합니다.

## 9. 새로운 색상 / AI 추가 방법

Version 0.2~0.5와 동일합니다.

## 10. 향후 확장 방법

[GAME_DESIGN.md](GAME_DESIGN.md) §17과 [BALANCE_NOTES.md](BALANCE_NOTES.md)의 "추가로
조정이 필요할 수 있는 수치"를 참고하세요.

F3 디버그 라벨: 윗줄에 **프레이 / 포레이저 / 프레데터**와 프레데터의 **종속 / 도전 / 독립** 관계,
아랫줄에 상태·성격을 표시합니다. 플레이어 역할도 표시하며, F3으로 켜고 끌 수 있습니다.
