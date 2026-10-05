# 초기 원화 → 현재 출력 비교

독립 페이지: `tools/art-baseline-review.html`. 등록 데이터: `tools/art-baseline-review-data.json`.

승인 공 ball-002-refined, 최종 룩 gameplay-regions-a-001, 수혜 효과 ally-buffs-001 원본과 정확 프롬프트를 상단에 고정했다. 초기 보존 manifest/SHA 및 보존 규칙도 연결했다. 별도 시안을 초기 원본으로 대체하지 않는다.

각 행은 실제 출처 → 정확 크롭/좌표/SHA → 현재 선택 리소스/생성 프롬프트/pivot → 실제 Game.render 통제 캡처 순서다. 캐릭터 sheet는 manifest의 단계별 좌표를 읽어 표시한다. 숲은 선택 floor/dense/canopy/understory/edge/decals와 기능 berry를 표시하며 fallback tree를 선택 결과로 진열하지 않는다. 효과와 능력은 selected 상태만 표시하고 실패·비선택 후보는 링크로 보존한다.

숲 floor/dense는 기존 리소스에서 파생했고 작은 SVG 장식은 코드 작성 자산이다. 해당 개별 exact-crop 연결을 추측하지 않고 기록 없음으로 표시했다. 새 능력/흡수/전투 원화는 실제 생성 출처와 그 프롬프트로 표시하며 상단의 초기 기준은 유지한다.

## 검증 및 범위

- 부모 실제 브라우저 검증: 수정 전 27개 선택 / 108개 이미지 로드 실패 0, 콘솔 오류·경고 0, 캐릭터 필터 정상. 캡처 `reports/art-baseline-review-20261006.png`.
- 이후 dense와 SVG 3종 선택 표시를 추가하고 좌표 cropXYXY, 실제 출처 프롬프트, 보존 guard 링크를 보완했다. 최종 HTML module Node 문법 검사 통과. 추가 4개 행은 부모 최종 브라우저 재확인 대상이다.
- ON/OFF 캡처의 조건이 다르면 동일 조건 A/B로 취급하지 않는다. 숲 ground-OFF는 기능 객체 주변 시각 바닥 패치 해제다. texture OFF도 실제 판정/필수 범위를 유지한다.
- 일반 숲 캡처는 모든 개별 능력 발동 증거가 아니다. 능력별 fixture 후속 검수가 필요하다. 생성/로드 성공을 사용자 시각 승인이나 실제 FPS/자연 플레이 합격으로 취급하지 않는다.

## 병목 및 인계

기존 floor/dense의 개별 크롭 계보가 부족해 좌표를 대신 만들어 넣지 않았다. 기존 프롬프트·선택 manifest는 보존해 연결한다. 개별 능력의 현재 발동 캡처는 추가 연결 대상이다. 이미지 비교 캡처는 통제 장면이며 성능 측정을 대체하지 않는다.

공유 renderer, 기존 art-batch-review UI, 게임 수치/판정/RNG, git은 수정하지 않았다. 부모가 최종 브라우저 확인 후 연결·커밋한다.

최종 통합 검증: 31선택/119이미지, 로드 실패0, 브라우저 오류·경고0. 캡처 reports/art-baseline-review-20261006.png. 시각 일치 판정은 별도이며 이 결과는 비교 도구 정상 동작 검증이다.
