# Ball Game Next: 클라우드 첫 검토 단위

2026-10-03 / 검토 모드 / 색별 특수능력 첫 구현 추가 / 전체 v0.24 구현 완료 아님.

## 접근과 공개본 보존
새 clone에서만 개발했다. 사용자 PC/Claude 작업/로컬 미커밋파일을 읽거나 수정하지 않았다.
원본 remote master는 4e552a6026f35ea46eaf49a46505fa14180294f1.
공개 배포 API의 최신 성공 github-pages 배포 SHA도 동일하고 기존 URL에 연결됨을 확인했다. 공개 index/game.js 해시 일치와 원시 API 증거는 reports/evidence에 남겼다.
개발 브랜치 codex/cloud-next-m0에만 로컬 커밋. 기존 master/Pages/저장 기록 변경 없음. ball-game-next 원격 생성/공개는 하지 않았다.
remote push --dry-run은 인증정보 부재로 실패: could not read Username for https://github.com (terminal prompts disabled). 실제 push는 시도하지 않았다. 동적 pages-build-deployment가 존재하고 Pages 설정은 비인증404라 다른 브랜치 영향까지 완전히 확인하지 못했다.

## 변경 행동
- 새 버전 ballgame_next_* localStorage 키만 읽기/쓰기. 기존 scoreboard/mute 키 삭제·이관 없음. 자산 상대경로, service worker/Cache Storage 미등록.
- seed 기반 world/ai/physics/visual 난수, ID 재설정, 실제 Game.update 고정 1/60 실행기, 1초 스냅샷/설정/코드차이/환경/종료원인.
- 모든 플레이어/AI 공통 점수, HUD/Top10은 player.score 한 번 가산. 플레이어 처치 기존 예외 유지.
- size 순위의 prey/forager/predator와 score 상위5 중 size>=100 직위 분리. 최초 즉시/2초당 두번평가, 사망즉시해제/Life 부활확인. 성격·관계 지속.
- 회복/위협/안전먹이/군집/허용사냥/국소막타/600 관계 접근 초기판단. R600 영역/오오라, 직위 설명배너나 아이콘 없음. 실제 몸체 size/2 유지.
- green 만남별흡수수락 .5 + 중앙시작차단, red 사냥선택1.5, blue 회피후1초반격, yellow 무목표4~6초와 경계재선정, cyan 무목표배회 .385. 기존5색 중 purple→cyan, 종족 moveSpeed/HP/공격스탯 변경 없음.
- 맵보다 큰 viewport의 카메라 중심처리 수정.

## 검증과 측정
node --test 15개 통과, git diff --check 통과. 주요 경계·재현·저장키보존·역할비율·최상위6위제외·부활·성격유지·중앙흡수·종족배회 확인.
정지 플레이어 10시드×최대600초는 기준선/중간/최종 각각 실행했고 모두 game-over 조기종료했다. 기준선 관찰 중앙22.34초(8.55~137.73), 최종 중앙19.36초(7.87~69.53). size100 관찰은 없었다. 생존플레이 개선/악화나 첫직위 목표를 이 결과로 판단할 수 없다.
최종 결과 reports/review-unit-stationary.json/csv. 이전결과도 보존. 최초 기준선 생성 때 untracked 신규 모듈은 git diff에 포함되지 않았으므로 기록된 diff만으로 완전복원은 불가; 5e181ef 커밋을 함께 사용해야 한다. 최종은 ad44996와 기록된 tracked diff로 규칙코드 복원 가능.
단일 Game/JS realm만 난수재현 지원; 병렬 실행은 프로세스별분리 필요. 동일시드라도 기능추가로 RNG소비가 달라져 조건별 동일사건을 보장하지 않는다.
Playwright는 있으나 Chromium 실행파일이 없어 브라우저 렌더/스크린샷검증 실패. 실제 플레이3회/전조가독성/렌더비용/모바일은 미수행. 자동 검증은 시각검증·재미검증을 대신하지 않는다.

## 다음 검토 후 작업
1. 현재단위: 역할×성격×관계 전체통제시나리오, 관계600/맵경계/도전해제, 영역안밖분포, 점수 실제처치/흡수 통합검증, 브라우저시각검증 보완. 현재 통제테스트는 대표사례이며 모든 조합 완료 아님.
2. 특수능력은 reports/M3-abilities.md 기준 첫 구현과 강제시험 완료. 자연발생·실제플레이·브라우저 검증 보완.
3. 분산4바이옴, 성장카메라 대표배경, 지역보상조우.
4. Era/전쟁이동/결투/파멸.
5. 초원/사막과유물.
6. 벡터표현팩/필수표현대체/성장피드백/자동플레이와밸런싱.
7. 별도ball-game-next 준비/검증/최종공개승인. 계열빌드는 핵심과배포/밸런싱후 기본끔 독립실험.

현재 사용자 요청에 따라 여기서 검토를 기다린다. 수면모드/자동야간작업/스케줄은 설정하지 않았다.

## 재개 방법 (기존 작업 폴더에 덮어쓰지 않음)
압축 내 source/는 검토용 전체소스. npm test 또는 node --test. 웹실행은 python -m http.server 8000.
커밋이력은 ball-game-abilities.bundle의 개발브랜치에 있음. 새 클라우드/별도폴더에서:

```bash
git clone ball-game-abilities.bundle ball-game-next-review
cd ball-game-next-review
git switch codex/cloud-next-m0
node --test
python -m http.server 8000
```

bundle 검증: git bundle verify ball-game-abilities.bundle.
patches/*.patch는 원본4e552a6 별도체크아웃에서 git am으로 순서대로 적용할 대안. 이미 bundle을 clone했다면 patch를 중복적용하지 않는다.
원본ball-game master에는 적용/병합/push하지 않는다. ball-game-next remote 연결/생성/공개는 이후 대상과검증결과를 제시하고 최종승인받는다.

## GitHub 연결 보완 (2026-10-03)
사용자가 GitHub plugin 설치. Plugin Management 검색에서 installed=true 확인. 그러나 현 세션 ALL_TOOLS에 GitHub 저장소/PR 도구와 tool_search가 노출되지 않았고 executor/cloud skill 카탈로그에도 GitHub skill이 없어 직접 connector 호출 불가. CLI push --dry-run도 여전히 인증정보부재 실패. 설치실패라고 하지 않으며 재설치/토큰제공을 요구하지 않는다. 원격쓰기/PR생성은 미실행.
