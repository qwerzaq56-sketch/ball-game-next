# 아트 요청 · fx-concepts-1

이펙트 원화 1차: 얼음 보호막 · 상태 8종

> 생성 담당(GPT)용 작업 지시서. `desk.json`에서 자동 생성되며 직접 고치지 않는다. 매뉴얼: `tools/ART_DESK.md`.

## 진행 방법

- **Codex:** `python tools/art_desk.py next fx-concepts-1` → 지시대로 imagegen(참조 이미지를 역할 순서대로 첨부) → `python tools/art_desk.py ingest fx-concepts-1 --id <ID> --file <결과> --by codex --prompt-file <실제 프롬프트>` → 검사 결과 확인 → 다시 `next`.
- **ChatGPT 웹:** 검수 페이지(`tools/art-desk.html`)에서 항목의 "ChatGPT 메시지 복사" + 참조 이미지를 붙여 넣고, 결과 이미지를 카드에 끌어다 놓거나 붙여 넣는다(또는 `_inbox/<ID>.png`).
- 결과는 덮어쓰지 않는다(out-v1, v2…). 승인은 사용자만 한다. 실패작도 지우지 않는다.

## 공통 규칙

- Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look.
- True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop.
- One isolated subject, centred, small even margin; do not crop the subject at the canvas edge.
- Keep the reference proportions; do not stretch or squash.
- No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them.
- Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting.
- Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.

## 항목

| ID | 종류 | 상태 | 제목 | 용도 | 크기 |
|---|---|---|---|---|---|
| fx-buf-01-ice | concept | requested | 얼음 보호막 원화 (FX-BUF-01) | 보호막 버프(수호 고목·모래 비석·흑요석) 원화 다시 그리기. 승인 뒤 정확 크롭 → 투명 리소스로 leaf-shield-002 교체 (RR-001) | canvas 1536x1024 px |
| fx-sta-sheet | concept | requested | 상태 이펙트 8종 원화 시트 (FX-STA-01~08) | 코드로만 그리던 상태 표시 8종의 원화. 승인 뒤 상태별 정확 크롭 → 투명 리소스 (RR-002) | canvas 1536x1024 px |

### fx-buf-01-ice · 얼음 보호막 원화 (FX-BUF-01)

상태: **requested** · 결과 0개

- 참조 1 (scene base: keep this forest clearing, the guardian tree, the ball characters, their positions and the three panels (before / shield forming / shield held); replace ONLY the leaf shield effect): `assets/art-desk/fx-concepts-1/fx-buf-01-ice/ref-1.png` ← `planning/art-concepts/ally-buffs-001.png` · 크롭 [0, 0, 1536, 253]

```text
[Ball Game art request · fx-concepts-1 / fx-buf-01-ice]
얼음 보호막 원화 (FX-BUF-01) — 보호막 버프(수호 고목·모래 비석·흑요석) 원화 다시 그리기. 승인 뒤 정확 크롭 → 투명 리소스로 leaf-shield-002 교체 (RR-001)

Attached references:
- Image 1: scene base: keep this forest clearing, the guardian tree, the ball characters, their positions and the three panels (before / shield forming / shield held); replace ONLY the leaf shield effect

Regenerate this ally-buff art-direction strip for a top-down 2D circle ecosystem survival game. Keep the scene of reference image 1 exactly: the forest clearing, the guardian tree, the flat-vector matte ground, the same ball characters at the same positions, and the same three panels in one row (1 before, 2 shield forming, 3 shield held); on this taller canvas each panel simply shows more of the same ground above and below. Replace ONLY the shield effect. Instead of mint leaves, the ball that touched the guardian tree is wrapped by an ICE-SHAPED protective shield: several pale sky-blue faceted ice plates hovering in a ring just outside the body, with small gaps between the plates, like light crystal armour that clearly floats off the body. Panel 2: the ice plates fly in from the tree side and lock into the ring. Panel 3: the ring holds steady and the ball's own colour stays fully visible inside it. Palette: pale sky blue (#7dd3fc) with white highlights. Calm and soft, lower intensity than attack warnings. Flat matte colour areas, top-left light, same rendering style as the reference.

Output: opaque PNG, canvas 1536x1024 px. 1 image.
Avoid: leaves or petals; green or mint glow (reads as healing); water ripples; an ice crust covering the ball surface (that is the frozen status); a solid opaque dome that hides the ball; text, labels, UI, HUD, numbers, arrows; glossy 3D or heavy gradients; checkerboard background
Rules: Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look. True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop. One isolated subject, centred, small even margin; do not crop the subject at the canvas edge. Keep the reference proportions; do not stretch or squash. No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them. Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting. Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.
Acceptance:
- 얼음 모양 보호막이 공을 감싸는 것이 한눈에 보임
- 빙결(공 표면을 덮는 얼음 껍질)과 헷갈리지 않음: 몸 바깥에 떠 있는 조각 고리
- 회복(초록·잎·물결)으로 읽히지 않음
- 바탕 장면(숲, 수호 고목, 공 배치, 세 칸)은 참조와 같음
- 공격 예고보다 부드러운 세기
```

### fx-sta-sheet · 상태 이펙트 8종 원화 시트 (FX-STA-01~08)

상태: **requested** · 결과 0개

- 참조 1 (sheet format, flat-vector ground and lighting; a calm comparison sheet of equal panels): `assets/art-desk/fx-concepts-1/fx-sta-sheet/ref-1.png` ← `planning/art-concepts/ally-buffs-001.png`
- 참조 2 (matte body rendering of the five species balls; use the plain middle row as the body look): `assets/art-desk/fx-concepts-1/fx-sta-sheet/ref-2.png` ← `planning/art-concepts/ball-002-refined.png`

```text
[Ball Game art request · fx-concepts-1 / fx-sta-sheet]
상태 이펙트 8종 원화 시트 (FX-STA-01~08) — 코드로만 그리던 상태 표시 8종의 원화. 승인 뒤 상태별 정확 크롭 → 투명 리소스 (RR-002)

Attached references:
- Image 1: sheet format, flat-vector ground and lighting; a calm comparison sheet of equal panels
- Image 2: matte body rendering of the five species balls; use the plain middle row as the body look

Create a STATUS EFFECT art-direction sheet for a top-down 2D circle ecosystem survival game. Four columns by two rows of equal panels separated by thin gutters. Every panel shows the same calm grassland ground from reference image 1 and one matte ball (body rendering from reference image 2) of the same size in the centre, with one status effect drawn only on or just around the body. The ball's species colour must stay visible under every effect. Panels in reading order: 1 FROZEN: a thin translucent ice shell coating the surface of a red ball. 2 INVULNERABLE after dust veil: a brief swirling sand-gold film around a blue ball. 3 OBSIDIAN GUARD: an arc of black volcanic glass shards around a green ball. 4 ADORNED: a yellow ball wearing a few tiny flowers and one small pearl shell at its rim. 5 SUMMONED (cannot be absorbed): a green ball with a thin rim of small leaves marking it as summoned. 6 FROST MARK: a red ball with a few small frost crystals at the edge of its body. 7 FROSTBITE (blizzard): a blue ball with scattered white frost speckles on its surface. 8 three small balls side by side: MORALE a mint arc above a sky-blue ball, COMMAND a red ring under a red ball, WET a few water droplets on a yellow ball. Flat matte colour areas, top-left light, soft and calm, lower intensity than attack warnings, each effect distinct in shape and colour.

Output: opaque PNG, canvas 1536x1024 px. 1 image.
Avoid: text, labels, numbers, UI chips, HUD; dotted rings like debug circles; effects far from the body or filling the panel; glossy 3D or heavy gradients; checkerboard background; different ball sizes between panels
Rules: Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look. True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop. One isolated subject, centred, small even margin; do not crop the subject at the canvas edge. Keep the reference proportions; do not stretch or squash. No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them. Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting. Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.
Acceptance:
- 칸마다 상태 하나씩, 정해진 순서(1 빙결 · 2 무적 · 3 흑요석 막 · 4 치장 · 5 흡수 불가 · 6 서리 표식 · 7 동상 · 8 사기·지휘·젖음)
- 공의 종족색이 효과 아래로 보임
- 효과는 몸 표면이나 몸 바로 둘레에만 있음
- 빙결(껍질) · 서리 표식(가장자리 결정) · 동상(흰 반점)이 서로 구분됨
- 글자·UI 없음, 위협 예고보다 부드러움
```
