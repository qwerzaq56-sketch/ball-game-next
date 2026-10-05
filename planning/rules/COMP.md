# 동행·대열 규칙 (COMP)

도메인 규칙 카드. 형식은 `README.md`. 근거: `00_기준/구현추인/cloud-spec-2fd3bd8/COMPANION_COMBAT_DESIGN.md`·`ALLY_CHAIN_DESIGN.md`·`GAME_DESIGN.md`(M 번호가 클수록 우선). 승인: 사용자 2026-10-04 "구현 초과는 플레이해 보고 구현한 것이니 승인".

### R-COMP-001 · 대열 형성·유지 규칙
- 규칙: 같은 색 인접 개체는 몸 표면 거리 100 안에서 연결되고 140까지 유지된다(직접 이웃만). 연결 이웃당 공격 +5%, 최대 3명(+15%). AI는 3초마다 진입 18%·이탈 8% 확률로 판단하며 대열은 최대 6명이다. 플레이어는 직접 대열을 이끌고 G로 즉시 이탈할 수 있다. 큰 개체도 격자 범위 때문에 누락되지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M8 · M9 · M16
- 확인:
  - code js/allyLinks.js :: enter:100,release:140,bonus:\.05,bonusCap:3,decisionSeconds:3,joinChance:\.18,leaveChance:\.08,maxGroup:6
  - test tests/ally-links.test.mjs :: ally edges enter at surface 100 and hold until 140; direct neighbors only
  - test tests/ally-links.test.mjs :: large units are not missed by grid range and bonuses cap at three direct allies
  - test tests/ally-links.test.mjs :: player leads formations and leaves by choice while AI entry remains probabilistic
- 변경 이력: v0.9 이전에는 동행 개념 없음.

### R-COMP-002 · 동행 중 전투와 비적대
- 규칙: 동행 중에도 외부 적과 싸우고 회피할 수 있다(이전의 "동행 중 공격 금지" 폐지). 대열 구성원은 서로 적대하지 않고 보호하며, 혼색 동행(우정 축제)도 실제 판정과 물리 충돌에서 서로 보호한다. 대열 이탈 후에는 자유 행동을 재개한다.
- 상태: 승인
- 출처: 사용자 요청 → 사용자 추인 2026-10-04 · M38 · M39
- 확인:
  - test tests/ally-links.test.mjs :: joining permits hostile attacks and protects same-color allies and leaves free movement/attacks available after departure
  - test tests/group-combat.test.mjs :: companions react with dodge and do not cancel committed attacks to form up
- 변경 이력: M9~M10의 동행 중 공격·특수능력·흡수 금지 → M38 폐지.

### R-COMP-003 · 자유 추종과 이동
- 규칙: 구성원은 대열 목표에서 일정 반경(60) 안에서는 위치를 강제로 교정하지 않고, 그 밖의 거리만 스프링으로 부드럽게 보정한다(따라잡기 최대 자기 속도 1.6배). AI 리더는 자신의 이동 속도 90%를 쓰고 플레이어는 원래 아날로그 속도를 유지한다. 생존 도주가 우선이다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M36 · M57
- 확인:
  - code js/allyLinks.js :: freeRadius:60,spring:2,catchup:1\.6,leaderPace:\.9
  - test tests/ally-links.test.mjs :: followers keep offsets inside the free band and ease back beyond it
  - test tests/ally-links.test.mjs :: player keeps normal analog speed with a slow companion
  - test tests/ally-links.test.mjs :: a player-led spring formation keeps up through consecutive simulation frames
  - test tests/charged-controls.test.mjs :: a follower approaching the link limit uses dodge to catch the leader

### R-COMP-004 · 동행 성향과 수락 확률
- 규칙: 개체는 동행 선호(동행 선호/중립/독립 선호)를 가진다. 진입·이탈 확률과 제안 수락 확률이 선호별로 다르다(동행 선호: 진입 30%·이탈 3%·수락 85%, 중립 18%·8%·60%, 독립 선호 7%·18%·25%). 초록은 자연 진입 확률에0.75를 곱한다(동행 선호22.5%·중립13.5%·독립5.25%). 꽃·조개 치장은 수락 확률을 올리며(자연 진입 최대 80%·요청 최대 95%) 최상위 동행 제안은 수락 가중치를 얻는다(확률 상한 있음). 우정 축제 동안에는 적대 색과도 동행할 수 있다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M39 · M74 · M78
- 확인:
  - code js/allyLinks.js :: social:\{join:\.30,leave:\.03,accept:\.85
  - code js/allyLinks.js :: neutral:\{join:\.18,leave:\.08,accept:\.60
  - code js/allyLinks.js :: independent:\{join:\.07,leave:\.18,accept:\.25
  - test tests/m74-controls.test.mjs :: apex companion invitations gain acceptance weight with a probability cap
  - config abilitySkills.greenJoinMultiplier = 0.75
  - test tests/object-effects.test.mjs :: flower and shell decorations boost invitation acceptance until expiry

- 변경 이력: M79 초록 자연 진입 ×0.75, E 수락80→70(R-ABIL-006). 미승인 변경(M79): 세부 계수 초기 튜닝; 성향 및 이탈·치장·최상위 가중치 유지.

### R-COMP-005 · 자동 동행 신청
- 규칙: 자동 동행은 기본 OFF이며, 켜면 게임 시간 5초마다 일반 동행 신청을 시도한다. 일시정지 시 게임 시간이 멈추고, 신청 불가 행동·빙결·흡수 중이면 그 회차는 건너뛴다. 일반 신청 쿨다운은 5초다. 새 게임은 OFF로 시작한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M68
- 확인:
  - test tests/environment-muster.test.mjs :: automatic companionship offers every five game seconds and can be switched off

### R-COMP-006 · 무리 사냥과 대열 성격
- 규칙: 대열 성격은 구성원 투표에 리더 3배 가중을 더해 정하며, 몸 반경을 고려한 동료 힘 합산으로 더 강한 상대에게 도전할 수 있다(허용 힘 배율 도전형 1.35·기회형 1.15·회피형 0.7, 단독·신중형은 후퇴). 대열 구성원을 공격한 적은 5초간 공동 표적이 된다. 위험 지형·흡수 탈출·낮은 HP 회피가 우선하고, 수동 플레이어의 이동 권한은 유지한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M38 · M56 · 수신함 I-001 일부(집단 전력 도전)
- 확인:
  - test tests/group-combat.test.mjs :: member votes plus leader triple vote give all three formation personalities
  - test tests/group-combat.test.mjs :: nearby allied strength permits stronger opponents but solitary and cautious units retreat
  - test tests/green-companions.test.mjs :: summoned companions focus the owner attacker and remain grouped through repeated attack decisions
- 변경 이력: 수신함 I-001의 "동행 시 확률적으로 더 큰 적에게 덤빔"은 확률이 아니라 집단 전력 기준으로 구현되어 있다(확률 방식은 미반영).

### R-COMP-007 · 동행자의 위험 해제 거리
- 규칙: 동행자는 위협 진입 거리 320과 해제 거리 400을 따로 쓰고, 잘못된 위협은 잊는다. 같은 색 흡수자로부터의 탈출은 흡수자의 크기별 연결 범위를 넘어서까지 이어진다. 모래 장판 탈출은 진입 360, 유지 420이다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M9 · M11 · M38
- 확인:
  - code js/allyLinks.js :: threatEnter:320,threatRelease:400
  - test tests/ally-links.test.mjs :: companion danger uses separate entry and release distances, and forgets invalid threats
  - test tests/ally-links.test.mjs :: companions keep escaping same-color absorbers beyond their size-driven connection range
