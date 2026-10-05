# 종족 행동 특성 규칙 (SPECIES)

도메인 규칙 카드. 형식은 `README.md`. 기획서 §7.6(제안 006, 2026-10-02 승인)의 구현 확인 규칙. 종족 능력(E/R)은 `ABIL.md`. 이번 종족 특성은 공격력·HP·이동속도 스탯 차이를 추가하지 않고, 하늘색의 무목표 배회 계수만 바꾼다. 플레이어에게 종족 AI의 자동 행동을 적용하지 않는다.

### R-SPECIES-001 · 5종족 구성 (보라색 → 하늘색 교체)
- 규칙: 종족은 하늘색·파랑·초록·빨강·노랑 5종을 유지한다. 이전 보라색은 하늘색으로 교체했다. 설정·표시·선택·동족 판정·효과가 같은 색 정의를 쓴다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 006
- 확인:
  - config world.colorCount = 5
  - test tests/species.test.mjs :: cyan replaces purple while preserving five colors

### R-SPECIES-002 · 초록 — 동족 흡수 시작 수락 50%
- 규칙: 초록 AI가 동족과 흡수 가능한 크기·거리 관계에 새로 들어오면 그 상대에 대해 한 번만 50% 확률로 수락한다. 거절하면 같은 만남에서 재추첨·추격·흡수 시작을 하지 않으며, 상대가 유지거리 밖으로 나가거나 죽거나 크기 관계가 뒤집히면 해제하고 새 관계에서 재판정한다. 이 규칙은 초록 AI가 흡수하는 쪽일 때만 적용되며 플레이어에게는 적용하지 않는다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 006
- 확인:
  - code js/species.js :: random\('ai'\)<\.5
  - symbol js/species.js :: acceptsAbsorption
  - test tests/species.test.mjs :: green refusal is stable until separation; central consumption respects refusal

### R-SPECIES-003 · 빨강 — 일반 사냥 선택 가중치 ×1.5
- 규칙: 먹이·동족 흡수·다른 색 일반 사냥 중 선택 가능한 후보가 동시에 있으면 일반 사냥의 선택 가중치는 **기본 2배(전쟁기 3배)**이고 빨강은 여기에 1.5배를 더 곱하며, 나머지 후보는 1이다. 후보 종류별로 하나의 유효 행동을 비교하며, 성격의 고정 우선순위·생존·막타·도전이 이 추첨보다 먼저다. 성격이 일반 사냥을 허용하지 않으면 사냥 후보 자체가 없다. 이미 고른 유효한 선택은 다시 뽑지 않는다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 006
- 확인:
  - code js/species.js :: ai\.color==='red'\?1\.5:1
  - code js/ai.js :: chooseGeneral\(ai,choices,game\.era\.enabled&&game\.era\.phase\.id==='war'\?3:2\)
  - symbol js/species.js :: chooseGeneral
  - test tests/species.test.mjs :: choice retention does not reroll a valid target
- 변경 이력: **일반 사냥 선택 가중치 기본 2배(전쟁기 3배)**는 제안 006(빨강만 1.5배)·제안 010(전쟁기 ×1.5)에 없던 구현 변경이다(M38 "비슷한 급의 교전 증가" 요청). 전쟁기/평시 비율 1.5는 유지된다.

### R-SPECIES-004 · 파랑 — 회피 후 1초 반격 기회
- 규칙: 공격 전조를 보고 회피하면 그 공격자를 기억하고, 회피가 끝난 뒤 최대 1초 동안 공격자가 감지·공격 범위 안에 있고 현재 역할·성격이 공격을 허용하면 다른 일반 기회보다 반격을 우선한다. 공격 스택이 없거나 체력·위협 조건이 불리하면 반격하지 않는다. 공격자 사망·감지 이탈·기억 만료 시 해제한다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 006
- 확인:
  - code js/ai.js :: ai\.color==='blue'\)\{ai\.counterattacker=other;ai\.counterTimer=1;\}
  - symbol js/ai.js :: counterattacker
- 변경 이력: 전용 테스트 없음(코드 확인만). 일반 반격(R-COMBAT-010)이 모든 종족에 추가되어 파랑의 "회피 후"는 즉시 반격 경로라는 차이만 남는다.

### R-SPECIES-005 · 노랑 — 무목표 탐색 방향 유지
- 규칙: 목표 없는 탐색 때 노랑은 한 방향을 4~6초 유지한다(다른 종족은 6~10초). 이동속도는 기존 배회 속도를 유지하고, 먹이·상대·위협을 발견하면 즉시 일반 판단을 한다. 관계 동행·관찰·추격에는 적용하지 않으며 경계에서는 기다리지 않고 방향을 다시 고른다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 006 · M18 확장
- 확인:
  - code js/exploration.js :: ai\.color==='yellow'\?4\+random\('ai'\)\*2:6\+random\('ai'\)\*4
  - test tests/species.test.mjs :: cyan reduction applies only to idle wander and yellow boundary resets direction timer

### R-SPECIES-006 · 하늘색 — 정착 경향 (무목표 배회 ×0.7)
- 규칙: 하늘색의 무목표 배회 속도만 기존 배회 속도의 70%로 낮춘다(실제 속도 moveSpeed×0.55×0.7=×0.385). 먹이 추적·사냥·흡수 추격·도주·회피·공격 돌진·관계 이동에는 적용하지 않는다. 주변 먹이가 없어져도 느린 배회로 계속 다른 장소를 탐색한다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 006
- 확인:
  - code js/ai.js :: speed\*=0\.55\*\(ai\.color==='cyan'\?\.7:1\)
  - test tests/species.test.mjs :: cyan reduction applies only to idle wander and yellow boundary resets direction timer
