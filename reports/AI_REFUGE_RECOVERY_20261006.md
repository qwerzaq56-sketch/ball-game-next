# AI 피난처·회복 행동

눈보라가 실제 적용되는 설원 AI는 감지 범위 안의 안전한 서리 피난처를 선택한다. recovering 상태에서는 안전한 작은 오아시스를 먹이보다 먼저 선택한다. 환경·흡수·적 장판·큰 적 탈출은 우선하며 정상 체력의 기존 먹이 행동은 유지한다. 안전한 기억 공격자에 대한 회복 중 반격 기회는 회복 이동보다 앞에 둔다.

`seek_refuge`는 dist/angleTo 토러스 최단 방향으로 직선 이동하고 현재 객체 config.radius+size/2 안에서 정지한다. 기존 HP 회복 및 동상 해제 update를 그대로 사용하며 AI가 직접 체력·동상을 수정하지 않는다. 이미 범위 안이면 새 이동 없이 머문다. 객체에는 alive를 추가하지 않았고 disabled 또는 sync로 사라진 참조는 해제한다. 눈보라가 끝나거나 recovering 종료 후 다음 결정에서 일반 행동으로 돌아간다. 전역의 객체를 알아내는 장기 추적 기능은 없다.

## 회복 중 전투

- `balance.ai.recoveryDodgeDelayChance` 기본 1/3: 실제 위협을 감지했을 때 해당 공격 회차에 한 번만 지연 여부 추첨. 나머지는 기존 즉시 회피.
- `balance.ai.recoveryDodgeReactionSeconds` 기본 .18: 지연 대상으로 선택된 회차의 첫 유효 위협 감지부터 .18초 기다린다. 1/3 피격률을 보장하는 기능이 아니다.
- `balance.ai.recoveryRetaliationChance` 기본 .2: 기억된 공격자·새 피격 token/누적 받은 피해 또는 retaliation timer 재설정 기준 한 번 추첨. 공격 해금/stack·생존·감지·적 크기 <=2.8배·목적지 안전 조건을 통과할 때만 반격 기회 확인.

기본 공격은 TELEGRAPH→CHARGING 타이머가0으로 바뀌어도 동일 회차로 취급한다. inactive 종료 또는 새 windup timer reset/명시 attack token/새 specialCast로 다음 회차를 구분한다. 매 프레임 재추첨하지 않는다. 정상 체력의 회피 결정은 그대로 유지하며 회복 행동에 필요한 추첨만 추가한다. AI 난수 stream 사용으로 승인된 새 결정에 따른 AI stream 소비는 변경된다.

## 검증

신규 deterministic 테스트9개: 설원·눈보라·enabled 조건, 실제 접촉 반경에서 정지, 오아시스 우선순위/위협 탈출, 사라진 객체 해제, 토러스 경계, 반격 1회 추첨/공격 가능 조건, 지연 선택과 동일 공격 phase reset, 실제 오아시스 HP 증가/회복 종료, 실제 피난처 exposure 감소·동상 해제. 기존 AI 규칙/교전 테스트27개도 통과했다. 통제 테스트로 확률 기대값/실제 피격률/장기 생태 밸런스 완료를 주장하지 않는다.

## 한계 및 인계

오브젝트 안전과 현재 위치 위험을 확인하되 새 장거리 경로 탐색은 만들지 않았다. seek_refuge는 사용자 요청의 직선 접근이며 여러 위험을 우회하는 최적 경로 계획은 아니다. 객체의 실제 반경 외곽이 감지거리 안에 닿으면 감지한다(center distance <= sensingRange+config.radius). 그 밖 객체는 탐색하지 않고, 다음 결정 주기까지 기존 목적 상태가 짧게 유지될 수 있다. AI가 관찰할 수 없는 전체 공격 회차를 완벽히 식별하는 전역 attack serial은 현재 combat에 없으며 명시 token이 있으면 우선 사용한다.

reports/AI_OBJECT_GUIDANCE.md의 실제 범위·지속 효과·오브젝트 수명 주의사항을 확인했다. 수정 파일은 js/ai.js, tests/ai-refuge-recovery.test.mjs와 본 보고서. 설정은 부모가 추가하고 실제 브라우저 검수·커밋을 통합한다. git 작업 없음.

통합 최종검수:420/420테스트. 수락된회복반격기회1회소모 테스트추가. 실제브라우저 오아시스2초후HP100→108.33/seek_refuge, 서리피난처2초후sheltered=true/exposure0. 오류경고0. 실제객체 sync/토러스/정지범위확인. 초기fixture모듈캐시로구AI가보여 query버전수정, 본게임main/game/AI/오브젝트 캐시연결갱신. 실제피격률1/3·자연교전20%통계는아직측정아님.

