# 조작·화면 규칙 (CTRL)

도메인 규칙 카드. 형식은 `README.md`. 근거: `00_기준/구현추인/cloud-spec-2fd3bd8/GAME_DESIGN.md`(M 번호가 클수록 우선). 승인: 사용자 2026-10-04 "구현 초과는 플레이해 보고 구현한 것이니 승인". 모바일 조작은 대부분 사용자의 실기기 플레이 요청으로 반복 조정되었다.

### R-CTRL-001 · 모바일 터치 조작
- 규칙: 모바일은 가로 화면을 중심으로 설계한다. 왼쪽 절반에서 시작한 터치는 이동(시작 위치의 플로팅 조이스틱, 조이스틱 144px·손잡이 64px, 드래그 48px가 최대 입력), 오른쪽 절반에서 시작하면 공격 조준·충전이며 시작한 쪽으로 역할이 고정된다. 이동 중에는 화면 어느 쪽 추가 터치도 공격을 시작한다. 공격 최초 조준은 캐릭터에서 터치 지점을 향하고 8px 이상 드래그하면 드래그 방향으로 바뀐다. 회피는 84px 주 버튼(드래그하면 지정 방향, 아니면 보는 방향), 공격은 48px 보조 상태 표시이며 공격·회피·E/R·흡수·달리기 버튼은 유지한다. 조준은 캐릭터 중심의 흰색 화살표로 표시한다. 취소·일시정지·회전·창 전환은 발사 없이 입력을 초기화한다. R은 누른 채 조준하고 떼면 그 지점에 시전한다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M10 · M31 · M32 · M49 · M65 · M66 · M69
- 확인:
  - test tests/touch-movement.test.mjs :: analog touch input scales movement; keyboard diagonals and mixed input never exceed base speed
  - test tests/touch-movement.test.mjs :: released R keeps its captured direction and world point, consumes once, and cannot buffer through freezing
  - test tests/sprint-food-lava.test.mjs :: movement drives default facing; explicit drag overrides it and a tap dodge follows facing
  - test tests/mobile-feedback-render.test.mjs :: mobile charge feedback follows combat availability and reads recharge timers without mutation
  - test tests/mobile-feedback-render.test.mjs :: mobile feedback distinguishes unlock, peace, pause and special cooldown
- 변경 이력: M10 공격 유지·즉시 회피 → M31 손을 떼는 방식 → M65 화면 분할·충전 공격 → M69 회피 주 버튼·이동 중 어디서나 공격. 기본 시선·조준은 이동 방향과 같고 드래그가 우선한다(M66).

### R-CTRL-002 · 일시정지와 입력 보호
- 규칙: ESC·P·버튼으로 일시정지하고 창 이탈·탭 숨김에서는 자동 정지하며 입력을 비운다. 정지·안내·초기화 확인 중에는 시뮬레이션과 흡수 지속음이 멈추고 실제 흡수 재개 때만 다시 시작한다. 일반 일시정지·창 전환 정지는 화면 터치/좌클릭 후 떼면 재개하며 그 입력은 전투 입력으로 소비하지 않는다(도움말·초기화 확인·이름/색 선택은 터치로 해제되지 않는다).
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M9 · M13 · M35 · M58
- 확인:
  - test tests/pause-audio.test.mjs :: paused updates stop continuous audio exactly once without progressing the world
  - test tests/pause-audio.test.mjs :: absorption audio restarts once after resume and stale audio is cleared on reset

### R-CTRL-003 · 최소/전체 UI와 관찰 패널
- 규칙: 최소 UI는 모바일 기본, 웹은 U 키·버튼으로 전환하며 선택을 저장한다. 최소에도 HP·LIFE·Era 배지·일시정지와 이동/공격/회피/E 조작은 유지한다. F1 밸런싱·F2 인스펙터·F3 라벨(새 게임 기본 OFF)·F4 생태계 패널·F5 미니맵(기본 OFF)을 제공하며 패널은 제목줄 드래그로 이동한다. 캐릭터 위 표시 줄 순서는 체력 → E/R 준비 → AI 상태/성격 → 역할/관계 → 이름이며 화면 픽셀 간격으로 겹치지 않는다. 관찰 표시는 게임 상태·난수를 바꾸지 않는다.
- 상태: 승인
- 출처: 사용자 요청 2026-10-03 → 사용자 추인 2026-10-04 · M11 · M12 · M31 · M38 · M48 · M61 · M67
- 확인:
  - test tests/charge-weather-risk.test.mjs :: debug AI labels default off on each new run
  - test tests/mobile-feedback-render.test.mjs :: skill readiness and debug role/state occupy separate screen rows at low and high zoom without mutation or RNG
- 변경 이력: 사용자 요청(상태·성격 라벨, AI 인스펙터)이 F2/F3로 먼저 구현되었고 이후 F3 기본 OFF로 정리됨.

### R-CTRL-004 · 고정 최신 플레이 링크
- 규칙: `play.html`은 새로고침마다 개발 브랜치의 최신 커밋을 확인하고 해당 게임을 같은 페이지 안에 불러온다. 공개 NEXT 사이트와는 별개이며 메인 공개를 대체하지 않는다.
- 상태: 승인
- 출처: 사용자 추인 2026-10-04 · M72
- 확인:
  - file play.html
