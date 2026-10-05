# AI 행동 규칙 (AI) — 구승인 규칙의 카드화

도메인 규칙 카드. 형식은 `README.md`. 기획서 §7(역할·공통 성격·프레데터 관계, 제안 004·005 승인)의 **구현으로 확인된 규칙**만 카드로 옮겼다. 구현이 이후 바뀐 부분은 각 카드의 변경 이력과 `00_기준/구현추인/30_구승인규칙_대조표.md`에 적었다. 승인: 사용자 2026-10-02(제안 승인) · 2026-10-04(구현 추인).

### R-AI-001 · 먹이 군집 평가
- 규칙: 먹이 군집은 중심 거리 120 이내의 먹을 수 있는 먹이의 성장값 합으로 평가하고, 합 80 이상을 풍부한 기회로 본다. 실제 목표는 가장 가까운 먹이 한 개이며 판단 때마다 다시 평가한다. 회복 중에도 안전한 먹이는 먹을 수 있다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 005 · 구현 확인 2026-10-04
- 확인:
  - code js/ai.js :: dist\(e,o\)<=120\?o\.growthValue
  - code js/ai.js :: c\.value>=80
  - test tests/ai-rules.test.mjs :: growth prey: risk stops when cluster value drops below 80

### R-AI-002 · 성장 추구형 프레이의 위험 감수
- 규칙: 성장 추구형 프레이는 체력 60% 이상에서 풍부한 먹이(군집 80 이상)를 향해 큰 위협이 있어도 이동할 수 있다. 시작 후에는 체력이 50% 이하가 되거나 군집 가치가 80 미만이 될 때만 중단한다. 위협이 160 이내이거나 자기 크기의 1.5배를 넘으면 시작·지속 모두 도주가 우선한다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 005 · v0.25 시작/지속 구분 수정
- 확인:
  - symbol js/ai.js :: riskTaking
  - test tests/ai-rules.test.mjs :: growth prey: risk starts at HP 60% but not 59%
  - test tests/ai-rules.test.mjs :: growth prey: once started, risk continues until HP 50%
  - test tests/ai-rules.test.mjs :: growth prey: the two threat limits override continuing risk

### R-AI-003 · 도전형 프레데터의 결투
- 규칙: 도전형 프레데터는 일반 감지 안의 다른 색 최상위가 약해졌을 때(자기 체력 60% 이상·상대 체력 30% 이하·상대 크기가 자기의 1.5배 이하·공격 해금) 도전한다. 상대 체력이 40%를 넘거나 자기 체력이 40% 이하가 되면 해제한다. 적격한 도전 대상은 일반 위협 도주에서 제외하지만 다른 큰 위협이 있으면 그대로 도주한다. 리스크 회피형은 대상 위치가 다른 위협에서 안전해야 하고 기회주의형은 상대의 후딜을 기다린다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 004 · v0.25 도전 예외 수정
- 확인:
  - symbol js/ai.js :: duelTarget
  - test tests/ai-rules.test.mjs :: challenger: eligible weak apex is dueled instead of fled from
  - test tests/ai-rules.test.mjs :: challenger: ineligible apex still triggers normal flee
  - test tests/ai-rules.test.mjs :: challenger: any other big threat still wins over the duel
  - test tests/ai-rules.test.mjs :: challenger: personality gates are kept

### R-AI-004 · 회복 상태
- 규칙: 체력 30% 이하에서 새 교전·위험 감수를 중단하고 안전한 먹이만 섭취하며 회복하고, 60% 이상이면 정상 선택으로 복귀한다. 이미 시작된 공격·회피는 기존 상태 흐름을 따른다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 005
- 확인:
  - code js/ai.js :: ai\.recovering=hp<=\.3 \|\| \(ai\.recovering && hp<\.6\)
  - test tests/ecology.test.mjs :: prey can select ordinary hunting when resources permit and critical health enters recovery

### R-AI-005 · 위협 정의와 안전 거리
- 규칙: 위협은 일반 감지 안에서 자기 크기의 1.2배 이상인 다른 색 개체다. 안전한 성장 대상은 감지된 위협과 중심 거리 160 이상 떨어져 있어야 한다. 실제 흡수 연결은 같은 색이어도 도주 대상이다. 감지되지 않은 위협까지 안전을 보장하지는 않는다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 005
- 확인:
  - code js/ai.js :: e\.size>=ai\.size\*1\.2
  - code js/ai.js :: dist\(e,t\)>=160

### R-AI-006 · 리스크 회피형의 흡수 조건
- 규칙: 리스크 회피형 AI의 능동 동족 흡수 대상은 프레이에서 자기 크기의 0.7배 이하, 포레이저·프레데터에서 0.8배 이하이며 안전한 위치여야 한다. 중앙 흡수 가능 판정이나 우연한 근접 흡수는 금지하지 않는다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 005
- 확인:
  - code js/ai.js :: e\.size<=ai\.size\*\(ai\.role==='prey'\?\.7:\.8\)
- 변경 이력: 전용 테스트 없음(코드 확인만).

### R-AI-007 · 기회주의형 막타
- 규칙: 기회주의형은 공격 가능·체력 60% 이상·상대 크기 1.2배 이하·상대 공격 후딜 중·현재 공격 범위 안·무적 아님을 모두 만족하고 상대 HP가 현재 공격 피해(방어·최소 피해 보정 후) 이하일 때 막타를 한 번 시도한다. 범위 밖 추격은 없고 체력 50% 이하나 가까운 큰 위협이 있으면 개입하지 않고 철수·회복한다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 005
- 확인:
  - code js/ai.js :: e\.attackState==='RECOVERY'
  - test tests/ai-rules.test.mjs :: healthy prey exploit recovery of larger grown threats, but low health still flees

### R-AI-008 · 프레데터 관계 유형의 동행·관찰
- 규칙: 종속형은 같은 색 최상위의 **영역 반경 안**에서 그 주변을 따라가고(기본 목표 거리 max(450, 흡수 유지거리+80), 필요한 안전거리가 영역 반경을 넘으면 포기), 도전형은 다른 색 최상위 주변에서 탐색하며, 독립형은 최상위를 목적지로 삼지 않고 먹이·사냥·성격 행동을 쓴다. 생존·실제 성장/전투 기회가 관계 이동보다 우선하고 일반 전투 감지 320은 확대하지 않는다. 대상 사망·직위 상실·영역 이탈 시 해제한다.
- 상태: 승인
- 출처: 사용자 승인 2026-10-02 · 제안 004
- 확인:
  - code js/ai.js :: desired=ai\.relationship==='subordinate'\?Math\.max\(450,gap\):450
  - code js/ai.js :: dist\(ai,e\)<=apexTerritoryRadius\(e,balance\)
  - code js/ecology.js :: r<\.4\?'subordinate':r<\.7\?'challenger':'independent'
- 변경 이력: 관계 감지·동행 거리가 고정 600/450~600(제안 004)에서 **최상위 영역 반경(Size 비례, R-ABIL-012)** 기준으로 바뀌었다. 영역 반경이 100 크기에서 900이므로 실질 범위가 넓어졌다.

### R-AI-009 · 모든 역할의 일반 교전 (프레이 금지 대체)
- 규칙: 프레이를 포함한 모든 역할이 비슷한 크기의 상대와 교전할 수 있다. 공격 스택이 없거나 체력이 임계 이하이면 생존 행동이 우선한다. 신중형(리스크 회피)도 안전한 위치에서 비슷한 적을 상대한다. 큰 위협에게는 몸을 붙이지 않고 거리를 벌린다.
- 상태: 승인
- 출처: 사용자 요청 → 사용자 추인 2026-10-04 · M38 · M59 · M4 Unit 3
- 확인:
  - test tests/group-combat.test.mjs :: all roles engage similar enemies while empty stacks and critical HP preserve survival
  - test tests/ai-rules.test.mjs :: cautious prey can engage similar enemies in sensing range
- 변경 이력: **승인된 "프레이의 일반 능동 사냥 금지(제안 005)"를 대체.** 일반 사냥 크기 조건(0.8배)은 포식 대상 선택에 남아 있다.

### R-AI-010 · 실제 공격자 우선 반격
- 규칙: 공격받으면 판단 타이머를즉시 초기화하고6초 기억한다. 생존·지형 회피 이후 실제 공격자를 일반 먹이·다른전투 목표보다 우선한다. HP30%이하·공격불가·큰위협의 생존 선택은 유지한다. 감지에 두 몸 반지름을 포함한다.
- 상태: 제안
- 출처: 사용자 요청 2026-10-05 · M79
- 확인:
  - config ai.retaliationSeconds = 6
  - test tests/m79-systems.test.mjs :: R-AI-010 struck AI
- 변경 이력: M79 신규 카드. 세부 초기 수치는 미승인 변경(M79), 플레이 피드백으로 재조정한다.

### R-AI-011 · 고가치 처치 보상 회수
- 규칙: 생존·지형 회피·실제 공격자 대응 뒤, 감지 범위의 안전한 고가치 처치 먹이는 일반 교전/이동보다 먼저 회수한다. 먹을 수 없는 크기의 보상은 선택하지 않는다. 가치/거리 평가와 기존 80 고가치 기준·감지 범위를 유지한다.
- 상태: 승인
- 출처: 사용자 직접 지시 2026-10-06. 일반 교전 선행으로 회수 우선순위가 밀리는 원인 확인.
- 확인:
  - test tests/ai-rules.test.mjs :: safe valuable death rewards interrupt optional fighting but never override survival

### R-AI-012 · 기본 풀차징 공격
- 규칙: 거리와 무관하게 기본 풀차징, 흡수 탈출·HP30%이하 도주·표면거리60이내 적 돌진만 최소 충전0.3 허용. 기존 거리별 AI 충전 규칙 대체.
- 상태: 승인
- 출처: 사용자 직접 지시2026-10-06
- 확인:
  - test tests/charge-weather-risk.test.mjs :: AI prefers full charge and only shortens for incoming contact strikes
