# 탑뷰 2D 성장형 액션 게임 — 웹 프로토타입

같은 색상의 작은 공을 먹으며 성장하고, 다른 색상의 적과는 전투로 맞서는 탑뷰 2D 성장/생존
프로토타입입니다. 그래픽 완성도보다 **성장 루프, 크기 기반 포식 규칙, 공격/회피의 사용감, AI
생태계, 밸런스 조정 용이성**을 검증하는 데 초점을 맞췄습니다. 전체 기획 배경은
[GAME_DESIGN.md](GAME_DESIGN.md), 플레이 테스트 중 발견한 문제와 조치는
[BALANCE_NOTES.md](BALANCE_NOTES.md)를 참고하세요.

## 1. 실행 방법

`js/main.js`가 `config/gameBalance.json`을 `fetch()`로 불러오기 때문에, `index.html`을
더블클릭해서 여는 `file://` 방식으로는 브라우저 보안 정책(CORS) 때문에 설정을 읽지 못할 수
있습니다. 반드시 로컬 정적 서버로 실행하세요.

```bash
cd game
python -m http.server 8420
```

그 후 브라우저에서 `http://localhost:8420` 접속.

(Node가 있다면 `npx serve .` 등 다른 정적 서버를 사용해도 됩니다.)

## 2. 조작법

| 입력 | 동작 |
| --- | --- |
| `W` `A` `S` `D` / 방향키 | 이동 |
| 마우스 | 공격 방향 조준 |
| 좌클릭(누르고 있으면 쿨다운마다 자동 재시도) | 공격 (Growth ≥ `attackUnlockGrowth` 이후 사용 가능) |
| `Space` | 회피 (Growth ≥ `dodgeUnlockGrowth` 이후 사용 가능) |
| `F1` | 디버그/밸런스 패널 열기·닫기 |

## 3. 프로젝트 구조

```
game/
├── index.html            # 캔버스 + HUD/디버그 패널 DOM
├── css/style.css
├── js/
│   ├── main.js            # 부트스트랩: 설정 로드, 입력 처리, 게임 루프
│   ├── game.js             # Game 클래스: 월드/카메라/파티클/렌더링/스폰 루프
│   ├── player.js           # Player 엔티티(성장, 해금)
│   ├── entity.js           # 공통 Entity 베이스 + growth→size 변환 공식
│   ├── ai.js                # AI 엔티티 + 상태 머신(Search/Chase/Attack/Dodge/Flee)
│   ├── combat.js            # 공격(Telegraph→Charge→Recovery), 회피 상태 머신 (공유)
│   ├── collision.js        # 거리/먹기 조건/적대 관계 판정
│   ├── spawning.js         # 오브/AI/파편 생성 팩토리
│   └── ui.js                # HUD 갱신 + 디버그 패널 생성/바인딩
├── config/
│   └── gameBalance.json    # 모든 밸런스 수치 (코드와 완전히 분리)
├── GAME_DESIGN.md
├── BALANCE_NOTES.md
└── README.md
```

## 4. `gameBalance.json` 설명

게임의 수치는 전부 이 파일에서 관리하며, 코드 수정 없이 값만 바꿔서 밸런스를 조정할 수 있습니다.

```json
{
  "player": { "startingSize": 20, "startingHp": 100, "moveSpeed": 250, ... },
  "growth": { "growthPerOrb": 10, "growthToSizeRatio": 1.6, ... },
  "unlock": { "attackUnlockGrowth": 100, "dodgeUnlockGrowth": 250 },
  "attack": { "attackDamage": 20, "attackTelegraphTime": 0.5, ... },
  "dodge":  { "dodgeDistance": 130, "dodgeCooldown": 3.0, ... },
  "ai":     { "spawnCount": 40, "detectionRange": 320, ... },
  "world":  { "worldWidth": 5000, "worldHeight": 5000, ... },
  "fragment": { "fragmentCount": 5, "fragmentGrowthValue": 5, ... },
  "colors": [ { "id": "blue", "color": "#3B82F6" }, ... ]
}
```

값을 바꾼 뒤 브라우저를 새로고침하면 바로 반영됩니다(게임 실행 중에는 아래 디버그 패널을 사용하면
새로고침 없이도 즉시 반영됩니다).

## 5. 주요 밸런스 변수

| Category | Variable | Default | Description |
| -------- | ------------------- | ------: | ----------- |
| Player   | startingSize        |      20 | 플레이어 시작 크기 |
| Player   | startingGrowth      |       0 | 플레이어 시작 성장값 |
| Player   | startingHp          |     100 | 플레이어 시작 HP |
| Player   | moveSpeed           |     250 | 플레이어 이동속도 |
| Player   | hpPerGrowth         |     0.4 | growth 1당 최대 HP 증가량 |
| Growth   | growthPerOrb (오브별 `growthValue`) | 5~30 | 공 섭취 시 성장량 (크기 비례) |
| Growth   | growthPerFragment / `fragment.fragmentGrowthValue` | 5 | 파편 섭취 시 성장량 |
| Growth   | growthToSizeRatio   |     1.6 | growth→size 변환 계수(제곱근 커브) |
| Growth   | minEatSizeDifference |      0 | 먹기 위해 필요한 최소 크기 차이 |
| Unlock   | attackUnlockGrowth  |     100 | 공격 해금 기준 |
| Unlock   | dodgeUnlockGrowth   |     250 | 회피 해금 기준 |
| Attack   | attackDamage        |      20 | 공격 피해량 |
| Attack   | attackRange         |      60 | 공격 유효 거리 |
| Attack   | attackTelegraphTime |     0.5 | 공격 준비시간(반응 가능 구간) |
| Attack   | attackChargeSpeed   |     650 | 돌진 속도 |
| Attack   | attackChargeDuration |    0.25 | 돌진 지속시간 |
| Attack   | attackCooldown      |     1.5 | 공격 쿨다운 |
| Attack   | attackRecoveryTime  |     0.4 | 공격 후딜레이 |
| Dodge    | dodgeDistance       |     130 | 회피 이동거리 |
| Dodge    | dodgeDuration       |     0.2 | 회피 이동 지속시간 |
| Dodge    | dodgeInvincibleTime |    0.22 | 회피 무적 시간 |
| Dodge    | dodgeCooldown       |       3 | 회피 쿨다운 |
| AI       | spawnCount          |      40 | 초기 AI 총 수(색상별 균등 분배) |
| AI       | detectionRange      |     320 | AI 감지 범위 |
| AI       | aggression          |    0.55 | 적대 대상 발견 시 전투를 선택할 확률 |
| AI       | fleeThreshold       |     0.3 | 이 HP 비율 이하 + 상대가 더 크면 도주 |
| AI       | dodgeUnlockSize     |      45 | 이 크기 이상 AI만 회피 사용 |
| World    | worldWidth/Height   |    5000 | 월드 크기 |
| World    | maxOrbCount         |     320 | 동시 존재 가능한 최대 오브 수 |
| Fragment | fragmentCount       |       5 | 적 처치 시 생성되는 파편 개수 |

## 6. Debug Mode 사용법

플레이 중 `F1`을 누르면 화면 오른쪽에 디버그 패널이 열립니다. Player/Growth/Unlock/Attack/
Dodge/AI/World/Fragment 섹션별로 숫자 입력창이 제공되며, 값을 바꾸면 `gameBalance.json`으로
로드된 동일한 설정 객체를 즉시 수정하므로 **새로고침 없이 바로 게임에 반영**됩니다. 다시 `F1`을
누르면 패널이 닫힙니다.

## 7. 새로운 색상 추가 방법

`config/gameBalance.json`의 `colors` 배열에 항목을 추가하기만 하면 됩니다.

```json
{ "id": "cyan", "color": "#06B6D4" }
```

오브 스폰, AI 스폰, 먹기/전투 판정 모두 `colors` 배열을 기준으로 동작하므로 코드 수정이
필요 없습니다.

## 8. 새로운 AI 추가 방법

- **새로운 행동 패턴**을 추가하려면 `js/ai.js`의 `decideAI()`(상태 결정)와 `moveAI()`(상태별
  이동/행동)에 새 분기를 추가하세요. 상태 이름을 하나 정하고(`ai.state = 'patrol'` 등) 두 함수에
  해당 분기를 넣으면 됩니다.
- **새로운 AI 종류**(예: 항상 도망만 다니는 개체)를 만들려면 `js/spawning.js`의 `spawnAI()`를
  참고해 별도 팩토리 함수를 추가하고, `AIEntity`를 확장하거나 생성 시 파라미터를 다르게 주면
  됩니다.
- 공격/회피는 `js/combat.js`의 공유 상태 머신을 그대로 재사용할 수 있으므로, 새 AI도 별도 구현
  없이 `startAttack`/`startDodge`만 호출하면 동일한 텔레그래프/돌진/회피 연출을 얻습니다.

## 9. 향후 확장 방법

- **새로운 공격/회피 패턴**: `js/combat.js`에 새 상태 머신 함수를 추가하고, 필요한 밸런스 값을
  `gameBalance.json`에 새 카테고리로 추가합니다.
- **새로운 맵**: `world.worldWidth`/`worldHeight`를 바꾸거나, `js/spawning.js`에 지형별 스폰
  가중치 로직을 추가할 수 있습니다.
- **미니맵/스코어보드 등 UI 확장**: `js/ui.js`와 `index.html`에 DOM을 추가하고 `UI.update()`에서
  갱신하면 됩니다.
- 자세한 아키텍처와 데이터 구조는 [GAME_DESIGN.md](GAME_DESIGN.md)를, 실제 플레이 테스트에서
  드러난 이슈와 조치는 [BALANCE_NOTES.md](BALANCE_NOTES.md)를 참고하세요.
