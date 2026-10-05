# T3 수정 방향 · 사용자 피드백 반영

2026-10-05 / 사용자 직접 제안과 Codex 시각 개선안

## 사용자 직접 제안

서리 피난처·오아시스는 소진/휴식 모습 대신 접근한 아군에 효과를 부여하는 모습으로 시각화한다. 고목·서리꽃 소진은 비직관적이고 서사가 읽히지 않는다. 개선을 시도하되 애매하면 먼저 구현 후 수정한다.

## 시각 개선안

- 피난처: 본체는 유지. 실제 동상 해제 대상의 몸에서 서리 조각이 풀려나가는 짧은 효과. 동상 없는 개체에게 가짜 해제를 표시하지 않는다. 별도의 10초 효과 수락 쿨다운이 피난처 본체의 소진을 뜻하지 않는다.
- 오아시스: 물과 풀은 유지. 실제 회복을 받은 개체의 몸 가장자리에 민트 물방울/짧은 회복 물결. 10초 재사용 상태는 필요하면 기존 UI로만 알리고 말라 버린 물웅덩이를 만들지 않는다.
- 수호 고목: 건강한 수관 유지. 보호하는 잎빛이 개체에게 옮겨가 얇은 보호막이 되고, 이후 잎빛만 줄었다가 회복한다. 고목이 죽거나 병든 모습으로 만들지 않는다.
- 얼음꽃(사용자 표현 서리꽃): 개화한 꽃에서 성장 먹이가 나오는 모습을 보여준다. 수확 후 열린 빈 꽃받침·떨어진 꽃잎·작은 새 봉오리로 다시 피는 과정. 기존 시안의 큰 결정 덩어리 전환은 제외한다. 먹이가 멀리 남아 있는 경우 꽃은 정상 쿨다운 상태로 유지한다.

## 범위와 승인 구분

사용자 요청은 시각 방향에 반영한다. 보호 잎·꽃받침 서사는 Codex가 제안한 표현이며 세계관 사실이나 새 규칙으로 확정하지 않는다. 기존 효과 대상·보상·공유 쿨다운·HP/보호막·동상 해제 조건은 변경하지 않는다. '아군' 시안은 예시이며 기존 환경 효과를 동색 전용으로 제한하지 않는다.

참조 구현927209f: 고목 보호막12초 재사용/6초 지속, 얼음꽃 먹이16초 주기, 피난처 범위 내 동상 즉시 해제와 별도 저항 효과, 오아시스 부상 개체 회복10초 재사용. 실제 연결 시 최신 구현을 다시 확인한다.

구현은 현재 게임의 효과 이벤트를 사용하고 실제 수혜 개체에만 표시한다. 지속값으로 새 보상을 만들지 않는다. 게임 본체·이득/위험 표식의 가독성이 먼저다. 불명확한 세부 표현은 단순한 잎 이동·꽃잎/봉오리·서리 해제·회복 물결부터 적용하고 실제 화면 피드백으로 수정한다. 이번 로컬 커밋은 컨셉/명세이며 게임 코드 적용은 후속이다.

## 재시안 정확한 프롬프트

재시안: [objects-t3-r2-001.png](objects-t3-r2-001.png). 위부터 고목·얼음꽃·피난처·오아시스, 왼쪽 준비/중앙 효과 전달/오른쪽 회복 또는 이탈. 피난처·오아시스의 본체를 유지하면서 수혜 효과가 보이는 것을 확인했다. 꽃받침·떨어진 꽃잎으로 기존 결정 덩어리보다 수확 서사가 읽힌다. 생성 그림의 먹이 개수와 원근·공 테두리는 표현 참고이며 실제 개수나 승인된 공 렌더링을 대체하지 않는다. 고목 재충전은 아직 자세히 설명하지 않으면 약할 수 있어 최소 잎빛 전달을 먼저 구현하고 재사용 상태는 기존 표식으로 보조한다. 새 이미지 자체의 사용자 검토는 아직 없다.

Create an ART CONCEPT comparison sheet for a top-down 2D circle ecosystem game, exactly FOUR rows and THREE columns in a wide landscape layout. Reference image1 original flat vector ecosystem concept002 for matte circle design, reference image2 T3 earlier object silhouettes as supporting reference to improve. Refine ONLY guardian tree, ice flowers, frost shelter, oasis presentation. No text, no labels, no UI. Rows in order: forest guardian old tree; snowfield ice flower cluster; snowfield frost shelter stones; desert small oasis. THREE sequential moments left-to-right per row, readable storytelling with the same camera and environment and same object silhouette each moment. Row1: first tree ready, several softly pale mint luminous small leaves on its canopy; second those leaves drift a short distance toward a nearby small matte cyan circular ally, form a thin protective cyan arc hugging its true body (not giant aura); third tree remains healthy with SAME green canopy, few empty spots where luminous leaves left and a single tiny new mint leaf bud: replenishing protective energy NOT dead tree, NOT grey dead canopy. Row2: first three open ice flowers ready, petals shaped ice crystals not stars with a tiny seed at center; second petals gently open and release three tiny round growth food beads onto snow around the base, a few detached pale petals fall; third recognizably the SAME plants with EMPTY open calyx and a FEW fallen ice petals, a small unopened fresh bud: harvested and regrowing, NOT conversion into unrelated giant crystal ore spikes, NOT sick dying flowers. Row3: first shelter circle of frost-covered boulders with empty gap between stones; second the EXACT SAME shelter unchanged with a small matte cyan allied circle approaching the sheltered gap, cracked white frost flakes visibly lifting from its lower rim and fading, faint warm white clean protective partial arc near body; third EXACT SAME shelter unchanged and same ally now free of frost and leaving, no depleted or dormant shelter look. Row4: first small shallow dark-teal oasis pool and sparse reeds; second EXACT SAME oasis unchanged with a small injured matte cyan allied circle at water edge receiving 3 tiny pale mint droplets and a short soft upward ripple touching its rim, no plus icon or HP bar; third EXACT SAME oasis unchanged, cyan ally recovered and moving away with a tiny fading ripple, no dried/depleted pool. Reuse subdued grass forest green, grey-blue snow and muted ochre desert as appropriate. Small circle bodies are flat matte cyan, thin colored outline, modest lower-edge shadow, no specular dots, no thick black outlines. Perfect overhead readable silhouettes, compact 2-3 tone vector illustrations, sparse low-contrast original-style backdrop, no perspective. Thin dark navy gutters, broad empty space around objects. No warning symbols, dashed outlines, perimeter danger rings, arrows, lettering, numbers, crowns, massive roots or landmarks. Visualize effects ON ACTUAL RECIPIENTS, keeping body radius clear. This is a concept approval plate, not actual game screenshot or finished asset atlas.
