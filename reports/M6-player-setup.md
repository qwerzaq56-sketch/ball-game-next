# NEXT M6 — 플레이어 선택과 별도 크기 순위

2026-10-03. 사용자 요청: 시작 때 색상과 내 이름 선택. 점수/크기 관계에 대해서는 후속 답변의 **현재 규칙 유지하고 크기 순위를 별도로 표시**를 적용했다.

## 변경

- 시작 modal에서 이름(최대 16 Unicode code points)과 파랑/빨강/초록/노랑/하늘 색상 선택. 빈 이름은 ‘나’. 선택은 실제 Player 색상·색상별 능력/동족 판정과 표시 이름에 적용.
- 시작 버튼 전까지 게임 정지. modal의 이름·라디오 입력은 이동·회피·특수능력과 F1–F4 표시 토글로 전파하지 않음. 시작 시 대기 입력을 지움.
- `ballgamenext_player_profile_v1`에 마지막 선택 저장. 손상/접근 불가 시 기본값. 전체 초기화·Game Over의 새 게임은 선택 화면으로 돌아가고, Life 부활은 유지.
- 플레이어 이름을 HUD에서도 표시. 이름은 DOM에 plain text로 렌더링하며 임의 HTML을 실행하지 않음.
- TOP 10에서 점수/크기 순위 전환. 각 행에 양쪽 값 표시, 하단에 선택 기준의 내 순위. 순위 모드는 기존 NEXT 표시 설정 키에 저장.
- 크기는 성장 계산, 점수는 보상 계산, 역할/직위 기준은 변경하지 않음. 점수가 낮지만 큰 개체가 있는 것은 유효한 상태. 순위 전환은 관찰 기능만 바꿈.
- 추가 줄로 길어진 순위 HUD와 생태계 패널이 데스크톱에서 겹치지 않도록 배치 조정. 좁은 화면에서는 기존 스크롤 제한 유지.

## 검증

- `node --test --test-isolation=none`: **77/77 통과**, 실패/스킵 0. 이름 정규화/5색/reset/Life 부활/성장 수치 유지/저장 예외/별도 크기 동점 순위 포함.
- `node tools/browser-player-setup.mjs`: 실제 Chromium에서 시작 전 시간·입력 정지, 다섯 색, 이름/리셋, HTML 문자열의 plain-text 표시, 낮은 점수·큰 크기 fixture의 독립 순위, 새로고침 이름/색/순위 유지, 빈 이름 fallback, Enter 시작, 이동 통과. 1280×720 및 390×844 시작 화면 확인. 페이지 오류·필수 리소스 실패 0.
- `BROWSER_REPORT_PREFIX=/tmp/M6-regression node tools/browser-m5.mjs`: 시작 선택을 포함하도록 기존 회귀 도구 갱신. 이동/TOP 10/Inspector/F1–F4/표시 설정/게임 상태 불변/보유 기록/이름 배치/좁은 화면/음소거/초기화/E-key 삼중 파도 통과. 과거 M5 화면 자료는 그대로 보존.
- `git diff --check` 통과. 화면 자료: `M6-player-setup.png`, `M6-player-setup-mobile.png`, `M6-size-ranking.png`.

성장·점수 수식 및 전투 AI를 변경하지 않아 새 장기 밸런스 조정은 수행하지 않았다. 테스트 브라우저의 좁은 viewport는 화면 배치를 검증하며 실제 휴대폰 터치 조작 검증은 아니다. 작업은 codex/cloud-next-m4에 한정한다. main/통합 브랜치/공개 배포는 변경하지 않는다.

## 후속: 역할·관계 디버깅 시각화

F3에 역할/프레데터 관계와 상태/성격을 두 줄로 표시. 플레이어 역할 포함. 프레이(보라)/포레이저(초록)/프레데터(분홍), 프레데터 관계는 종속/도전/독립. F2 목록·상세도 한글로 통일하고 비프레데터에게 남은 관계 데이터는 표시하지 않음. 이름은 디버그 두 줄 위로 배치.

`node --test --test-isolation=none` **79/79 통과**. 역할 전환 시 관계 숨김 및 실제 draw의 게임 상태/AI 난수 불변 회귀 포함. `node tools/browser-debug-roles.mjs`에서 세 역할/세 관계의 Canvas 표시, F3 토글, F2 상세 통과. 페이지 오류 0. 화면: `M6-debug-roles.png`. `git diff --check` 통과.

## 후속: TOP 10 클릭 동작

사용자 요청에 따라 순위 클릭은 Inspector를 자동으로 켜지 않는다. F2로 열어 둔 상태에서만 해당 AI 상세 정보를 선택한다. 닫힌 상태에서는 기존 선택도 바꾸지 않는다. 툴팁·README·기획서에 반영했다. `BROWSER_REPORT_PREFIX=/tmp/inspector-ranking-regression node tools/browser-m5.mjs`에서 닫힌 상태 클릭/열린 상태 선택과 기존 게임 회귀 전부 통과, 페이지 오류 0.
