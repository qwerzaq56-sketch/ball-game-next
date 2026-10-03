## M76 완료 — 타격·피격 이펙트 강화

접촉점 파편과 충격파, 피격 테두리·보호막 구분·플레이어 가장자리 피드백을 추가했다. 화면 흔들림과 전투 수치 변경 없이 시각 효과만 보강했다. [검증 보고](reports/M76-development.md).

## M75 완료 — 최상위 1대1·스킬 영향력

일반/전쟁 AI 듀얼을 비교하여 범위·피해를 조정했다. 전쟁 확정 승률은 개발 시드 44.4~55.4%, 새 시드 41.5~61.9%. 면적·개체 노출·장악 시간·피해/제어 기반 계수, 크기별 그래프, F1 체감 저장·JSON 내보내기를 추가했다. 최적 불쾌도는 사용자 피드백으로 추후 검증한다. [기획과 공식](APEX_DUEL_INFLUENCE_DESIGN.md), [검증 보고](reports/M75-development.md).

## M74 완료 — 전투 조작과 상태 가시성

상대 전조 방향 숨김, 공격/회피 중 스킬, 모래바람 지정 소환 및 1.2배 반경, 경계 AI 정지 제거, Space 짧게 회피/꾹 달리기, 동상/물속 오버레이, 냉기 장판 기본 후보 롤백, 최상위 동행 가중치를 적용했다. [검증 보고](reports/M74-development.md).

## M73 완료 — 지형 오브젝트 후보 선택

6개 지형에 각각 2개, 총 12개 오브젝트를 기획·구현했다. F1에서 후보 선택과 수치 조정, 기기 저장·JSON 교환·기본값 복구를 제공한다. 전체 테스트 313개와 Chromium 설정/복원 검증 통과. [상세 기획](BIOME_OBJECT_CATALOG_DESIGN.md), [검증 보고](reports/M73-development.md). 전용 장기 통계·오브젝트 탐색 AI·전용 아트는 백로그다.

## M72 완료 — 고정 최신 플레이 링크

`play.html`은 새로고침마다 개발 브랜치 최신SHA를 확인하고 해당 게임을 같은 페이지 안에 불러온다. [고정 링크](https://raw.githack.com/qwerzaq56-sketch/ball-game-next/codex/cloud-next-m4/play.html). Chromium 모의API로 동일URL 새로고침 시 새SHA 전환/실패 재시도 검증 통과. 공개URL 접근은 클라우드 프록시 제한으로 직접 검증하지 못했다.

## M71 완료

흡수성공 중간크기전액복구/비슷한크기90%복구/작은크기3%회복 적용. 진행중위험·실패복구없음·비치명생존선유지.

## M70 완료

먼지장막3배표시/15초/0.8초무적, 최상위모래바람범위75%/틱피해절반 조정. [검증](reports/M70-development.md).

## M69 완료

회피84px 주 버튼/공격48px 보조, 이동 중 화면 양쪽 공격, 최초 터치 지점 조준 구현. [검증](reports/M69-development.md).

## M68 완료

자동 동행5초 신청 토글, 몸을 따라가는 빨강 E 피해 영역/R 집결 기준점 반영.

## M67 완료

노랑 모래바람·빨강 오오라 축소, 가로 화면 채움, 팝업/도구바 이동, 조이스틱 확대/위치 보정 구현. [M67 검증](reports/M67-development.md).

## M66 완료

기본 이동 방향으로 조준, 드래그 지정 방향/탭 시선 방향 회피, 흡수 진행 중 전체비용·성공25%회복으로 변경했다. 기존 완료 충격 피해 제거, 비치명 생존선 유지. [M66 검증](reports/M66-development.md).

## M65 완료

모바일 왼쪽 드래그 플로팅 조이스틱·오른쪽 충전 공격, AI 거리별 충전/흰색 게이지·증가 범위, 냉기 장판5→15초 반영. [M65 검증](reports/M65-development.md).

## M64 완료

하늘색 보호막·지연 폭발/누적 빙결 장판, 최상위 전용 표시와 상대 크기50% 자격, 회피를 쓰는 흡수 탈출, 부드러운 성장 스프링을 구현했다. 이전 하늘색 스킬은 복구 후보로 보존. [M64 검증](reports/M64-development.md).

## M63 완료

Size150 달리기(회피 소진 후 Space/화면 버튼 유지), 용암 몸체 접촉, 기본 공격30% 감소, 초록 E 대열 전체 합치기, 큰 먹이 우선/빠른 회수 구현. 세부 규칙은 최신 기획, 검증은 [M63 보고서](reports/M63-development.md).

## M62 완료

Size300 이상 처치 보상90% 이상을 직경0.9배 반경에 밀집하고, 최대10%만 바깥으로 분산한다. 보상량과 난수 소비 유지. 관련 테스트17개 통과(크기299/300/400/1000/1500, 시드3개 비교 포함).

## M61 완료

최상위 스킬 사용 우선순위, 성장 비례 범위, 충전만으로 준비하는 공격과 거리/피해 연동, 큰 아군 흡수 위험/작은 아군 회복, 이동 모래바람/노랑 저항, 시작 안내/F3 기본OFF/Size 순위/최소 텍스트 순위를 구현했다. **288개 테스트 통과**, 실제 Chromium PC/모바일 화면 검증 통과. [상세 검증](reports/M61-development.md), [통제 스킬 빈도](reports/M61-apex-cadence.json). 이전 기록과 충돌하는 수치는 M61 기획을 따른다.

## M60 완료

PC/모바일흡수토글,외부관찰가능눈보라,노출동상/하늘색·크기저항,물속저속/파랑저항,빨강E장판/R전아군집결·공동공격교체. [멀티플레이기획](MULTIPLAYER_DESIGN.md) 시작. 검증은 [M60보고서](reports/M60-development.md).

## M59 완료

흡수25%진행/75%완료충격·최대HP1%생존선,접촉경계공격/도주,전쟁기80%선언·공격누적20%역참전·복수전쟁·HP10%도주 구현. [전쟁 기획](WAR_STATE_DESIGN.md), [검증 보고](reports/M59-development.md).

## M58 완료

대형 공격 템포·적 경계/반격·몸 표면 감지·청크 렌더 순서·흡수 이탈/HP 비용·영구 초록 R 소환/30초 흡수·ESC 일시정지 구현. 새 [크기별 시각화 기획](SIZE_RISK_RETURN_DESIGN.md), [개발 백로그](DEVELOPMENT_BACKLOG.md). 검증 및 한계는 [M58 보고서](reports/M58-development.md).

# NEXT M57 — 눈보라 성능·충전 공격·흡수 조작·대열 추종·현재 그래프

요청한 UI/직위 표시, 이름 포커스, 눈보라 경량화, 충전 해제 공격, 우클릭/모바일 흡수, 빛나는 동행 선, 자유 추종/회피, 초록 흡수85%, 제안 범위 확대 및 이동 중 전투 전환을 구현했다. 전체256개 테스트와 실제 Chromium PC/다중 터치 검증 통과.6회×10분 시뮬레이션 그래프 제공. [상세 보고](reports/M57-development.md), [전체 그래프](reports/M57-current-balance.png).

# NEXT M56 — 초록 강화·성장 비례 소환·무리 사냥

초록 E 수락80%, 솔로/대열 공격·방어5% 중첩 강화, 크기 비례 랜덤 소환과 공격력 계승/공격자 추적, 대열 연결 여유 확대와 이탈 완화를 구현했다. 전체250개 테스트 및 PC/모바일 Chromium 검증 통과. 통제된 세 시드 전투에서 공동 공격/동행 유지 확인. [상세 보고](reports/M56-development.md).

# NEXT M55 — 몸 크기에 비례하는 스킬 범위와 대형 성장 조정

표시 순서 유지, E/R 실제 범위 크기 비례 확장, 몸 직경 화면 점유42% 제한, 기본 공격 이동 최대600(최상위420), 받는 개체 Size500 이상 성장 보상0.5배를 적용했다. 전체245개 테스트 및 PC/모바일 가로·세로 Chromium 검증 통과. [상세 보고](reports/M55-development.md).

# NEXT M54 — 눈보라·성장 저항·적 반격

눈보라 주변 블러/반투명 그라데이션과 바람 소리, 성장 시 시야 확대, 크기 기반 모래폭풍·용암 피해 감소, 큰 적에게 치고 빠지는 반격 확대를 구현했다. 전체240개 테스트 및 실제 Chromium 검증 통과. [상세 보고](reports/M54-development.md).

# NEXT M53 — 오후7시 개발 전달

E/R 스킬 관찰/프리셋, 성장 기회/실제 획득 그래프, 먹이 보충 오차, 편집 장판 AI, 캐릭터 표시 겹침, 모바일 R 해제 조준과 순간 스킬 실패 진단을 구현·검증했다. 종족15실행 및 성장9실행 완료. 기본 밀도12.5/먹이 배율1은 유지한다. 전체237개 테스트와 실제 Chromium 검증 통과. [전체 전달](reports/M53-evening-handoff.md), [먹이 변인 비교](reports/M51-development.md), [스킬 원인 진단](reports/M52-development.md). codex/cloud-next-m4만 푸시하며 main/통합은 변경하지 않았다.

# NEXT M52 — 순간 스킬 실패 진단과 자연 먹이 보상 변인

순간 냉기/E 파동의 시작·완료 범위, 초기 대상 이탈/상태 변화, 범위 안 무적과 원점 이동을 F1/JSON/그래프에 추가했다. 냉기 시드7 추가 관찰은 기존300초 궤적과 정확히 같았다. 자연 먹이 보상 배율을 F1에 제공하며 기본1로 유지한다. 테스트237개 및 실제 Chromium 검증 통과. [M52 보고서](reports/M52-development.md). 먹이 밀도/보상 분리 비교는 진행 중이다.

# NEXT M50 — 다섯 색 측정과 지원 효과 비교

다섯 시작 색×3시드300초 정상Life15실행과353,750건 상태 검사를 완료했다. 성장·E/R 직접 HP 손실·모집/소환/강화/표식을 밸런스 그래프에서 비교한다. 모든 실행은300초까지 패배 없이 진행됐지만 실제 사용자 체감과 종족별 강약 확정은 하지 않는다. [M50 보고서](reports/M50-development.md). 모래바람/지원 능력과 순간 직접 공격의 효과를 같은 피해 숫자로 판단하지 않는다.

# NEXT M49 — 모바일 R 드래그 조준·해제 시전

R은 누른 채 이동/조준하고 손을 떼면 시전한다. 붉은/노랑 지정 지점과 범위를 미리 표시하고 해제 순간 지점을 보존한다. E 탭, 키보드 E/R과 기존 공격/회피를 유지한다. 테스트234개 및 실제 다중 터치·표식/장판/소환·취소·회전·기존 조작 검증 통과. [M49 보고서](reports/M49-development.md).

# NEXT M48 — 캐릭터 표시 줄 정리

역할/성격과 E/R 준비 표시가 같은 위치에 겹치는 문제를 화면 픽셀 기준 별도 줄로 분리했다. 이름과 체력 바도 같은 기준을 사용하며 F3와 최소 UI 기능을 유지한다. 테스트232개 및 실제 Chromium 가로/세로·줌 검증 통과. [M48 보고서](reports/M48-development.md). 게임 규칙은 바꾸지 않았다.

# NEXT M47 — 편집된 장판 범위를 따르는 AI

모래바람의 진입/회피 유지/대열 전투와 지휘 검사가 실제 장판 반경을 따르도록 수정했다. 기본360+60 규칙은 유지하며 기존 고정 반경으로 인한 편집 불일치를 해결했다. 테스트231개와 기존 E/R·모바일 해제 입력 검증 통과. 종족별15실행은 별도로 진행 중이며 완료 전 결과를 확정하지 않는다. [M47 보고서](reports/M47-development.md).

# NEXT M46 — 먹이 밀도 목표 보충과 정책 비교

먹이가 목표800개보다 지속적으로 적게 유지되는 보충 로직을 수정했다. 같은3시드10분 비교에서 후반 평균625→805개; 플레이어 성장 개선은 시드별로 다르고 후반 병목은 남는다. 정책6종18실행과 세계 먹이/종료 상태 그래프도 연결했다. 테스트228개, 실제 Chromium 보충·그래프와 성능 확인 통과. [M46 보고서](reports/M46-development.md). 기본 스킬/쿨다운과 목표 밀도는 유지한다.

# NEXT M45 — 성장 기회의 경로와 실제 획득 분리

먹이·흡수·사냥 잠재 기회와 최근 실제 성장 기준 달성을 F1/관찰 JSON/밸런스 그래프에 추가했다. 오래된 파일은 미측정으로 표시하며 선택한 자료만 불러오고 실패 시 재시도한다. 테스트227개 및 실제 Chromium 검증 통과. 정상Life3시드10분 측정과 한계는 [M45 보고서](reports/M45-development.md). 먹이 보충량이 목표 밀도 아래에서 평형을 이루는 문제를 다음으로 수정한다.

# NEXT M44 — 스킬 수치·프리셋·실제 범위

F1 스킬 수치/저장/JSON/기본 복구와 스냅샷 판정·표시, 실제 사거리/모집 대상 확인을 구현했다. 테스트221개, 브라우저 프리셋/키·터치/관찰 검증, 정상Life3시드15분 측정 완료. [M44 보고서](reports/M44-development.md). 추가 정책 실험은 진행 중이며 성장 평가의 먹이/사냥/흡수와 실제 성장 분리를 다음으로 진행한다. 지정 브랜치만 변경한다.

# NEXT M43 — E/R 스킬 관찰과 자동 사용

사용자의7시까지 개발 위임에 따라 스킬 사용/효과 관찰·F1/JSON/그래프·자동 E/R 선택·최신 성장 안내를 구현했다. 테스트213개와 실제 Chromium 검증 통과. 정상Life3시드15분 관찰 완료. 상세는 [M43 보고서](reports/M43-development.md). 이후 스킬 수치 편집/저장/복구를 진행한다. 지정 브랜치만 사용한다.

# NEXT M42 — 성장 E / 최상위 R와 스킬 후보 보존

종족별 일반 E(Size100)와 최상위 R, 초록 동족 소환, 캐릭터 준비 표시, Size 연동 영역 및 큰 몸 공격 시간 완화를 구현했다. F1에서 초록 소환 없는 이전 능력을 교체/복구할 수 있다. 전체 세부 규칙과 미적용 구상은 [스킬 후보 기획](SKILL_CATALOG_DESIGN.md)에 보존한다. 검증: 테스트207개, Chromium E/R 키·터치·후보 복구 및 기존 모바일 조작, 3시드 각300초 정상 Life 시뮬레이션 통과. [M42 결과](reports/M42-development.md). 작업/푸시는 codex/cloud-next-m4만 수행한다.

## NEXT M41 — 밸런스 그래프·회수 보상·UI

[밸런스 그래프](balance.html)에서 시간/크기/성향/지역별 크기·기회·위기·실제 HP 손실을 비교합니다. 플레이 시간, 최소 UI 팝업과 순위3단계, 먹이 밀도 보충·후반 성장·Size 기반 사냥 드롭/축적 Growth90% 회수·붉은 공 용암 저항을 적용했습니다. [기획](BALANCING_LAB_DESIGN.md) · [측정과 한계](reports/M41-development.md).

## NEXT M40 — 눈보라 시야·플레이 평가

설원 무늬를 고정하고 정적 안개로 플레이어 시야를 제한했습니다. 실제 지형에 바이옴 이름을 배치하며, F1에서 5초 기준을 수정하고 F1 관찰에서 성장 기회·위기·크기별 성장을 확인합니다. [평가 기획](GAMEPLAY_EVALUATION_DESIGN.md) · [검증 및 현재 밸런스 한계](reports/M40-development.md).

## NEXT M39 — 동행 성향 적용·사냥 지휘·면적 흡수

동행 선호도 기획을 실제 적용했다. Q/버튼으로 능동 제안하고 우정 축제에는 다른 색과도 동행한다. 혼색 대열의 피해/충돌/지시 보호와 종료를 구현했다. 붉은 최상위 능력은 범위 마킹·아군 표적 추적·이동속도/공격 버프이며, 흡수는 상대 면적80%를 이전하고 공격/회피 이후 겹침은 부드럽게 분리한다.

전체 테스트186개와 실제 Chromium Q/혼색/붉은 능력/면적/충돌·모바일 조작 검증 통과. 3시드 각300초 일반 Life 상태 검사 통과. 규칙은 [동행 기획](COMPANION_COMBAT_DESIGN.md)·[전체 기획](GAME_DESIGN.md), 측정과 한계는 [M39 보고서](reports/M39-development.md)를 따른다. 작업 브랜치는 codex/cloud-next-m4만 사용한다.

## NEXT M38 — 대열 전투와 지형 확장

요청한 기능을 `codex/cloud-next-m4`에서 구현했다. 동행 중 공격·회피, 리더 3배 가중의 대열 성격, 집단 전력 도전, 먹이 반격과 공격 빈도, 초록 동행 모집, 기본 최상위 상한 5/F1 설정을 반영했다. 8,000×8,000 초원 기반 셀 지형·눈보라 얼음꽃·용암 강, 몸 접촉 공격 판정과 캡슐 표시·웹 최소 UI(U)를 추가했다. 동행 선호도는 별도 기획 제안이며 실행 규칙에 미반영이다.

검증: 전체 테스트 175/175, 실제 Chromium 데스크톱 설정/단축키·지형·모집 및 모바일 터치(동행 중 화면 드래그 공격 포함) 통과, 페이지 오류 0. 상세와 실행 원자료는 [M38 보고서](reports/M38-development.md), 규칙과 제안은 [대열 기획](COMPANION_COMBAT_DESIGN.md) 및 [바이옴 기획](BIOME_DESIGN.md). 과거 평화 동행/직위 3명/원형 바이옴 규칙보다 M38을 우선한다.

> 최신 M37: 좌우/상하 연결 월드·경계 너머 상호작용·카메라/타일 표시 연속화. 테스트164개·실제 네 경계 통과·3시드5분 검증 완료. reports/M37-development.md.

> 최신 M36: 동행 플레이어 정상 속도·AI 리더 자기 속도·60~100 거리 스프링 대열. 테스트157개 및 기존 동행 브라우저 검증 통과. reports/M36-development.md.

> 최신 M35: 게임 화면 터치/클릭으로 일시정지 재개·재개 터치 무공격. 테스트154개 및 실제 터치/모달 보호 검증 완료. reports/M35-development.md.

> 최신 M34: 최소 UI에도 현재 Era·남은 시간·진행률 표시. 테스트154개 및 네 시대/회전/전환 강조 검증 완료. reports/M34-development.md.

> 최신 M33: 전투 버튼 충전·상태 피드백, 화면 밖 연결선/입자 그리기 최적화. 테스트154개·실제 터치·동일 이미지 성능 비교 통과. reports/M33-development.md.

> 최신 M32: 가로 중심 자동 회전 배치·캐릭터 중심 흰색 조준 화살표. 테스트149개 및 회전/렌더링 좌표/실제 터치 검증 완료. reports/M32-development.md.

> 최신 M31: 모바일 최소 UI 토글·공격/회피/화면 드래그 후 해제 실행. 테스트149개와 실제 터치 검증 완료. reports/M31-development.md.

> 최신 M30: CSV 저장·관찰 JSON 조건 기록·버튼 키보드 충돌 수정. 테스트149개, 실제 다운로드/상태 유지/모바일 검증 완료. 정오 코호트 진행 중. reports/M30-development.md.

> 최신 M29: F1에서 시드 재시작, 취소 보존과 동일 시작 배치 검증. M28 핵심 코드의 정오 실제 브라우저 코호트3개 진행 중. reports/M29-development.md.

> 최신 M28: 자동 탐색 목적지 유지·재방문 회피(local-survival-v2). 테스트147개/브라우저·터치/3시드 일반 Life 비교 완료. 이전 장기 실행은 프로세스 중단으로 partial 기록, 최신 코호트 재개. reports/M28-development.md.

> 최신 M27: Era별 누적 직위/공격/패배 관찰. 테스트145개, 읽기 전용 브라우저/600초 결정론 검증. M25 세 시드 각각1시간 게임 시간 검사624804건 완료. reports/M25-development.md, reports/M27-development.md.

> 최신 M26: Shift 인스펙터 선택의 자동 모드 유지·정지 중 동행 이탈 차단. M25 전선 표시/몸체 테두리 수정. Chromium 통합 검증 완료. reports/M25-development.md, reports/M26-development.md.

> 최신 M24: 성장 후 월드 경계·몸체 간격을 반영한 적 생성 보완. 테스트142개 및 브라우저 생성100회 검증. reports/M24-development.md.

> 최신 M23: 기본OFF 자동 플레이·읽기 전용 성장/생태계 관찰·JSON 저장. 테스트139개, 실제 브라우저/터치, OFF 결정론 동등성, 3시드 자연 Life10분 검증. reports/M23-development.md.

> 최신 M22: 색상 벡터 문양·플레이어 방향·몸체 밖 성장 링. 테스트134개, Chromium/전후 생태계 결과 동일. reports/M22-development.md.

> 최신 M21: 초원·사막·유물3종. 테스트133개·실제 터치 검증·2시드15분 활성 시뮬레이션 통과. reports/M21-development.md.

> 최신 M20: Era·전선 이동·결투 관찰·파멸 조우. 단위 테스트126개, 브라우저/3시드20분 검증. 상세 한계: reports/M20-development.md.

> 최신 M19: 분산 4바이옴·지역 조우·눈보라 감지·마그마 우회 및 명령 이동 유지. 단위 테스트 118개와 브라우저/활성 시뮬레이션 검증 통과. reports/M19-development.md.

> 최신 M18: 지속 탐색 목적지·F2 목적지 표시. 111개 테스트와 실제 브라우저 검증 통과. 전후 지표 및 한계: reports/M18-development.md.

> 최신 M17: 장시간 로그 제한·총계 유지·가짜 시작 상실 로그 수정. 단위 테스트 108개, 실제 브라우저 5분 검증 통과. reports/M17-development.md.

> 최신 M16: 큰 공 공간 검색 최적화, 테스트 106개 및 전후 결정론 검증. [보고서](reports/M16-development.md). M15 장시간 브라우저 검증은 진행 중.

# CLOUD M4 report

> 최신 M14: 성장 목표·초기 성장 일관성·동적 스택 보정. [보고서](reports/M14-development.md).

> 최신 M13: 창 이탈 자동 정지·흡수 지속음 정리. [보고서](reports/M13-development.md).

> 최신 M12: 선택형 미니맵·F5·터치 능력 피드백. [보고서](reports/M12-development.md).

> 최신 M11: 생태계 역할·동행 현황·F2 구성원·터치 드래그 조준 및 장시간 검증. [보고서](reports/M11-development.md).

> 최신 M10: 터치 조이스틱·다중 터치 전투·가로 화면 HUD. [검증 보고서](reports/M10-development.md).

> 최신 M9: 대열 안정화·P 일시정지·H 플레이 안내·동행 HUD 및 설정 저장. [검증 보고서](reports/M9-development.md).

> 최신 M8: 아군 대열 동행·apex 최대 3명·모래바람 강화 구현. 현재 기획과 검증은 GAME_DESIGN.md M8 및 reports/M8-development.md를 참고.

> 최신 M7: 사용자 지시에 따라 apex 직위를 크기 기준으로 변경. 아군 연결은 ALLY_CHAIN_DESIGN.md 기획만 작성했다. 아래 점수 기준/변경 미승인 기록은 과거 상태이며, 현재 규칙은 GAME_DESIGN.md M7을 따른다.

> 최신 M6: 플레이어 이름/색상 선택 및 별도 크기 순위 구현. 현재 규칙 유지 결정과 검증 결과는 [reports/M6-player-setup.md](reports/M6-player-setup.md) 참고.

> M5 후속 개발: 이름·실시간 순위·생태계 패널·삼중 파도 구현 및 검증 결과는 [reports/M5-development.md](reports/M5-development.md)를 참고. 아래 제안/푸시 상태는 당시 기록이며 현재 구현·브랜치 전달 상태와 구분한다.

> 2026-10-03 사용자 기획 갱신: 아래 M4 기록의 “apex 점유량 감소 = guardrail 실패” 판단은 더 이상 적용하지 않는다. 목표는 희소·빈번한 교체·장기 독점이 시기별로 다양하게 나타나는 생태계다. 기존 수치는 역사적 측정으로 보존한다. 새 평가 기준은 GAME_DESIGN.md의 NEXT 절과 reports/apex-diversity.md를 참고한다.

Base: `feat/integrate-cloud-m3` at `8c88808`; working branch: `codex/cloud-next-m4`.

## Unit 1 — make the 300-second comparison trustworthy

Changed `tools/behavior-metrics.mjs`: maintaining player HP/alive alone did not prevent absorption defeats from exhausting lives and pausing the simulation. Restore pause/lives each measurement frame and report actual simulated seconds. This affects the measurement harness only; gameplay rules are unchanged.

`node --test`: 46/46 passed. Seed 11 / 300 seconds before and after this fix has identical baseline results: attacks per 30s `[21,25,51,41,61,72,41,60,50,78]` (500 total), state changes p50 1.01 / p90 1.80 / max 2.53, search↔flee 10226, apex samples 306 (176 not largest). Actual corrected simulation time: 300s. Experimental tuning runs that stopped on player game over were discarded.

## Unit 2 — flee hysteresis and absorption escape

Changed `js/ai.js`, `tests/ai-rules.test.mjs`: keep threat detection/entry at approved 320, release a remembered threat at 360; retain sand-field escape to 280 (entry 220); after an absorption grab breaks, keep escaping until maintain distance + 80, unless absorber dies or can no longer absorb. No minimum timer is needed. New regression coverage checks each release condition. Existing role, personality, risk-taking, duel, survival and retaliation tests remain unchanged.

Seed 11 / 300s: attacks `[33,36,55,46,74,79,66,31,47,65]`, total **532** vs 500; p50 **0.37**, p90 **0.61**, max **1.02** vs 1.01/1.80/2.53; search↔flee **3364** vs 10226 (**67.1% fewer**); apex samples **304** vs 306, not-largest 146 vs 176. Proposed p90 and transition targets pass. Apex occupancy is 0.65% lower on this single seed, so the literal no-decrease condition is not claimed for this unit; assess final combined result and other seeds. Population remains 65–79. `node --test`: **50/50 pass**.

No new random calls were introduced. Changed decisions alter subsequent existing `ai` stream consumption (movement/dodge choices), so the world trajectories diverge; exact bucket-by-bucket nondecrease is not guaranteed. Initial alternatives with 400 release and/or hold timers were rejected for poorer results. Changing entry to 160 was rejected because it breaks existing approved survival tests.

## Unit 3 — reactive contact defense

Changed `js/ai.js`, `tests/ai-rules.test.mjs`: an equal/smaller hostile already within body radii + 40 (capped at 160) triggers attack if HP>30%, attack ready and in reach, otherwise escape. This is after survival/command/retaliation, applies to cautious AI only at safe target positions, and does not authorize distant prey hunting. Personality distribution stays **34/33/33**.

Seed 11 / 300s, vs unit 2: attacks `[40,69,68,85,59,59,61,75,40,68]` = **624** vs 532 (baseline 500); p50/p90/max **0.45/0.65/1.32** vs 0.37/0.61/1.02; search↔flee **3731** vs 3364 (baseline 10226, **63.5% reduction**); apex occupancy **268** vs 304 (baseline 306), not-largest 122. Population 67–79. `node --test`: **52/52 pass**. State stability targets still pass, attack total improves 24.8% over baseline. Apex occupancy drops 12.4%; this is explicitly an unmet no-degradation guardrail, not hidden by improved attacks. The title rule is unchanged; more contact combat changes who survives/grows. Further title/ecology balancing requires a separate decision, and no title criteria were changed.

## Unit 4 — combined tuning and search-distance proposals

Changed `js/ai.js`, `tests/ai-rules.test.mjs`, `tools/behavior-metrics.mjs`: final remembered-threat release is **400** (entry remains 320); contact radius remains body radii + 40 capped at 160. Compared with unit 3, seed 11 attacks **625** vs 624, p50/p90/max **0.37/0.59/1.31** vs 0.45/0.65/1.32, search↔flee **3173** vs 3731, apex occupancy **300** vs 268. `node --test`: **52/52 pass**. Final attacks per 30s `[24,66,61,76,42,69,47,80,88,72]`; final population 65–79. Compared with original, switches are down **69.0%**, total attacks up **25%**, and p90 is below 1.0. Individual attack buckets may fall; no claim of bucket-by-bucket improvement.

Additional 300s seeds (fixed harness for both sides):

| Seed | Attacks baseline → final | p90 baseline → final | search↔flee baseline → final | Apex occupancy baseline → final |
|---|---|---|---|---|
| 7 | 488 → 664 | 1.96 → 0.60 | 11469 → 3019 | 350 → 354 |
| 11 | 500 → 625 | 1.80 → 0.59 | 10226 → 3173 | 306 → 300 |
| 23 | 441 → 647 | 1.89 → 0.59 | 10280 → 3064 | 600 → 252 |

**Remaining guardrail failure:** state and attack targets improve consistently, but apex occupancy does not: seed 23 falls substantially. Changes are supplied on the work branch for review, not declared ready for public deployment. Do not merge without deciding whether reduced apex occupancy is acceptable or requires more tuning. No unsupported changes to title eligibility were made. All production random changes remain indirect consumption changes from different decisions; visuals consume no RNG.

### Proposal: search range (not applied)

The metric tool accepts `[seed] [seconds] [detection=320] [wanderScale=1]`. Wander scale multiplies newly selected wander segments in the measurement harness only; it approximates longer exploration, not a new production destination planner.

| seed 11, 300s | attacks | p90 | search↔flee | apex occupancy |
|---|---|---|---|---|
| final default 320/1 | 625 | 0.59 | 3173 | 300 |
| sensing 480/1 | 744 | 0.84 | 3485 | 292 |
| wander duration 320/2 | 635 | 0.60 | 3276 | 116 |

Neither alternative improves transition stability vs the final default. **Proposal:** retain 320 for now. If broader exploration is desired, compare directed safe-food destinations against these two simple alternatives across more seeds before approval. Increasing sensing alone improves attacks but introduces more threat/food oscillation; doubling wander duration strongly reduces apex occupancy. Production config is unchanged.

## Unit 5 — ability activation visibility

Changed `js/abilities.js`, `tests/abilities.test.mjs`: each completed ability displays a 0.75s filled/outlined cast area, origin pulse, and short ability name. The origin remains where the caster fired, including remote yellow fields; labels remain screen-scaled with a dark outline. Existing windup, wave projectile and persistent sand area remain. No title explanation banner/icon was added. Flashes are presentation records, expire independently, and consume no RNG.

`node --test`: **53/53 pass**, including unchanged existing damage/cooldown assertions and flash expiry/origin coverage. Seed 11/300s metrics are **identical before/after the visual change**: attacks 625, p90 0.59, search↔flee 3173, apex 300. `node tools/review-scenarios.mjs`: both approved risk-hysteresis and challenger cases match expected states. `git diff --check`: clean.

Actual headless Chromium browser: keyboard movement, F1 panel, F2/F3 inputs, mute toggle, confirmed full reset, and rendering all five completed ability flashes passed with no page errors. A screenshot of cyan activation was inspected: the filled cone, origin ring, and outlined Korean name are readable at 1280×720 after closing the inspector. Browser casting tests force apex/cooldown in a fixture; a full manual session attaining apex organically was **not** performed. Debug simulation/RNG purity is covered by the existing test suite, not inferred from pressing the keys. Long play balance and other zoom/font/platform combinations remain unverified.

## Proposals requiring user decisions — no implementation

1. **Blue three-direction waves:** propose one aimed center wave and two directions at independently sampled offsets in [-120°, -40°] and [40°, 120°], using `random('ai')` twice at cast start and storing all directions for three identical windup rectangles. Keep 0.6s windup and 10s cooldown **per cast**, 0.5× normal attack damage per target maximum **across all three waves**, shared hit registry and unchanged 120 knockback/immunity. This gives readable separated lanes without triple overlapping burst damage. Approval is required for direction interpretation, damage and cooldown; no three-wave logic has been installed. Two extra `ai` random draws would intentionally change stream consumption if approved.
2. **Personality ratios:** retain 34/33/33. The contact-defense results show cautious prey can answer immediate contact without changing birth distribution. A later proposal reducing cautious share should first include an explicit 34/33/33 → candidate experiment, survivorship and attack/transition/apex measurements; no unmeasured ratio is recommended.
3. **Title criterion:** retain score top 5 with size≥100. Proposal options: size top 5 with size≥100, or score top 5 plus explicit displayed explanation of size eligibility. Size ordering would reward survival/growth over fighting score and can increase same-color absorption dominance; request a decision before implementing. No title explanation UI was added.
4. **Names/ranking HUD:** proposal: stable seeded names assigned once at birth, visible for current top 20 score units; compact top 10 score HUD with apex mark on eligible rows, player row pinned only if requested. Resolve score vs size name cutoff, screen placement and collision/occlusion before implementation. Names must use a separate presentation stream and F2/F3 must not create them on toggle.
5. **Larger world:** proposal: 6000×6000 (1.44× area), scale nominal AI/orb population caps and spawn density by area; first benchmark frame time and attack/contact rate. This increases simulation cost and may reduce encounters if populations are not scaled. Do not change only map size silently.
6. **Wraparound world:** proposal requires toroidal minimum-image distances everywhere (grid queries, collision, absorption, threats, abilities, waves, camera and overlays), seam rendering, and tests for casts/absorptions across seams. Wrapping entity coordinates alone is insufficient. Resolve camera tracking and projectile crossing policy first.

## Final handoff

Work is confined to `codex/cloud-next-m4`; no main/integration push or merge, and the original public `ball-game` repository was not read or modified during this work. Final release distance is 400, generic sensing remains 320, absorption search remains 400, roles/title/ratios/world size and damage/cooldowns remain unchanged. AI stability/attack goals are demonstrated; **apex occupancy guardrail remains unresolved** across seeds, so public deployment is not recommended yet. All deferred proposals above are explicitly unimplemented. No new dependencies are required for the static application or `node --test`; browser automation dependencies were installed outside the repository for validation only.

### Delivery status

Local checkout: `/workspace/ball-game-next`, branch `codex/cloud-next-m4`. Pushing only this branch was attempted. Default HTTPS Git requested authentication; retry with the existing injected GH_TOKEN binding returned **HTTP 401**. The remote work branch is absent; push is **not complete**. No token value was printed or persisted. A verified full-history Git bundle is supplied at `/workspace/cloud-next-m4.bundle` so the work is recoverable without write credentials. Import on a local machine with `git fetch /path/to/cloud-next-m4.bundle codex/cloud-next-m4:codex/cloud-next-m4`, inspect/switch that branch, then push only `codex/cloud-next-m4` using authorized local GitHub authentication. Main and integration branches remain untouched. Restoring valid cloud GitHub write access is the alternative to local import.
