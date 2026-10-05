# 표현 규칙 (VIS)

### R-VIS-006 · 승인 공·지형 아트 팩 연결
- 규칙: 전투 몸체는 승인된 평면 색 면·얇은 윤곽·절제된 내부 아래 음영을 사용한다. 기존 종족 문양/직위/피격 표식은 유지한다. 지형6종 SVG는 한번 렌더/캐시하고 좌표 기반 변형과 경계 합성을 사용한다. 자산 실패/아트 OFF는 기존 단색 폴백. 실제 크기·판정·게임 난수는 바꾸지 않는다.
- 상태: 승인
- 출처: 사용자 2026-10-05 공·T2 승인, 전체 컨셉 구현 진행 승인 및 실제 리소스 반영 허용(2026-10-06)
- 확인:
  - symbol js/vectorArt.js :: drawMatteBody
  - file assets/terrain/manifest.json
  - symbol js/terrainArt.js :: TerrainArt
  - test tests/matte-body.test.mjs :: R-VIS-001 matte body keeps exact silhouette
  - test tests/terrain-art.test.mjs :: R-VIS-006 terrain variant remains stable
  - test tests/terrain-art.test.mjs :: R-VIS-006 terrain loading/off states preserve original fallback
- 변경 이력: 야간 첫 연결본. 경계 페더링과 단순 패턴은 원화 유기적 형태 개선·코너/토러스 추가 검증을 이어간다.

도메인 규칙 카드. 형식은 `README.md`. 표현은 게임 상태·난수·판정을 바꾸지 않는다(실제 몸은 항상 size/2). 승인: 사용자 2026-10-04 "구현 초과는 플레이해 보고 구현한 것이니 승인". 지형 아트 리소스는 `03_아트/29_지형_리소스_요청_팩.md`(미제작).

### R-VIS-001 · 색별 벡터 문양과 성장 링
- 규칙: 전투 개체에 색별 벡터 문양(하늘색·파랑·초록·빨강·노랑 각각 다른 도형)을 그리고, 플레이어에는 방향 화살표를 둔다. 성장은 몸체 밖 링으로 표시한다. 장식이 몸 윤곽선을 대체하지 않는다. 표현은 난수·전투를 바꾸지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M22
- 확인:
  - symbol js/vectorArt.js :: drawSpeciesMark
  - test tests/vector-art.test.mjs :: vector overlays preserve entity state and RNG while growth uses an outside ring
  - test tests/vector-art.test.mjs :: actual entity drawing keeps the body outline when decorative helpers replace Canvas paths

### R-VIS-002 · 최상위 표시
- 규칙: 최상위는 금색 테두리·주변 보석 6개·왕관으로 표시하고(화면 픽셀 간격, 영토 원과 분리), 순위 HUD의 ★로 구분한다. 직위 설명 배너·아이콘은 두지 않는다(설명 최소화). 영토 원은 크기에 비례해 커진다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M57 · 사용자 방향 "최상위 설명 최소화"
- 확인:
  - test tests/presentation.test.mjs :: apex history distinguishes reacquisition, solo reign and coexisting holders

### R-VIS-003 · 타격·상태 피드백
- 규칙: 타격은 접촉점에서 시작하는 충격파·방향성 파편·짧은 섬광·피격 테두리로 표시하고, 플레이어 피격은 화면 가장자리로 알린다. 보호막 피격은 하늘색, 무적에는 가짜 피격을 그리지 않는다. 지속 피해의 시각 빈도와 파티클 예산은 제한되며 피해는 시각 효과와 독립이다. 동상은 옅은 얼음색, 물속은 파란색 반투명 몸 오버레이이고 둘이 겹치면 동상이 우선이다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M74 · M76
- 확인:
  - test tests/hit-impact.test.mjs :: hit impact starts at body contact and damage is unchanged by visual particles
  - test tests/hit-impact.test.mjs :: repeated terrain damage throttles visuals but continues damage and keeps the particle budget bounded
  - test tests/hit-impact.test.mjs :: blocked shield hit has cyan impact and invulnerability has no fake hit
  - test tests/hit-impact.test.mjs :: impact consumes presentation randomness without changing gameplay random streams

### R-VIS-004 · 오브젝트 이득/위험 표식
- 규칙: 이득 오브젝트는 민트 실선 범위·마름모·`+`와 이름, 이동 환경은 하늘색 반투명 경로와 이동 방향 화살표, 위험은 붉은 점선 범위·삼각형 경고(소용돌이는 나선)로 표시한다. 열기 분출구는 분출 중=붉은색+"분출 중", 휴식 중=회색+"휴식"으로 색만이 아닌 문자로도 구분한다. 흑요석 보호막은 몸 바깥 보라색 잔량 게이지, 바람·흑요석 스택은 몸 아래 숫자로 표시한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M78
- 확인:
  - code js/biomeObjects.js :: 분출 중
  - code js/biomeObjects.js :: 휴식

### R-VIS-005 · 달리기·아군 버프·상태 게이지 아트
- 규칙: 꽃·조개·바람돌·흑요석·열매·피난처에 서로 다른 벡터 실루엣을 사용한다. 달리기는 실제 이동 방향 뒤의 흰색 속도선, 아군 버프는 몸 위 민트 방패 표식으로 구분한다. 지원 스킬 범위는 선을 유지하고 내부 채움을0.02/0.025로 낮춘다. 동상 게이지와 취소 흡수 환급 링을 표시한다. 화면흔들림·대형 blur·게임플레이 난수 소비는 추가하지 않는다.
- 상태: 제안
- 출처: 사용자 요청 2026-10-05 · M79
- 확인:
  - file js/actionArt.js
  - symbol js/actionArt.js :: drawActionArt
  - file reports/M79-action-art.png
- 변경 이력: M79 신규 카드. 세부 초기 수치는 미승인 변경(M79), 플레이 피드백으로 재조정한다.

### R-VIS-007 · 공격 불가 범위 색상
- 규칙: 조준 중 공격 잠금·스택 없음·동결·회피·회복이면 공격 예측 범위를 빨갛게 표시한다. 실행 중 전조/돌진 범위는 기존 표현을 유지한다.
- 상태: 승인
- 출처: 사용자 직접 지시 2026-10-06
- 확인:
  - test tests/vector-art.test.mjs :: attack preview turns red for locked, empty, frozen, dodging and recovering player

### R-VIS-008 · 최소 순위 종족색
- 규칙: 최소 순위표에도 종족색 점을 표시하며 이름/직위/점수 유지.
- 상태: 승인
- 출처: 사용자 직접 요청2026-10-06
- 확인:
  - file css/style.css

## 사용자 표시 정정 · 2026-10-06

작은 캐릭터의 몸 안 종족 문양은 size70이상이며 화면 지름36px이상일 때만 표시(두 조건 필요), 몸색·윤곽·필수 상태·방향 유지. R-VIS-001의 기존 작은몸 문양 표시 조건을 대체. 빨간 공격 예측은 해금된 뒤 스택 부족/RECOVERY에만 표시, 해금전·동결·회피·특수시전 동안은 범위 숨김. R-VIS-007의 '해금전 등 빨강'은 최신 사용자 지시로 대체. 관련렌더4테스트 통과.
