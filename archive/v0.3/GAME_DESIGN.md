# 게임 기획 문서 — Version 0.3

Version 0.2([../v0.2/GAME_DESIGN.md](../v0.2/GAME_DESIGN.md))의 후속 버전. v0.2가 "Size를
핵심 통합 지표로 만드는 것"에 집중했다면, v0.3은 **실제 플레이 QA에서 드러난 조작감/피드백
문제를 고치는 것**에 집중한다. 새로운 핵심 시스템을 추가하기보다 기존 시스템이 "생각한 대로
동작하는가"를 검증하고 수치를 다시 맞췄다. 구체적인 변경 목록은 루트의
[CHANGELOG.md](../../CHANGELOG.md), 수치 조정 근거는 [BALANCE_NOTES.md](BALANCE_NOTES.md).

## 1. 흡수 시스템 재설계: "붙잡힘"에서 "줄다리기"로

v0.2의 흡수는 대상의 위치를 매 프레임 고정 비율로 흡수자 쪽에 직접 대입하는 방식이었다.
이 비율이 프레임레이트와 무관하게 매 프레임 누적 적용되다 보니, 실질적으로 흡수가 시작되는
순간 탈출이 불가능했다 — QA에서 지적된 정확한 원인이다.

v0.3은 이를 지수 감쇠 방식의 약한 당김으로 교체했다(`js/absorption.js`):

```
pull = 1 - (1 - pullForce) ^ dt      // 초당 pullForce 비율만큼만 거리를 좁힘
target.x += (absorber.x - target.x) * pull
```

그리고 대상은 더 이상 조작을 완전히 잃지 않는다 — `js/game.js#updatePlayer`와
`js/ai.js#updateAI` 모두 `beingAbsorbedByRef`가 설정되어도 이동(및 회피)을 계속 처리한다.
AI는 흡수당하는 순간 즉시 흡수자로부터 정반대 방향으로 도주하도록 강제된다(일반 저체력
도주와 같은 코드 경로를 재사용하되, 속도 보너스는 주지 않는다 — BALANCE_NOTES 참고).

### 탈출 / 완료 판정

```
dist(target, absorber) >= breakDistance   → 흡수 취소, 진행도 초기화
dist(target, absorber) <= escapeDistance  → 저항 시간(progress) 누적
그 사이 구간                                → 당겨지기는 하지만 진행도는 멈춤(교착 상태)
progress >= absorptionRequired            → 흡수 완료, growth 이전
```

크기 차이에 따라 저항 시간이 달라지는 기존 공식(v0.2 §4)은 그대로 유지된다 — 바뀐 것은
"저항 시간 동안 대상이 완전히 무력화된다"는 전제뿐이다.

### 피격에 의한 흡수 취소

흡수 중인 대상이 (제3자로부터든 누구로부터든) 공격을 맞으면 `combat.js#applyDamage`가
즉시 `cancelAbsorption()`을 호출한다. 넉백과 함께 적용되므로, 난전 속에서 흡수 위기의
대상을 아군이나 우연히 구해주는 상황이 자연스럽게 발생한다.

## 2. 넉백 시스템

피격 시 공격자→대상 방향으로 순간 속도(`kx`, `ky`)를 부여하고, `knockbackDuration` 동안
선형으로 감쇠시키며 적용한다(`combat.js#applyKnockback` / `#updateKnockback`). 대상이
클수록 덜 밀려나도록 `targetSize`에 반비례하는 계수를 곱한다:

```
speed = knockbackForce * knockbackResistance / (targetSize / referenceSize)
```

넉백은 공격/회피/흡수와 별개의 물리 레이어로 동작하므로, 이동 중이든 흡수당하는 중이든
항상 적용된다(`Game.update()`에서 매 프레임 모든 Player/AI에 대해 `updateKnockback` 호출).

## 3. 피격 피드백 강화

기존에도 Hit Flash와 Hit Particle은 있었지만 지속시간/수량이 하드코딩되어 있었다. v0.3은
`combat.hitFlashDuration`, `combat.hitParticleLifetime`으로 분리하고, 파티클 개수와 속도를
늘려 "맞았다"는 느낌을 더 분명하게 만들었다.

## 4. Kill Count

`Player.kills` 필드를 추가하고, `Game.onEntityDeath(entity, attacker)`가 `attacker ===
player`일 때만 증가시킨다. 흡수로 인한 제거는 `absorption.js`의 별도 경로를 타므로 절대
카운트되지 않는다 — 기획안이 "직접 공격으로 HP를 0으로 만든 경우"로 명시했기 때문이다.

## 5. 사운드 시스템

`js/audio.js`의 `AudioManager`가 Web Audio API 오실레이터/노이즈 버퍼로 8종의 효과음을
즉석 합성한다. 바이너리 에셋이 전혀 없으므로:

- 배포 시 파일 누락 위험이 없다(§7 배포 구조와 직결).
- 라이선스 문제가 없다.
- `gameBalance.json`의 `audio.*`로 여전히 완전히 조정 가능하다.

소음을 피하기 위해 플레이어 본인과 직접 관련된 이벤트에만 소리를 낸다(자세한 이유는
BALANCE_NOTES 참고).

## 6. 스폰 밀도 / 적 크기 분포

- Orb/Enemy 초기·최대 개체 수와 재생성 간격을 모두 `spawning.*`로 통합해 관리한다
  (`js/game.js#orbSpawnLoop`, `#enemySpawnLoop`).
- Enemy는 v0.2까지 "게임 시작 시 한 번 스폰하고 끝"이었다. v0.3부터는 `enemySpawnInterval`
  마다 개체 수를 `maxEnemyCount`까지 지속적으로 보충한다 — 맵이 시간이 지나도 비어 보이지
  않게 하기 위함이다.
- 적 크기는 고정 공식 대신 소/중/대 3단계 분포(`enemySpawn.*`)에서 뽑는다
  (`js/spawning.js#rollEnemySize`). 기본 60/30/10 비율로, 초반 평균 크기를 낮춘다.

## 7. 배포 구조

`versions/v0.3/` 폴더 자체가 완결된 배포 단위다. `run.bat`(Windows)/`run.sh`(macOS·Linux)가
Python을 우선 시도하고, 없으면 Node(`npx serve`)로 대체하며, 둘 다 없으면 설치 안내를
출력한다. 오디오가 합성 방식이라 `assets/` 폴더 자체가 필요 없다 — 폴더를 통째로 복사하는
것만으로 배포가 끝난다.

## 8. 회피 시스템 버그 수정과 입력 우선순위

- 회피 잔상이 사라지지 않던 버그: 잔상 배열이 회피 종료 시점에 비워지지 않았던 것이
  원인이었다. 수명 기반 페이드(`dodge.effectLifetime`)로 교체해 해결(BALANCE_NOTES 참고).
- 회피는 이제 공격의 어느 단계(Telegraph/Charge/Recovery)에 있든 그 상태를 즉시 READY로
  되돌리고 발동한다(`combat.js#startDodge`). 공격 쿨다운 자체는 그대로 유지되므로 "공격을
  무한히 취소해서 쿨다운을 우회"할 수는 없다 — 단지 회피라는 별개의 액션이 공격 애니메이션에
  발이 묶이지 않을 뿐이다.

## 9. 나머지 시스템

맵/카메라/HUD/공간 그리드/Skill Stage/Growth↔Size 변환 등은 v0.2와 동일하다. 자세한 내용은
[../v0.2/GAME_DESIGN.md](../v0.2/GAME_DESIGN.md)를 참고.

## 10. 향후 확장 방향

- 흡수 시각 효과에 "저항 중 vs 거의 완료" 단계별 다른 연출(예: 완료 직전 화면 흔들림) 추가.
- 사운드에 피치 랜덤화를 더해 반복 청취 피로 감소(BALANCE_NOTES 참고).
- Kill Count를 색상별/시간대별로 세분화해 디버그 패널에서 확인할 수 있게 하는 것도 고려
  가능.
