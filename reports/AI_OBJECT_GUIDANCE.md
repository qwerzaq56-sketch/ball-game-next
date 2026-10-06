# AI 서리 피난처·오아시스 상호작용 구현 주의사항

사용자 승인 새 행동을 위한 읽기 전용 코드 검토. AI 구현은 부모 담당이며 이 문서에서는 수치·규칙·코드·git을 바꾸지 않았다.

## 실제 대상과 지속 효과

- `BiomeObjects.inFrostShelter(e)`는 biomes.enabled일 때 effect=frost인 실제 객체와 `dist(o,e)<=o.config.radius+e.size/2`를 검사한다. 중심이 범위에 완전히 들어가야 하는 조건이 아니라 신체 접촉 포함이다. `biomes.update`는 피난처 안에서 frostExposure를 회복하고 frostbiteRemaining을 바로0으로 만든다. 하늘색 전용이 아니며 살아 있는 AI/플레이어가 혜택을 받는다. 피난처는 공동 소모·cooldown 경쟁 대상이 아니다.
- 작은 오아시스 `candidate==='desert-oasis'`는 범위에 머무는 모든 살아 있는 player/ai를 매 dt 회복한다. hp를 maxHp까지 `maxHp * power / cooldown * dt`만큼 회복하며 HP가 실제 증가할 때만 healVisualUntil을 갱신한다. cooldown 값은 회복률 계산의 분모이며 소모 후 재사용 대기라는 뜻이 아니다. 모든 종족 대상, orb는 회복 대상이 아니다.
- catalog의 원래 radius를 탐색에 그대로 쓰지 않는다. sync가 객체마다 visualScale과 config.radius를 실제로 조정한다. 오아시스 power도 sync에서 두 배로 보정한다. 반드시 현재 `o.config`를 읽고 수치를 중복 보정하지 않는다. 실제 효과 판정은 radius+size/2다.

## 눈보라·회복 상태 API

`game.biomes.blizzard()`는 biomes.enabled와 gameTime%24>=16 조건이다. 눈보라 노출은 **현재 지역이 snow일 때만** 실제로 적용된다. 따라서 global blizzard만 보고 모든 지역 AI를 피난처로 몰아가면 의미가 다르다. `regionAt(ai)?.id`, `frostExposure`, `frostbiteRemaining`, `inFrostShelter(ai)`를 현재 상태로 구분한다. 동상은 눈보라가 끝나도 exposure가 완전히 회복할 때까지 남을 수 있다. 피난처 밖의 일반 회복도 존재한다. 실제 회복/해제는 기존 update가 수행하므로 AI가 도착했다는 이유로 HP나 exposure를 직접 변경하지 않는다.

`sensingRange(ai)`는 snow+blizzard에서 감지거리를 줄인다. 오브젝트 선택이 제한된 시야 안의 탐색인지 장기 기억인지 부모 구현에서 명확히 한다. 읽기만으로 모든 맵의 안전한 오아시스를 즉시 안다고 추정하지 않는다. 기존 recovering 진입/해제 히스테리시스와 사용자 저체력 요청의 관계를 먼저 확인하며 새로운 문턱 수치를 이 보고서에서 정하지 않는다.

## 안전·우선순위

기존 decideAI는 시대 전쟁 판단 뒤 환경 위험 탈출, 흡수자 탈출, 적 모래 장판 탈출을 먼저 처리한다. 단순 회복 목적이 즉시 생존 회피를 덮어쓰지 않게 한다. 실제 명령·반격·주변 적·동족 흡수 위험도 목적지와 현재 위치 양쪽에서 확인해야 한다. 혜택 객체가 있다고 그 안이 전투 안전지대가 되는 것은 아니다.

`biomes.danger(ai)`와 `routePoint(ai,target)`는 기존 용암·모래바람 등 위험 관련 경로를 처리한다. 단순 목적지 거리만 비교하면 위험 장판을 가로지르는 길이 선택될 수 있다. yellow의 모래바람 저항·위험 예외 등 기존 조건을 유지한다. 새 랜덤 선택을 추가하기보다 현재 결정 방식과 tie-break를 재사용하는 것을 우선 검토한다. 실제 피난처에 이미 들어가 있거나 HP가 회복됐을 때에는 목적이 끝나는 조건을 분명히 해 정주·재선택 떨림을 피한다.

## 토러스·target 수명

`collision.dist`는 `topology.delta`를 사용하고 `_world.wrap`일 때 가장 짧은 토러스 거리를 반환한다. 실제 객체는 `_world`가 있다. 목적지를 복사하면 `_world`를 유지하거나 명시적으로 world를 전달해야 경계 가까운 피난처/오아시스까지 먼 반대 방향으로 이동하지 않는다. angleTo/routePoint도 같은 topology를 따른다. 직접 `Math.hypot(o.x-ai.x,...)`로 후보 거리나 방향을 계산하지 않는다.

오브젝트 자체에는 entity의 `alive`가 없다. 기존 AI target 정리 조건은 대부분 state에서 `!ai.target.alive`이면 즉시 search로 돌아간다. 새 객체 목적 state와 이동 분기/target 정리 규칙을 함께 확인해야 한다. 생존용 엔티티로 객체를 조작하거나 실제 객체에 alive를 새로 쓰기보다 목적지 wrapper 또는 객체 전용 상태로 구분한다. `sync()`는 preset signature가 바뀌면 objects를 새로 만든다. 이전 객체 참조를 무조건 계속 유지하지 말고 실제 객체 id 및 enabled 목록으로 재검증한다.

## 의미 있는 검증 조건

snow 눈보라 중 일반색 AI가 실제 피난처를 선택하고 접촉 범위에서 exposure 감소/동상 해제가 기존 update로 발생하는지; 눈보라 아닌 지역 AI가 global flag만으로 피난처로 몰리지 않는지; 저체력 AI가 실제 오아시스에 도착하여 HP가 증가하고 회복 종료 후 다른 행동으로 복귀하는지 확인한다. 바로 근처 위협·흡수·적 장판이 있으면 안전 행동이 유지되는지, 객체 disabled/재생성 후 유효하지 않은 target이 해제되는지, world 양끝에서 토러스 최단 경로를 선택하는지 검증한다. AI 크기가 큰 경우 radius+size/2 접촉과 시각 범위가 일치하는지도 포함한다. 새 수치나 생성율 변경을 이 행동 검증에 섞지 않는다.
