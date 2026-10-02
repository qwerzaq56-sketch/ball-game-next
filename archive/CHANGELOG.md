# Changelog

## Version 0.6 (수정)
- **버그 수정**: 전체 초기화 버튼이 동작하지 않던 문제 수정 — `window.confirm()`이 일부 브라우저/임베딩 환경에서 사용자 상호작용 없이 조용히 `false`를 반환해 `game.reset()`이 호출되지 않던 것이 원인. 네이티브 confirm을 게임 내 커스텀 확인창(`#reset-confirm-overlay`)으로 교체
- 공격 텔레그래프 시간을 고정값(0.4초)에서 Size 기반으로 변경(`attackTelegraphTimeBase/PerSize`), 공격 차지 시간과 함께 Size 50→0.2초, Size 100→0.4초로 스케일링되도록 조정
- 킬 리워드 Orb를 필드에 자연스폰되는 Orb와 동일하게(크기 무작위, 십자 마크 제거) 재설계 — 죽은 적의 Size에 비례해 Orb 크기 범위와 성장치도 함께 커지도록 변경, 개수 상한(`orbMaxCount`)에 도달해도 개별 Orb 가치가 계속 커져 후반 성장이 정체되지 않음(Size 200→500 구간 실측: 개수 1.7배 증가에 총 보상은 4.3배 증가). 퍼짐 반경도 적 Size에 더 크게 비례하도록 배율 상향(`orbSpreadMultiplier`)
- 아군 흡수 ON/OFF 토글을 우클릭 제스처에서 F1 디버그 패널의 Gameplay 섹션 체크박스로 이동 — 전투 중 실수로 꺼지는 사고 방지, 기본값은 그대로 ON

## Version 0.6

### Combat
- Defense를 독립 섹션에서 Combat Scaling 하위 항목으로 이동(`combatScaling.baseDefense/defensePerSize/minimumDamage`)
- AI 공격 빈도 조정: AI 전용 쿨다운(`ai.attackCooldown` 2.5초) 추가, 스택 보유 여부와 무관하게 공격을 막는 `aiAttackGateTimer` 신설 — 스택이 쌓여 있어도 연속 공격 불가
- Attack Telegraph 0.2초 → 0.4초
- Size 기반 Attack Charge Duration 추가(`attackChargeDurationBase/PerSize`, Size 200 ≈ 0.8초) — 공격 범위(거리)는 그대로 두고 준비 시간만 늘어나는 구조로, v0.5에서 고친 "범위-돌진거리 연동 버그"가 재발하지 않는 것을 재검증
- Dodge Distance를 지수 곡선에서 선형 공식으로 변경(`dodge.baseDistance` 100, `dodge.distanceGrowth` 0.8)
- Size 기반 카메라 줌아웃 추가(`camera.zoomOutPerSize`, `camera.maxZoomOut`)
- Knockback Force가 Combat Scaling 하위로 이동(값은 500 유지)

### Absorption
- 우클릭으로 아군(같은 색) 흡수 ON/OFF 토글 추가(`player.allyAbsorptionEnabled`)
- AI가 흡수 가능한 대상을 발견해도 매번 시도하지 않도록 확률화(`ai.absorptionAttemptChance` 0.6)
- 흡수 진행률에 따라 피치/음량이 실시간으로 변하는 연속 드론 사운드 추가(오디오 노드를 프레임마다 재생성하지 않음)
- **버그 수정**: 흡수로 죽는 경로가 Life 시스템을 우회해 `respawnPlayer()`를 직접 호출하던 문제 발견·수정 — `handlePlayerDefeat()`로 전투 사망/흡수 사망 경로를 통합해 항상 Life가 소모되도록 변경

### Reward
- 처치 시 직접 Growth 보상을 `growthRewardMultiplier`(0.5)로 감소
- 대신 적 Size에 비례해 눈에 띄게 많은 Orb를 드롭하도록 변경(`killReward.orbBaseCount/orbPerEnemySize/orbMaxCount`) — Size 20→5개, Size 150→18개
- `deathOrb` 설정 섹션 제거(`killReward`의 orb 필드로 통합)

### AI
- 저체력 상태에서도 15% 확률로 도주 대신 공격을 시도하도록 변경(`ai.lowHealthAttackChance`) — 완전히 무력화되지 않음

### Life / Score
- Life 3회 시스템 추가 — 사망해도 Size/Growth를 유지한 채 부활, Life 0에서 Game Over
- 기존 "부활 시 Growth 50% 감소" 페널티 제거
- Score 시스템 추가(Orb/흡수/킬 보상 기반) + 로컬 Top 10 스코어보드(`localStorage`, 브라우저별 개별 기록)
- 전체 초기화 버튼 추가(`Game.reset()`) — 스코어보드는 별도로 유지되며 초기화되지 않음

### Audio
- 음소거 버튼 추가, `localStorage`로 설정 유지

### Deployment
- GitHub Pages 정적 배포 지원 확인(모든 리소스 경로가 이미 상대 경로였음)
- `run.bat`/`run.sh` 로컬 자동 실행 유지

## Version 0.5 (수정)
- **버그 수정**: AI의 공격/회피 스택 회복 타이머가 `js/ai.js`와 `js/game.js` 두 곳에서 중복 호출되어 프레임마다 2배 속도로 충전되던 문제 수정 — 적이 설정된 쿨다운(예: 1.5초)의 절반도 안 되는 간격으로 공격을 남발하던 원인이었음(플레이어는 영향 없었음). 격리 테스트로 공격 간격이 0.9초 → 1.517초(정상)로 회복되는 것을 확인, BALANCE_NOTES.md 참고

## Version 0.5
- 방어력 시스템 추가: Size에 비례한 Defense가 받는 피해를 감소시킴(`defense.*`, `finalDamage = max(minimumDamage, raw - defense)`)
- 공격력 공식 단순화: `damage = baseAttackDamage + size×attackDamagePerSize`(`attackDamagePerSize = 1`), 기본 공격 범위 80→120
- **공격 범위 ↔ 돌진 거리 버그 수정**: 돌진 속도를 고정값 대신 `currentChargeDistance / attackChargeDuration`으로 역산 — 공격 범위가 커지면 실제 돌진 거리도 함께 늘어나도록 수정
- 공격/회피를 "단일 사용 + 쿨다운"에서 **스택(충전) 시스템**으로 전면 교체 — Size 40/100(공격), 50/70(회피)에서 단계적으로 최대 스택 증가, `attackCooldown`/`dodgeCooldown`은 이제 스택 회복 간격의 의미로 재해석
- **흡수 시스템 전면 재설계(거리 기반)**: 더 이상 물리적으로 겹치지 않아도 진행되며, 진행 속도가 거리에 반비례(`maintainDistance` 밖에서는 연결 해제). 위치를 억지로 당기는 물리를 사실상 제거해 v0.3/v0.4에서 두 차례 발생했던 흡수 교착 버그가 구조적으로 재발할 수 없도록 재설계
- HP 리젠에 Size 스케일링 추가(`healthRegen.baseRate + size×regenPerSize`), 딜레이 2초→5초
- 적 최대 크기가 플레이어 Size에 실시간 연동(`enemyScaling.*`) — 성장할수록 더 크고 위험한 적 등장, 단 소형 개체 스폰은 고정폭 유지
- 서로 다른 색상 Player/AI끼리 물리적으로 밀어내는 충돌 추가(`resolvePushApart`, Size 질량 비례) — 공격 돌진/회피 중에는 예외적으로 통과
- 넉백 기본값 150→500
- `run.bat`/`run.sh`가 서버 실행 후 기본 브라우저를 자동으로 열도록 변경 — `localhost` 주소를 직접 입력할 필요 없음

## Version 0.4
- 공격력이 Size에 비례하도록 변경(`combatScaling.baseAttackDamage/attackDamageReferenceSize/attackDamagePerSize`) — 기존 고정 `attack.attackDamage`는 제거
- 공격/회피 범위 공식을 선형에서 지수 성장으로 교체(`attackRangeGrowthExponent`/`dodgeDistanceGrowthExponent`) — 공격 범위가 회피 거리보다 더 가파르게 증가
- HP 자동 회복 시스템 추가: 피격 후 `healthRegen.delay`초 뒤 `healthRegen.rate`/초로 회복, 재피격 시 딜레이 초기화
- AI가 가장 가까운 대상이 아니라 **가장 유리한 크기비**의 흡수 대상을 우선 탐색·추격하도록 변경(`ai.absorptionDetectionRange`/`absorptionPriorityRatio`/`highPriorityAbsorptionRatio`)
- 흡수 속도 조정(`pullForce` 0.35→0.45, `baseResistanceTime` 1.0→0.8) 과정에서 **완료도 취소도 되지 않고 영원히 멈추는 교착 상태 버그**를 발견 — 거리에 비례해 강해지는 rubber-band 당김과 순수 경과시간 안전장치(`absorption.maxGrabDuration`)로 수정
- 흡수 시작/성공 사운드 분리(`absorbStart`/`absorbSuccess`), 흡수 성공 시 흡수자 Scale Pulse 이펙트 추가
- 킬 보상 추가: 적 크기에 비례한 Growth를 처치자에게 직접 지급(`killReward.*`), "+N GROWTH"/"KILL +1" 팝업과 전용 사운드
- Orb 스폰 밀도 추가 증가(`spawning.initialOrbCount/maxOrbCount/orbSpawnInterval` 400/500/0.4 → 450/600/0.25)
- Debug 패널에 Combat Scaling(공격력/사거리 공식), Health Regen, Kill Reward 섹션 추가

## Version 0.3
- 흡수 시스템 조작감 개선: 당기는 힘을 프레임레이트 독립적인 약한 힘(`pullForce`)으로 교체하고, 흡수 중에도 Player/AI 모두 이동(및 회피)으로 저항할 수 있도록 변경
- 흡수 탈출/차단 거리(`escapeDistance`/`breakDistance`) 추가: 일정 거리 이상 벌어지면 흡수 취소
- 흡수 중인 대상이 공격을 받으면 즉시 흡수 취소(넉백과 함께)
- Orb/Enemy 스폰 밀도 대폭 증가(`spawning.*`), Enemy는 `enemySpawnInterval`마다 지속 재생성되어 `maxEnemyCount`까지 보충
- 적 스폰 크기를 소/중/대 분포(`enemySpawn.*`, 기본 60/30/10%)로 변경 — 초반 평균 크기 하향
- Web Audio 기반 합성 효과음 추가(`js/audio.js`, `audio.*`) — 바이너리 에셋 없이 동작
- 피격 피드백 강화: Hit Flash/Particle 밸런스 값 분리, 넉백 추가(대상 크기에 반비례)
- Kill Count 추가 — 플레이어 공격으로 마지막 타격한 처치만 카운트, HUD 표시
- 회피 잔상이 영원히 남던 버그 수정 — `dodge.effectLifetime` 후 자동 소멸
- 회피가 공격의 어느 단계든 즉시 취소하고 발동 가능하도록 변경
- `run.bat`/`run.sh` 배포 스크립트 추가 (Python 우선, 없으면 Node로 대체)
- 기획안 예시값(`pullForce:0.25`, `breakDistance:70`)은 흡수가 거의 항상 실패해 `pullForce:0.35`/`breakDistance:110`으로 조정(BALANCE_NOTES.md 참고)

## Version 0.2
- 공격 준비 시간을 0.5초에서 0.2초로 변경
- Orb와 Fragment의 시스템을 통합 (사망 시 생성되던 "Fragment"는 이제 그냥 "죽은 개체의 색을 물려받은 Orb")
- 색상과 관계없이 Orb(성장 자원) 섭취 가능 — 색상은 이제 "세력/전투 관계"만 결정
- 같은 색상 개체(Player/AI) 사이의 크기 기반 위계·흡수 시스템 추가
- 공의 크기(및 흡수자와의 상대 크기 차이)에 따른 흡수 저항 시간 추가, 크기 역전 시 흡수 취소
- 성장 단계(Skill Stage)에 따른 스킬 해금 시스템을 Growth 기준에서 **Size 기준**으로 변경하고, 모든 공(Player+AI)에 동일하게 적용
- 성장(Size)에 따라 공격 범위 / 회피 거리가 함께 증가하도록 변경
- Debug 패널에 `attack.telegraphTime`, `skills`, `absorption`, `combatScaling` 섹션 추가
- 버전 관리 구조 도입: `versions/v0.1`, `versions/v0.2`로 분리, Version 0.1은 그대로 보존

## Version 0.1
- 최초 프로토타입
- 플레이어 이동
- 공 생성
- 성장
- 공격
- 회피
- AI 상호작용
