# 게임 기획 문서 — 성장형 액션 프로토타입

## 1. 게임 콘셉트

탑뷰 2D 액션/성장/생존 게임. 플레이어는 특정 색상의 원으로, 같은 색상의 작은 공을 먹으며 성장하고,
다른 색상의 적과는 전투를 통해서만 제거할 수 있다. 그래픽은 도형(원·선·범위 표시·파티클)만으로
구성되며, 프로토타입의 목표는 그래픽 완성도가 아니라 **성장 루프, 크기 기반 포식 규칙, 공격/회피의
사용감, AI 생태계, 밸런스 조정 용이성**을 검증하는 것이다.

## 2. 핵심 게임 루프

```
맵 탐색 → 같은 색상의 작은 공 발견 → 먹음 → Growth 증가 → Size 증가 → 능력 해금
→ 다른 색상 적과 전투 → 처치 → 파편 생성 → 파편 섭취 → 다시 성장 → …
```

플레이어와 AI 모두 이 루프를 공유한다. AI끼리도 서로 먹고 싸우기 때문에, 플레이어가 개입하지 않아도
맵은 계속 변화한다 (실제 테스트에서 확인: 플레이어가 조작하지 않는 동안에도 AI 사망 → 파편 생성이
자연 발생했다).

## 3. 플레이어

| 변수 | 설명 |
| --- | --- |
| `growth` | 누적 성장치. 절대 감소하지 않음(사망 시 절반으로 리셋되는 것 제외). |
| `size` | 화면에 보이는 실제 크기. growth로부터 계산되는 파생값. |
| `hp` / `maxHp` | 체력. maxHp는 growth에 따라 완만하게 증가. |
| `moveSpeed` | 이동 속도. |
| `attackUnlocked` / `dodgeUnlocked` | 성장 임계치 도달 시 true로 전환. |

입력: WASD/방향키 이동, 마우스로 조준, 좌클릭 공격, Space 회피 (`js/main.js`).

## 4. Growth와 Size의 관계

Growth와 Size는 독립된 변수다. 변환 공식(제곱근 기반, 성장할수록 체감 증가폭이 줄어드는 커브):

```
size = baseSize + sqrt(growth) * growthToSizeRatio
```

`baseSize`와 `growthToSizeRatio`는 `config/gameBalance.json`의 `growth.growthToSizeRatio`,
`player.startingSize`에서 관리한다. 이 공식은 `js/entity.js`의 `sizeFromGrowth()` 한 곳에만
존재하므로 커브 형태 자체를 바꾸고 싶다면 이 함수만 수정하면 된다.

플레이어의 최대 체력도 growth에 비례해 늘어난다 (`maxHp = startingHp + growth * hpPerGrowth`).

## 5. 공 생성 시스템

월드(5000×5000, 화면보다 훨씬 큼)에는 시작 시 `world.initialOrbCount`개의 무작위 색상 공이
분포한다. 이후 `world.spawnInterval`마다 한 개씩 추가되며, 전체 공 개수가 `world.maxOrbCount`를
넘지 않도록 제한한다 (`js/spawning.js`, `Game.spawnLoop`).

## 6. 먹기 시스템

핵심 규칙(가장 중요):

```
공의 색상 == 포식자 색상  AND  공의 Size < 포식자 Size
→ 먹을 수 있음
```

`js/collision.js`의 `canEat()`에 구현되어 있으며, 최소 크기 차이를 요구하고 싶다면
`growth.minEatSizeDifference` 값을 0보다 크게 설정하면 된다(코드 변경 불필요).

먹은 즉시 `growth += growthValue`이고 size/maxHp가 갱신된다. 이 로직은 플레이어와 AI에 동일하게
적용되므로(`Game.resolveEating`), 같은 색상 AI끼리도 서로를 먹을 수 있다(성장 경쟁).

## 7. 공격 시스템

공격은 즉시 피해를 주지 않고 2단계로 진행된다 (`js/combat.js`):

```
READY → TELEGRAPH(준비, 방향선+게이지 표시) → CHARGING(돌진, 충돌 시 피해) → RECOVERY(후딜) → READY
```

- Telegraph 동안 공격 방향 선과 빨간 원형 게이지를 그려 상대가 반응할 시간을 준다.
- Charging 동안 `attackChargeSpeed`로 돌진하며, 범위 안에 들어온 적대 대상에게 1회 피해를 준다
  (`attackHitSet`으로 중복 타격 방지).
- 이 상태 머신은 플레이어와 AI가 완전히 동일한 함수(`startAttack`/`updateAttack`)를 공유한다.

## 8. 회피 시스템

회피는 공격과 대비되는 사용감을 갖도록 설계했다 — 준비 없이 즉시 발동, 짧은 이동, 짧은 무적:

```
즉시 발동 → 지정 거리만큼 순간 이동 → 이동 초반 무적 구간 → 쿨다운
```

`dodgeInvincibleTime`은 `dodgeDuration`보다 짧거나 같게 설정하는 것을 권장한다(무적이 이동보다
길면 회의가 사실상 무한 무적처럼 느껴질 수 있음).

## 9. 전투 및 적 사망

다른 색상의 대상은 `isHostile()`(`js/collision.js`)에 의해 적대 관계로 판정되며, 접촉만으로는
피해가 없고 반드시 공격(Charging)으로만 피해를 줄 수 있다. HP가 0이 되면 즉시 삭제되지 않고:

```
HP 0 → alive=false → 사망 파티클 → Fragment × fragmentCount 생성(사망 색상 유지) → 다음 프레임에 제거
```

파편은 일반 공과 동일한 `canEat()` 규칙(색상 일치 + 크기 비교)으로 먹을 수 있는 성장 자원이다.

## 10. AI 시스템

AI는 `js/ai.js`의 상태 머신을 사용한다. 우선순위(요청 사양의 6개 핵심 상태를 구현):

```
Search(배회) → Chase(추격: 먹잇감 또는 적) → Eat(중앙 로직에서 자동 처리)
→ Attack(Telegraph/Charge 공유) → Dodge(반응형) → Dead(파편화)
```

- 0.2초 간격으로 주변(`ai.detectionRange`)을 스캔해 "가장 가까운 같은 색 먹잇감"과 "가장 가까운
  적대 대상"을 비교, 상태를 결정한다 (`decideAI`).
- 체력이 `ai.fleeThreshold` 이하이고 상대가 더 크면 도주(flee)한다.
- 회피는 `ai.dodgeUnlockSize` 이상으로 성장한 AI만 사용할 수 있으며, 적이 Telegraph 중일 때
  확률적으로 반응한다 (`reactToThreats`).

## 11. AI 간 상호작용

플레이어가 아무 것도 하지 않아도: 같은 색 AI끼리 먹기 경쟁이 벌어지고, 다른 색 AI끼리 전투가 벌어지며,
죽은 AI의 파편을 다른 AI가 먹고 성장한다. 실제 테스트 세션에서 조작 없이도 파편이 30개 이상 자연
발생하는 것을 확인했다 — 맵이 생태계처럼 스스로 움직인다는 요구사항을 충족한다.

## 12. 맵 시스템

`world.worldWidth × world.worldHeight` 크기의 월드. 모든 엔티티는 월드 경계 안으로 클램프된다
(`Game.clampAllToWorld`). 탐색 성능을 위해 220px 셀 크기의 공간 해시 그리드로 주변 엔티티를
조회한다(`Game.getNearbyEntities`) — 엔티티 수가 늘어나도 매 프레임 전수 비교를 피한다.

## 13. 카메라

카메라는 플레이어를 부드럽게(lerp) 따라가며, 월드 경계 밖을 비추지 않도록 클램프된다. 플레이어가
성장할수록 줌이 아주 조금씩 축소되어(`camera.zoomSizeFactor`) 커진 플레이어가 화면을 과도하게
가리지 않게 한다. `camera.minZoom`으로 축소 한계를 제한해 과도한 줌 변화를 방지한다.

## 14. HUD

좌상단에 HP 바, Growth, Size, Attack/Dodge 상태(LOCKED/READY/쿨다운 진행바)를 표시한다. 능력이
해금되는 순간 화면 중앙에 "ATTACK UNLOCKED" / "DODGE UNLOCKED" 배너가 잠시 표시된다.

## 15. 밸런스 구조

모든 수치는 `config/gameBalance.json`에서 관리하며 코드에 하드코딩하지 않는다. 카테고리:
`player`, `growth`, `unlock`, `attack`, `dodge`, `ai`, `world`, `fragment`, `camera`, `colors`.
자세한 표는 [BALANCE_NOTES.md](BALANCE_NOTES.md)와 README의 밸런스 표를 참고.

## 16. 상태 머신 요약

| 엔티티 | 상태 |
| --- | --- |
| 공격(공유) | READY → TELEGRAPH → CHARGING → RECOVERY → READY |
| 회피(공유) | READY → DODGING(무적 구간 포함) → READY |
| AI | search / chase_eat / chase_fight / flee (+ 공격/회피 상태 공유) |

## 17. 데이터 구조

- `Entity`(`js/entity.js`): 모든 공(오브/파편/AI/플레이어)의 공통 필드(위치, 크기, 색상, HP,
  공격/회피 상태)를 가진다.
- `Player`, `AIEntity`는 `Entity`를 확장해 `growth`, 해금 플래그 등을 추가한다.
- 밸런스 데이터는 순수 JSON이며 게임 로직과 완전히 분리되어 있다.

## 18. 웹 프로토타입 구조

Vanilla HTML/CSS/JS(ES 모듈) + Canvas 2D. 빌드 도구 없음. `config/gameBalance.json`은
`fetch()`로 읽으므로 로컬 정적 서버로 실행해야 한다(README 참고).

## 19. 향후 확장 방향

- 색상(세력) 추가: `config/gameBalance.json`의 `colors` 배열에 항목만 추가하면 스폰/식별 로직이
  자동으로 확장된다.
- 새로운 공 종류: `js/spawning.js`에 새 팩토리 함수 추가.
- 새로운 공격/회피 패턴: `js/combat.js`의 상태 머신에 새 상태를 추가하거나 별도 함수로 분리.
- 새로운 AI 행동: `js/ai.js`의 `decideAI`/`moveAI`에 새로운 상태 분기 추가.
- 미니맵, 세력별 스코어보드, 협동 AI(무리 짓기) 등은 현재 구조 위에 자연스럽게 얹을 수 있다.
