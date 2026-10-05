# 표현 규칙 (VIS)

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
