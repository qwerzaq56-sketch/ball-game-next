# 캐릭터·이펙트 통합 검증 fixture

담당 수정: tools/character-effects-review.html과 이 보고서만. 실제 Game.render를 사용하며 게임 루프·전투·AI를 돌리지 않는 통제 장면이다. 런타임 캐릭터/효과 모듈과 공유 renderer의 연결은 부모 담당이다.

## 컨트롤과 통합 API

- 지역6종, 줌0.5/1, size40/100/200/400, 5색 또는 단일색 비교. size는 게임 기존 값이며 반지름은 size/2. size400의5색은 겹침 스트레스 장면이므로 단일색도 별도로 확인한다.
- 전투: 대기, 풀차징, 전조, 돌진, 회피, 피격, 공격 재사용 대기, 공격 미해금. 실제 보이는 상태 필드를 구성하고 피해 판정이나 이동 능력은 실행하지 않는다. 성장/최상위도 통제된 표시 비교로, 자연 플레이 직위 획득 결과가 아니다.
- 보호막·강화·동상·성장 단독/중첩, 방향0~360, 좌표 이동/정지. 모션은 같은 좌표 궤적을 반복하며 실제 속도/전투/RNG 측정이 아니다.
- 지형ON/OFF 및 래스터 몸체ON/OFF. 캐릭터 모듈을 사전 await해서 정지 fixture에서도 준비된 새 몸체를 사용한다. 몸체OFF는 기존MatteBody 비교이며 PNG decode 실패 주입과 다르다. 현재 단계 선택은 실제 renderer의 e.apex/attackUnlocked 규칙을 따른다. 공격 미해금 컨트롤로 기본 몸체도 확인한다.
- 실제 회복/보호막/피난처 probe는 실제 오브젝트 하나만 남기고 범위 안·밖 두 개체를 배치한다. 회복/보호막은 BiomeObjects.update(1), 피난처는 Biomes.update(.01) 한 번 호출해 실제 수혜/비수혜 필드를 기록한다. 전체 자연 플레이를 대체하지 않는다.
- window.artReview: game getter, set({biome,zoom,size,color,combat,status,direction}), render(), probe('heal'|'shield'|'frost'), stop(), snapshot(), metrics. DOM 컨트롤만으로 동일 조건 재현 가능. set은 로컬 개발 fixture API이며 CUA evaluate는 read-only 제한이므로 브라우저 조작은 select/button 사용.

## 검수 체크리스트

1. 원화 정확 크롭 직접 입력을 생성의 필수 조건으로 유지. 원본 크기·픽셀 좌표·SHA256·크롭 경로·프롬프트·실패 시안 보존. 전체 원화는 보조 입력이며 크롭을 대체하지 않는다.
2. 비스듬한 탑뷰·상대 축척·고정광원 일치. 방향0/90/180/270에서 몸체 광원이 함께 회전하지 않는지 실제 캡처 비교.
3. 5색, 특히 숲 초록/노랑·설원 하늘색이 몸체/방향/전조를 유지하는지 이동 중 확인. 문양만으로 색 구분을 대신하지 않는다.
4. 필수 공격 범위·차징 방향·위험 판정선과 장식/수혜 효과 외곽을 구분. 새 효과 PNG가 필수 코드 범위나 캐릭터 몸을 덮지 않는지 확인. 공격 미해금은 붉은 대기 범위를 보이지 않고, 해금 후 재사용 대기에만 구분한다.
5. 보호막/강화/동상/성장 중첩에서 효과 출처·수혜 대상과 비수혜가 구별되는지 확인. 회복이 체력 가득/범위 밖인 대상에도 장식으로 붙지 않는지 별도 자연 플레이 확인.
6. alpha=0 배경·sprite 여백·피벗·색변환·세부 흔들림 확인. PNG decode 실패 시 기존 몸체/효과/필수 범위가 살아 있는지 실패 주입 테스트와 실제 브라우저를 별도로 확인한다.
7. 처음 장면 진입/로드와 같은 장면 캐시 재사용을 분리. metrics는 단일 Game.render 시간이고 실제 FPS나 전체 합격 판정이 아니다.6지역×2줌×4크기×8전투×6상태 전 조합 자동 합격 주장 금지.

## 수행한 확인

Chrome에서 페이지 로드·컨트롤·실제 probe 실행 확인, 이 시점 콘솔 오류/경고0. 회복 범위 안 HP250→255/밖250유지, 보호막 안0→40/밖0, 피난처 안 동상1→0/밖1로 확인했다. 전투 돌진·중첩·size100 전환 및 몸체OFF 컨트롤을 실행했다. 빠른 크기 전환 중 비동기 장면 구성에 다음 요청이 유실되는 문제를 발견해 pendingBuild로 최신 요청을 재구성한다.

첫 숲 통제 장면 약454~473ms, 같은 장면 size100 재사용8.6ms/몸체OFF7.9ms를 관찰했다. 서로 다른 조건이며 속도비·실제 FPS로 해석하지 않는다. 캐릭터 자산 사전로드 후 검수 컨트롤이 준비됐지만 화면 캡처는 실패하여 새 몸체의 시각 합격은 아직 확인하지 못했다. 효과 모듈은 통합 대기이므로 새 효과 전체 검증으로 보고하지 않는다.

## 병목·남은 확인

| 대상 | 원인 | 우회/진행 | 남은 일 |
|---|---|---|---|
| 브라우저 | 이 에이전트에서 iab 미제공 | 사용 가능한Chrome으로 독립탭 생성, DOM/로그/실제 probe 확인 | 부모 통합 캡처 |
| 캡처 | CDP Page.captureScreenshot 5초 timeout, 전체 및 작은clip 모두 실패 | 같은 실패 반복하지 않고 DOM 상태/수혜값 기록, 캡처 성공 주장 금지 | 6지역/줌/크기/방향/중첩 시각 확인 |
| 새 효과 | 효과 모듈 및 부모 연결 진행 중 | 현재renderer로fixture 준비, 연결 후 같은컨트롤 재검증 | effect API 사전로드·ON/OFF 비교 추가 및 자연 플레이 |
| 장면 구성 | 빠른 연속컨트롤 변경 중 async load | pendingBuild로 마지막선택 다시구성, 로딩상태 표시 | 최종 통합 후 연속변경 재확인 |

전체 테스트/브라우저 합격·릴리즈·push는 부모 통합 단계에서 수행한다.

## 효과 모듈 통합 후 fixture 갱신

loadEffectRaster() 사전 await, effectRasterStatus() DOM/API 표시, g.effectRasterEnabled ON/OFF 비교 추가. 피격 통제 상태는 기존 hitFlash와 hitVisualUntil을 함께 구성한다. 회복·서리해제 타이머는 합성으로 만들지 않고 실제 성공 update에서 발생한 healVisualUntil/frostClearVisualUntil을 probe 전후에 표시한다. 새로운 통제 장면·다른 probe로 넘어갈 때 이전 표시 타이머를 초기화해 대상 아닌 효과가 남지 않도록 했다.

Chrome에서 charge/impact/dodge/shield/strength/frost-clear/heal 7종 loaded, failed[] 상태 확인. 이는 현재 로딩 성공이며 시각 합격/생성 전 과정 완료 주장이 아니다. 회복 실제 HP250→255와 healVisualUntil0→20.22, 범위 밖250/타이머0 유지 확인. 피난처 동상1→0와 frostClearVisualUntil0→20.3, 범위 밖동상1/타이머0 유지 확인. 이펙트OFF 전환 후 DOM에 기존 폴백 상태 표시, 콘솔 오류/경고0. 기존 캡처 병목이 있으므로 부모 IAB 최종 캡처와 6지역/크기/회전/중첩 검수로 인계한다. JS module 추출 후 node --check 통과.

## 실제 피격 접촉 생성 fixture 추가

일반 피격/보호막 피격 버튼은 g.spawnHitImpact(target,attacker,50,{shield})를 직접 호출한다. 피해50은 시각 강도 입력이며 실제 applyDamage나HP 감소 검증이 아니다. size100 대상과 200거리 공격자를 방향 slider에 맞춰 배치하고, impact-ring의 접촉 좌표·몸체 중심·차이·색·입자수·HP 전후를 DOM에 기록한다. 새 시도마다 입자를 비우고 nextImpactVisualAt을 초기화해 이전 표시 또는 생성 간격 gate가 비교를 오염하지 않게 한다.

Chrome 통제 확인: 몸체(1700,1700), 접촉(1650,1700), 중심 차이(-50,0), 거리50=몸체반지름50. 일반 ring색#ffffff, 보호막 ring색#a5f3fc, 두 경우 입자12·hitVisualUntil20.18, HP500→500 유지. 콘솔 오류/경고0. 부모renderer에서 일반 texture는 이 접촉점 ring에만 연결하고 보호막 cyan은 기존벡터를 유지하는 경로의 비교fixture다. 실제 자연교전/피해판정 합격으로 해석하지 않는다. window.artReview.contact(false|true)도 재현 API로 제공한다.

부모 통합요청에 따라 Game import query를 characters-effects-01로 통일하고 loadProgressionRaster 사전 await 추가. 성장 texture는 부모연결 상태이고 흡수 texture는 품질보류/미연결 상태이므로 이 fixture도 흡수 texture 완료로 주장하지 않는다. 6지역2줌 최종 캡처는 부모 수행 상태이며 부모 근거와 합쳐 판단한다.
