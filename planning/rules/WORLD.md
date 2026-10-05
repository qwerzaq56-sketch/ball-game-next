# 월드·지형·시대 규칙 (WORLD)

도메인 규칙 카드. 형식은 `README.md`. 근거: `00_기준/구현추인/cloud-spec-2fd3bd8/`의 `BIOME_DESIGN.md`·`BIOME_OBJECT_CATALOG_DESIGN.md`·`WORLD_WRAP_DESIGN.md`·`ERA_DESIGN.md`·`WAR_STATE_DESIGN.md`·`RELIC_DESIGN.md`. 승인: 사용자 2026-10-04 "구현 초과는 플레이해 보고 구현한 것이니 승인".

### R-WORLD-001 · 월드 크기와 끝 연결
- 규칙: 월드는 8,000×8,000이며 좌우·상하 끝이 이어진다(외벽 없음). 경계를 넘으면 넘은 거리만큼 반대편으로 이동하고, 거리·방향은 각 축의 최단 연결로 계산한다(감지·추격·충돌·먹이·흡수·넉백·스킬·환경 판정·대열). 반대편 복사본은 렌더링용이며 개체 수·점수·판정에 중복되지 않는다. 카메라는 가장 가까운 복사본을 따라가고, 몸이 한 축보다 커지면 그 축의 중심은 맵 중앙이다.
- 상태: 승인
- 출처: 사용자 요청 → 사용자 추인 2026-10-04 · M24 · M37 · M38 (수신함 우선순위 25·26)
- 확인:
  - config world.worldWidth = 8000
  - config world.worldHeight = 8000
  - config world.wrap = true
  - test tests/wrapped-world.test.mjs :: wrapped movement preserves overshoot on every edge and keeps oversized bodies movable
  - test tests/wrapped-world.test.mjs :: wrapped neighbors, overlap and combat agree on shortest directions across seams and corners
  - test tests/wrapped-world.test.mjs :: camera follows the nearest wrapped player image instead of jumping through the center
  - test tests/world-bounds.test.mjs :: oversized bodies keep their size and center in each constrained dimension
- 변경 이력: 5,000×5,000 벽 월드(v0.6~v0.24) → M37 끝 연결 → M38 8,000×8,000. **순환 맵 여부(우선순위 26)와 맵 확장(25)을 모두 승인으로 해소.**

### R-WORLD-002 · 지형 생성
- 규칙: 초원이 모든 셀의 기본이고 숲·호수·설원·화산·사막을 200 단위 셀로 얹은 불규칙 대형 바이옴으로 월드를 덮는다(기준 규모는 월드 짧은 변의 22%). 경계는 주기적 다중 파형 왜곡과 시드 위상으로 만들며 원형이 아니다. 감지·지역 보상·미니맵이 같은 셀 지도를 쓴다. 같은 시드는 같은 지형이며 지형은 끝 연결을 따른다. 바이옴 생성은 유물 활성화와 독립이다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M19 · M38
- 확인:
  - config biomes.enabled = true
  - test tests/biomes.test.mjs :: generated biomes cover every cell with broad noncircular regions independent of relics
  - test tests/biomes.test.mjs :: terrain is reproducible by seed, varies across seeds and wraps all sampled locations
  - test tests/biomes.test.mjs :: disabled biomes keep world and sensing neutral
- 변경 이력: 사분면 22%/78% 지점 원형 4지역(v0.10)·작은 초원/사막(v0.16) → M38 셀 지형. **승인된 분산 4바이옴 배치를 대체.**

### R-WORLD-003 · 설원 눈보라
- 규칙: 설원은 24초 주기의 마지막 8초에 눈보라가 발생한다. 눈보라 중 AI 일반 감지는 65%로 제한되고, 플레이어 화면·개체 이름·미니맵·자동 탐색에 시야 제한이 적용된다(설원 안에서만). 기본 시야는 R=208+max(0,Size−40)×0.65이며 개체는 2R까지 표시된다. 설원 지형 표시와 이름은 고정이고 정적 안개·바람 소리를 쓴다. 눈보라 시작 때 설원 셀에 성장 2배 얼음꽃 먹이를 최대 12개 생성한다. 설원 밖 관찰자에게도 활성 눈보라가 표시되지만 전체 화면 시야 필터는 적용하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M19 · M38 · M40 · M54 · M57 · M60
- 확인:
  - test tests/biomes.test.mjs :: blizzard reduces local sensing and blooms a capped visible snow reward once per event
  - test tests/biomes.test.mjs :: growth increases snow sight and reduces terrain fraction without granting immunity
  - test tests/blizzard-evaluation.test.mjs :: player visibility and automatic exploration are restricted only inside an active snowstorm
  - test tests/blizzard-evaluation.test.mjs :: snow geometry and biome names do not translate or animate during blizzard
  - test tests/environment-muster.test.mjs :: snow tiles advertise an active blizzard even to a viewer outside the snow
- 변경 이력: v0.10 눈보라 반경 300 가림 → 성장 비례 시야(M54). 이동 눈줄기 무늬는 정적 안개로 대체(M40, 사용자 멀미 보고).

### R-WORLD-004 · 동상
- 규칙: 눈보라 노출 게이지가6초분 쌓이면 동상, 벗어나면 초당2초분 감소하며0이 되어야 해제된다. 게이지는6에 고정 상한을 둔다. 서리 피난석 범위에서는 즉시 동상을 해제하고 게이지를 초당4초분 줄인다(지점 쿨다운과 무관). 기존0.5초 HP1.25%×(1−저항) 피해·하늘색65%·크기 저항·85%상한은 유지한다. frostDuration은 이전 저장 호환용 값이며 새 해제 판단에 사용하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M60
- 확인:
  - config biomes.frostExposureSeconds = 6
  - config biomes.frostDuration = 6
  - config biomes.frostTickHpFraction = 0.0125
  - config biomes.cyanFrostResistance = 0.65
  - config biomes.frostSizeResistancePerSize = 0.00025
  - config biomes.frostSizeResistanceCap = 0.15
  - test tests/environment-muster.test.mjs :: prolonged blizzard exposure causes DOT, cyan delays onset and size adds modest resistance
- 변경 이력: M79 4초 노출/6초잔여 타이머→6초 축적/0까지회복 게이지. 미승인 변경(M79):6초·회복2/4는 초기 튜닝. 관련 새 테스트 R-WORLD-004로 연결.

### R-WORLD-005 · 호수 이동 감속
- 규칙: 호수 타일 위에서는 일반 이동이 65%로 느려지고 파랑은 90%다. 플레이어·AI·대열 추종의 일반 이동에 같은 계수를 쓰며 공격 돌진·회피 거리는 유지한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M60
- 확인:
  - config biomes.waterMoveMultiplier = 0.65
  - config biomes.blueWaterMoveMultiplier = 0.9
  - test tests/environment-muster.test.mjs :: water reduces ordinary movement and blue keeps ninety percent speed
- 변경 이력: v0.10~M19 "호수 진입으로 강제 감속하지 않는다" → M60 감속 도입.

### R-WORLD-006 · 화산 용암 강
- 규칙: 화산에는 폭 124의 용암 강이 흐르고(주황 흐름이 시간에 따라 이동), 강의 선분·끝점으로부터 반폭 62 안의 접촉에서 0.5초마다 최대 HP 16%의 원시 피해에 방어를 적용한다. 몸 반지름이 강에 닿으면 중심이 밖이어도 적용한다. 붉은 몸은 크기에 비례한 용암 저항(Size당 0.2%, 최대 85%)을 가진다. 무적 회피는 피해를 막는다. AI는 용암에서 벗어나고 일반 경로가 강을 지나면 우회하며, 명령·동행 이동에도 적용된다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M19 · M38 · M41 · M63
- 확인:
  - config biomes.redLavaResistancePerSize = 0.002
  - config biomes.maxRedLavaResistance = 0.85
  - test tests/biomes.test.mjs :: lava channels inflict defended environmental ticks only on their contact area
  - test tests/biomes.test.mjs :: lava escape overrides commands and routes approach around the actual river
  - test tests/sprint-food-lava.test.mjs :: lava damages body overlap with an endpoint and the middle of a river while center stays outside
  - test tests/balance-growth.test.mjs :: lava resistance after defense retains gradual real damage rather than collapsing prematurely to minimum
- 변경 이력: 분화구 원 중심 마그마(반경 37%, v0.10) → 용암 강(M38). 분화구 원 표시는 폐지.

### R-WORLD-007 · 사막 이동 모래바람
- 규칙: 5~10초 간격으로 사막 타일에 모래바람이 생기며 동시 최대 3개, 반경 160~260, 수명 12~20초, 이동 속도 45, 월드 경계를 넘어 이동하고 사막 밖으로도 이동할 수 있다. 범위 안에서 0.5초마다 최대 HP의 2.5%에 크기별 지형 저항을 적용한 피해를 받는다. 노랑은 80% 저항과 방어 +25%를 얻으며 일반 방어를 지형 피해에 중복 적용하지 않는다. 여러 폭풍이 겹쳐도 피해·보너스는 중첩하지 않는다. 범위와 남은 시간은 황금색 반투명 원/호로 표시한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M61
- 확인:
  - config biomes.sandstormSpawnMin = 5
  - config biomes.sandstormSpawnMax = 10
  - config biomes.sandstormMaxCount = 3
  - config biomes.sandstormDurationMin = 12
  - config biomes.sandstormDurationMax = 20
  - config biomes.sandstormRadiusMin = 160
  - config biomes.sandstormRadiusMax = 260
  - config biomes.sandstormSpeed = 45
  - config biomes.sandstormTickHpFraction = 0.025
  - config biomes.yellowSandstormResistance = 0.8
  - config biomes.yellowSandstormDefenseBonus = 0.25
  - test tests/charge-weather-risk.test.mjs :: desert weather spawns in desert, drifts, expires and gives yellow resistance and real defense

### R-WORLD-008 · 지형 저항(크기 보정)
- 규칙: 모래폭풍·용암 피해에는 기존 방어 계산 뒤 `1/(1+max(0,Size−40)/200)`을 곱해 큰 몸일수록 환경 피해가 줄어든다. 설원에서는 성장하면 시야가 넓어지고 눈보라가 덮는 비율이 줄지만 면역은 아니다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M54
- 확인:
  - config biomes.terrainDefenseScale = 200
  - test tests/biomes.test.mjs :: growth increases snow sight and reduces terrain fraction without granting immunity

### R-WORLD-009 · 지역 먹이 조우
- 규칙: 지역마다 Era별 주기(영양기 30초·경쟁/전쟁기 45초·쇠퇴기 60초)로 먹이 8개가 조우한다. 지역 배율은 숲 1.25·호수 1.5·설원 1.75·화산 2배 성장량이며 위험 지역 보상은 중심 바깥 가장자리에 생성한다. 자연 먹이 포함 월드 최대 먹이 수를 지키며 용암을 피한다. 같은 시드·게임 시간에서 재현된다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M19 · M20
- 확인:
  - test tests/biomes.test.mjs :: regional encounters respect biome masks, orb cap and avoid lava
  - code js/biomes.js :: reward:1\.25
  - code js/biomes.js :: reward:2

### R-WORLD-010 · 지형 오브젝트 (기본 13종)
- 규칙: 지형마다 고정 오브젝트를 두며(기본 13종×6개=78지점, 종류별 1~20개) 몸이 닿으면 효과가 발생한다. 플레이어와 AI에 동일하게 적용되고 색 제한은 없다. 가장 가까운 접촉 개체가 먼저 쓰고, 지점 재사용 대기는 공유한다. 초원: 꽃무리(꽃 치장 30초, 동행 수락 +15%p), 바람돌(3스택 → 이동 +35% 15초). 숲: 열매 덤불(14초마다 성장치 50 먹이 4개+HP 8% 회복 아이템, 접촉 불필요), 수호 고목(HP 8% 보호막 6초). 호수: 진주 조개밭(조개 치장, 수락 +20%p), 해류(경로 안 개체·먹이를 초당 100 이동), 소용돌이(중심으로 최대 95 당김, 직접 피해 없음). 설원: 얼음꽃(눈보라 중 보상 2배), 서리 피난석(동상 저항 +15%p, 진입 즉시 동상 해제·게이지 감소 R-WORLD-004). 사막: 작은 오아시스(HP 5% 회복), 모래 비석(HP 10% 보호막). 화산: 흑요석 광맥(3스택 → HP 12% 보호막 20초+공방 +8%), 열기 분출구(12초 주기 중 4초 분출, 접촉 시 0.5초 간격 HP 초당 2.5% 피해). F1에서 후보 선택·수치 저장·JSON 교환이 가능하며 이전 후보는 삭제하지 않는다. 맑은 샘 교체는 보류다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M73 · M78
- 확인:
  - code js/biomeObjectCatalog.js :: DEFAULT_OBJECT_IDS=\['grass-garland','grass-wind-stack','forest-berry-grove','forest-tree','lake-garland','lake-current','lake-vortex','snow-flowers','snow-shelter','desert-oasis','desert-obelisk','volcano-obsidian-stack','volcano-vent-cycle'\]
  - obj grass-garland power = 0.15
  - obj grass-wind-stack stacksRequired = 3
  - obj grass-wind-stack power = 0.35
  - obj grass-wind-stack duration = 15
  - obj forest-berry-grove cooldown = 14
  - obj forest-berry-grove healFraction = 0.08
  - obj lake-garland power = 0.2
  - obj lake-current speed = 100
  - obj lake-vortex speed = 95
  - obj volcano-obsidian-stack shieldFraction = 0.12
  - obj volcano-vent-cycle activeDuration = 4
  - obj volcano-vent-cycle cycleDuration = 12
  - obj volcano-vent-cycle hpFraction = 0.025
  - test tests/biome-objects.test.mjs :: each biome has two active candidates, with three in the lake placed in its own biome deterministically
  - test tests/biome-objects.test.mjs :: objects require body contact and heal only wounded actors
  - test tests/object-effects.test.mjs :: three wind stones grant a fifteen-second boost and consume stacks
  - test tests/object-effects.test.mjs :: obsidian shield actually absorbs damage and attack/defense bonuses disappear when depleted
  - test tests/object-effects.test.mjs :: vent is harmless while resting and applies paced damage to every contacting actor during eruption
  - test tests/object-effects.test.mjs :: lake current has connected lake-only paths and carries both actors and food
- 변경 이력: M73 12개(꽃무리 성장 먹이 3개·바람돌 +25% 4초·진주 먹이·샘·분출구 +35% 이동 등) → M78 개편(치장·스택·주기 보상·해류·소용돌이). 이전 12종은 복구 후보(`ARCHIVED_BIOME_OBJECTS`)로 보존.

### R-WORLD-011 · 시대(Era) 순환
- 규칙: 게임 시간 9분을 한 주기로 영양기(0–180초)·경쟁기(180–360초)·전쟁기(360–480초)·쇠퇴기(480–540초)가 순환한다. 일시정지는 시간을 진행하지 않는다. 지역 먹이 조우 주기는 영양기 30·경쟁/전쟁기 45·쇠퇴기 60초다. 전쟁기에는 허용된 적대 사냥 후보의 선택 가중치가 1.5배다(프레이 금지·빨강 가중과 곱함). 시대 이름·남은 시간·진행 막대 배지를 최소 UI에도 표시한다. Era를 끄면 기존 지역 일정만 쓰고 전쟁·파멸은 없다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M20 · M34 · 제안 010·011
- 확인:
  - config era.enabled = true
  - code js/era.js :: id:'abundance',name:'영양기',end:180,encounter:30
  - code js/era.js :: id:'competition',name:'경쟁기',end:360,encounter:45
  - code js/era.js :: id:'war',name:'전쟁기',end:480,encounter:45
  - code js/era.js :: id:'decline',name:'쇠퇴기',end:540,encounter:60
  - test tests/era.test.mjs :: Era phase boundaries repeat with game time and pause/reset stop the schedule
  - test tests/era.test.mjs :: war travel uses a point and preserves prey, recovery, threat and companion restrictions
  - test tests/era.test.mjs :: disabled Era retains legacy regional schedule and creates no war or apocalypse

### R-WORLD-012 · 최상위 복수 전쟁
- 규칙: 전쟁기에 최상위 각각이 80% 확률로 다른 최상위 한 명에게 전쟁을 선언한다(전쟁기마다 개체별 한 번, 동색도 가능). 선언자가 상대에게 실제 공격으로 누적 최대 HP의 20% 이상 피해를 주면 상대도 선언자를 전쟁 목록에 추가한다(방어·무적·MISS 이후 실제 손실만 계산, 환경 피해·흡수 비용 제외). 상대 목록은 전쟁기 종료까지 유지되고 HP 10% 이하에서만 도주한다. 전쟁 중에는 평화 링크·흡수·아군 버프에서 제외된다. 수동 플레이어 조작은 그대로이고 AI·자동 플레이는 공격을 우선한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M59 · 제안 011 확장
- 확인:
  - config era.warEntryChance = 0.8
  - config era.warRetaliationDamageRatio = 0.2
  - config era.warFleeHpRatio = 0.1
  - test tests/apex-wars.test.mjs :: one entry roll per apex per war; 0/100 percent presets and new cycle eligibility
  - test tests/apex-wars.test.mjs :: 20 percent cumulative actual attack damage enlists a target and multiple wars coexist
  - test tests/apex-wars.test.mjs :: war targets survive title loss, distance, low HP and target death until phase end
  - test tests/apex-wars.test.mjs :: invulnerability, misses and environmental damage never enlist a war opponent

### R-WORLD-013 · 파멸과 유물
- 규칙: 파멸 조우는 전조를 두고 피해 없이 경고한 뒤 6초 뒤부터 틱이 시작되며 부활 지점 중심을 피하고, 한 번 끝나면 주변에 상한 있는 보상을 만들고 다음 주기에 돌아온다. 유물은 사막에서 생성되는 일반 먹이와 분리된 월드 아이템이며 순위·역할·개체 수에 포함되지 않는다. 몸체 접촉으로 획득하고 60초 동안 한 효과를 유지한다(전투 공격 +10%, 성장 먹이 성장 +20%, 회복 재생 +25%, 다른 유물을 얻으면 교체). 사망·Life 패배·초기화 시 사라지고 부활로 되살아나지 않는다. AI는 다른 목표가 없을 때 감지 안의 안전한 유물을 추적한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M20 · M21 · 제안 012·013
- 확인:
  - config relics.enabled = true
  - code js/relics.js :: damageBonus\(e\)\{return this\.effect\(e\)\?\.kind==='combat'\?\.1:0;\}
  - code js/relics.js :: growthMultiplier\(e\)\{return this\.effect\(e\)\?\.kind==='growth'\?1\.2:1;\}
  - code js/relics.js :: regenMultiplier\(e\)\{return this\.effect\(e\)\?\.kind==='regen'\?1\.25:1;\}
  - test tests/relics.test.mjs :: pickup replaces one effect, expires at sixty seconds and leaves no stale item target
  - test tests/relics.test.mjs :: death, life defeat and reset clear relics while spawn count remains bounded
  - test tests/era.test.mjs :: apocalypse warns without damage, avoids respawn centre and ticks after six seconds
  - test tests/era.test.mjs :: apocalypse finishes once, creates capped perimeter rewards and returns next cycle

### R-WORLD-014 · 범위 지속 오아시스·피난처
- 규칙: 작은 오아시스는 모든 범위 내 전투 개체를 지속 회복하고, 서리 피난처는 범위 안의 모든 전투 개체에 동상 해제·회복과 추가 서리 저항을 제공한다. 이 둘은 공유 소모/쿨다운 대상으로 삼지 않는다. 이탈하면 지속 혜택은 끝나며 이미 회복한 HP/해제한 동상은 되돌리지 않는다. 기존 R-WORLD-010의 일회 지급/쿨다운 설명은 이 두 후보에 대해 대체한다.
- 상태: 승인
- 출처: 사용자 직접 지시 2026-10-06. 오아시스 회복률은 기존 power/cooldown 환산(Codex 구현 선택), 기본 최대HP의 초당0.5%.
- 확인:
  - test tests/biome-objects.test.mjs :: oasis continuously heals all occupants without shared cooldown, and stops on exit

### R-WORLD-015 · 역주행과 객체 크기 다양화
- 규칙: 해류의 전투 개체 표류 속도를 실제 기본 이동 능력25% 이하로 제한하여 역주행 허용, 먹이 표류 유지. 객체는 seed 고정0.8~1.2배 본체/범위, 작은 오아시스는 개수1/3·추가반경1.6배·회복2배. 기존 오아시스 기본6개/초당0.5%는 기본2개/초당1%로 대체.
- 상태: 승인
- 출처: 사용자 직접 요청2026-10-06, 비율은 Codex 구현 선택
- 확인:
  - test tests/biome-objects.test.mjs :: current counterflow cannot overpower ordinary actor movement and object scales repeat deterministically
