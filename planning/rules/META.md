# 측정·도구 규칙 (META)

도메인 규칙 카드. 형식은 `README.md`. 측정·관찰 기능은 읽기 전용이며 시뮬레이션·난수를 바꾸지 않는다. 승인: 사용자 2026-10-04 "구현 초과는 플레이해 보고 구현한 것이니 승인".

### R-META-001 · 밸런스 그래프와 체감 기록
- 규칙: `balance.html`에서 시간·크기·성향·지역별 크기·기회·위기·실제 HP 손실을 비교한다(크기 구간 20~39에서 1500+까지). 평균 진행 시간·개체·초(관찰 시간 합)·최초 도달 시간은 서로 다른 값이다. 표본 없는 구간은 빈 값으로 표시하며 파일을 선택해 과거 데이터와 비교하고 F1 체감을 저장·JSON으로 내보낸다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M41 · M45 · M57 · M75
- 확인:
  - file balance.html
  - file js/balanceDashboard.js
  - file js/balanceMetrics.js

### R-META-002 · 플레이 평가 기준
- 규칙: 목적 탐색 중 성장 기회와 위기가 5초에 한 번 정도 제공되는지를 평가한다(`evaluation.encounterSeconds`). 성장 기회는 감지 범위 안에서 위험을 피해 먹을 수 있는 먹이 묶음(반경 120)이며 "충분한 성장"은 직경 +0.5 또는 현재 직경의 +1% 중 큰 값이다. 평가는 읽기 전용이고 목표 미충족을 숨기려고 문턱을 낮추지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M40
- 확인:
  - config evaluation.encounterSeconds = 5
  - config evaluation.minimumSizeGain = 0.5
  - config evaluation.minimumGrowthRatio = 0.01
  - config evaluation.clusterRadius = 120
  - test tests/blizzard-evaluation.test.mjs :: opportunity assessment is read-only, uses attainable clusters and accounts for nearby danger
  - test tests/blizzard-evaluation.test.mjs :: continuous opportunity counts as covered windows; missing encounters are retained, not dropped

### R-META-003 · 자동 플레이(실험)
- 규칙: 자동 플레이는 F1의 별도 실험 기능이며 새 런마다 기본 OFF다. 켜면 플레이어 이동·조준·공격·회피·E/R 입력을 대신하되 Life·피해·흡수·해금·쿨다운은 그대로 따른다. 체력·생명을 자동 보충하지 않고 Game Over에서 멈춘다. 직접 입력이나 화면 터치로 즉시 수동으로 돌아오고, 일시정지도 자동 플레이를 멈춘다. 정책은 위협 회피 우선, 안전한 먹이·유물 선택, 감지 밖 정보 비사용이다. 최적 전략이나 사람의 재미를 의미하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M23 · M28
- 확인:
  - test tests/autoplay-metrics.test.mjs :: autoplay defaults off, chooses local food and escapes threats without extra RNG
  - test tests/autoplay-metrics.test.mjs :: autoplay uses ordinary lives and produces no action at game over
  - test tests/autoplay-metrics.test.mjs :: autoplay explores new space instead of repeating the same empty-world square

### R-META-004 · 관찰 기록과 지표 도구
- 규칙: 읽기 전용 관찰기는 매초 점수·크기·체력·역할·직위·동행·지역·시기·유물과 공격 시작을 기록하고 최근 600샘플(10분)을 보관하되 누적 시간·횟수는 유지한다. 최상위 생태 다양성(`apex.dynamics`)과 상태 변경·공격 수·search↔flee 전환을 `tools/behavior-metrics.mjs`로 비교한다. JSON/CSV로 내보낼 수 있다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M23 · M27 · M30 · v0.25 지표
- 확인:
  - file tools/behavior-metrics.mjs
  - code tools/behavior-metrics.mjs :: dynamics
  - test tests/autoplay-metrics.test.mjs :: observer samples once per second, keeps 600 rows and lifetime totals survive truncation
  - test tests/autoplay-metrics.test.mjs :: read-only export cannot mutate simulation/RNG and makes independent nested samples
  - test tests/runtime-events.test.mjs :: normal sessions bound raw events while lifetime special totals and apex history survive

### R-META-005 · 빈 공격 검색과 반복 해제 최적화
- 규칙: 공격 접촉 판정이 없는 READY/TELEGRAPH/RECOVERY에는 공격 대상 검색을 건너뛴다. 최대 몸 반경은 spatial grid 재구성 때 한번 산출해 AI 감지와 공격검색에서 공유한다. 사망 능력해제는 생애당 한번 처리한다.
- 상태: 제안
- 출처: 사용자 요청 2026-10-05 · M79
- 확인:
  - symbol js/game.js :: hostileTargetsFor
  - test tests/m79-systems.test.mjs :: R-META-005 idle attacks
- 변경 이력: M79 신규 카드. 세부 초기 수치는 미승인 변경(M79), 플레이 피드백으로 재조정한다.
