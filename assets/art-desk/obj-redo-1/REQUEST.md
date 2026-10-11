# 아트 요청 · obj-redo-1

오브젝트 다듬기 1차: 진주 조개

> 생성 담당(GPT)용 작업 지시서. `desk.json`에서 자동 생성되며 직접 고치지 않는다. 매뉴얼: `tools/ART_DESK.md`.

## 진행 방법

- **Codex:** `python tools/art_desk.py next obj-redo-1` → 지시대로 imagegen(참조 이미지를 역할 순서대로 첨부) → `python tools/art_desk.py ingest obj-redo-1 --id <ID> --file <결과> --by codex --prompt-file <실제 프롬프트>` → 검사 결과 확인 → 다시 `next`.
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
| lake-garland-v2 | object | generated | 진주 조개 다듬기 (RR-010) | 호수 치장 오브젝트 lake-garland 리소스를 게임플레이 원화 크롭에 가깝게 다시 그림. 승인 뒤 scene-coherent-v1/lake-garland/asset.png 교체 (룩뎁 L-OBJ-05) | canvas 1536x1024 px |
| lake-garland-v3 | object | generated | 진주 조개 — 게임플레이 원화 크롭으로 다시 (RR-010) | 호수 치장 오브젝트 lake-garland 리소스. 게임플레이 원화 gameplay-a-002 호수 칸의 조개를 그대로 옮김. 승인 뒤 scene-coherent-v1/lake-garland/asset.png 교체 (룩뎁 L-OBJ-05). 게임은 투명 아닌 부분만 잘라 112×76으로 그림 | canvas 1536x1024 px |
| lake-garland-v4 | object | requested | 진주 조개 — 돌·연잎과 어우러진 물가 장면 (RR-010) | 호수 치장 오브젝트 lake-garland 리소스. 조개만이 아니라 게임플레이 원화처럼 이끼 돌·연잎·수초·갈대가 함께 있는 작은 물가 장면으로 그려 호수 바닥과 어우러지게 함(사용자 10-12). 승인 뒤 scene-coherent-v1/lake-garland/asset.png 교체, 게임 안 그리기 크기(지금 112×76)는 장면에 맞춰 키움. 상호작용 반경 68은 그대로 | canvas 1536x1024 px |

### lake-garland-v2 · 진주 조개 다듬기 (RR-010)

상태: **generated** · 결과 1개

- 참조 1 (exact crop of the approved gameplay concept: the shape, colours, outline weight and arrangement to match (three open shells with pearls, triangle layout)): `assets/art-desk/obj-redo-1/lake-garland-v2/ref-1.png` ← `assets/art-batches/scene-coherent-v1/lake-garland/reference.png` · 크롭 [0, 0, 330, 98]
- 참조 2 (current game resource: keep its canvas framing and the size of the shell group on the canvas so the in-game scale stays the same; do NOT copy its strong blue glow halo or its brighter, puffier rendering): `assets/art-desk/obj-redo-1/lake-garland-v2/ref-2.png` ← `assets/art-batches/scene-coherent-v1/lake-garland/asset.png`
- 참조 3 (final gameplay look of the lake region: muted palette, flat matte colour planes, soft upper-left light): `assets/art-desk/obj-redo-1/lake-garland-v2/ref-3.png` ← `planning/art-concepts/gameplay-regions-a-001.png`

```text
[Ball Game art request · obj-redo-1 / lake-garland-v2]
진주 조개 다듬기 (RR-010) — 호수 치장 오브젝트 lake-garland 리소스를 게임플레이 원화 크롭에 가깝게 다시 그림. 승인 뒤 scene-coherent-v1/lake-garland/asset.png 교체 (룩뎁 L-OBJ-05)

Attached references:
- Image 1: exact crop of the approved gameplay concept: the shape, colours, outline weight and arrangement to match (three open shells with pearls, triangle layout)
- Image 2: current game resource: keep its canvas framing and the size of the shell group on the canvas so the in-game scale stays the same; do NOT copy its strong blue glow halo or its brighter, puffier rendering
- Image 3: final gameplay look of the lake region: muted palette, flat matte colour planes, soft upper-left light

Redraw the pearl-shell lake decoration so it matches reference image 1 (the approved gameplay concept crop) much more closely. Three open scalloped shells, each holding one pearl on a sandy beige inner lip, arranged in a triangle (one top, two below) exactly as in reference 1. Use the muted dusty blue-violet shell colour, darker blue-grey outlines, flat matte colour planes and the small calm pearl highlights of reference 1. Keep the canvas framing and the overall size of the shell group from reference 2 so the in-game scale does not change, but remove its glowing halo: no outer glow, no bloom, no light rays. The shells sit flat as seen from the elevated top-down gameplay camera, with a soft upper-left light and only a faint contact shadow. Isolated object on true transparency, centred with an even margin.

Output: PNG with true transparent background, canvas 1536x1024 px. 1 image.
Avoid: outer glow, bloom or halo around the shells; water, waves, ground or rocks around the object; glossy 3D, heavy gradients or photoreal shell texture; bright neon pearls; extra shells, starfish or other new ornaments; text, UI, range rings, arrows, balls; checkerboard or coloured backdrop
Rules: Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look. True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop. One isolated subject, centred, small even margin; do not crop the subject at the canvas edge. Keep the reference proportions; do not stretch or squash. No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them. Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting. Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.
Acceptance:
- 원화 크롭(참조 1)과 형태·색·윤곽이 같은 계열로 보임
- 빛 번짐(halo)이 없음
- 세 개의 조개·진주 삼각 배치 유지
- 지금 리소스와 같은 화면 크기(조개 무리 크기)
- 투명 배경, 잘림 없음
```

### lake-garland-v3 · 진주 조개 — 게임플레이 원화 크롭으로 다시 (RR-010)

상태: **generated** · 결과 1개

- 참조 1 (EXACT TARGET: the pearl shells as drawn in the approved gameplay concept. Copy these shells: upright scalloped back valve fanning behind, pale grey-lavender shell with soft violet-grey shading, dark slate outline, sandy beige inner lip, one white-blue pearl with a small calm highlight, sitting in the water with a thin ripple ring and a soft dark underwater shadow): `assets/art-desk/obj-redo-1/lake-garland-v3/ref-1.png` ← `assets/art-batches/scene-coherent-v1/gameplay-a-002.png` · 크롭 [1370, 530, 150, 110]
- 참조 2 (the same shells elsewhere in the concept: confirms the shape, the pair arrangement (one larger shell behind, one smaller shell in front and to the side) and the water contact): `assets/art-desk/obj-redo-1/lake-garland-v3/ref-2.png` ← `assets/art-batches/scene-coherent-v1/gameplay-a-002.png` · 크롭 [1720, 130, 110, 90]
- 참조 3 (the whole lake panel of the gameplay concept: palette, outline weight, flat painterly colour planes, soft upper-left light, detail density next to the balls): `assets/art-desk/obj-redo-1/lake-garland-v3/ref-3.png` ← `assets/art-batches/scene-coherent-v1/gameplay-a-002.png` · 크롭 [1300, 0, 644, 809]

```text
[Ball Game art request · obj-redo-1 / lake-garland-v3]
진주 조개 — 게임플레이 원화 크롭으로 다시 (RR-010) — 호수 치장 오브젝트 lake-garland 리소스. 게임플레이 원화 gameplay-a-002 호수 칸의 조개를 그대로 옮김. 승인 뒤 scene-coherent-v1/lake-garland/asset.png 교체 (룩뎁 L-OBJ-05). 게임은 투명 아닌 부분만 잘라 112×76으로 그림

Attached references:
- Image 1: EXACT TARGET: the pearl shells as drawn in the approved gameplay concept. Copy these shells: upright scalloped back valve fanning behind, pale grey-lavender shell with soft violet-grey shading, dark slate outline, sandy beige inner lip, one white-blue pearl with a small calm highlight, sitting in the water with a thin ripple ring and a soft dark underwater shadow
- Image 2: the same shells elsewhere in the concept: confirms the shape, the pair arrangement (one larger shell behind, one smaller shell in front and to the side) and the water contact
- Image 3: the whole lake panel of the gameplay concept: palette, outline weight, flat painterly colour planes, soft upper-left light, detail density next to the balls

Redraw the lake pearl-shell decoration exactly as it appears in the approved gameplay concept (reference 1 is the target, reference 2 shows the same shells again). Two open scallop shells as a pair: one larger shell behind and one smaller shell in front and slightly to the side, overlapping a little, exactly like reference 1. Each shell has an upright fan-shaped back valve with broad flat ridges, pale grey-lavender colour with soft violet-grey shading, a dark slate outline, a sandy beige inner lip and one round white-blue pearl with a small calm highlight. Keep the concept's slightly elevated top-down view and soft upper-left light. Include only what belongs to the object in the water: a thin pale ripple ring where each shell meets the water and a soft dark shadow under the shells, both fading out to transparency. No surrounding water colour, rocks, lily pads or ground. Match the flat painterly colour planes and outline weight of reference 3 so it sits naturally next to the balls. Isolated object on true transparency, centred with an even margin, filling about two thirds of the canvas width.

Output: PNG with true transparent background, canvas 1536x1024 px. 1 image.
Avoid: three shells or a triangle layout (that was the old object sheet design); outer glow, bloom or halo; opaque water patch, rocks, lily pads or ground behind the shells; glossy 3D, photoreal shell texture or heavy gradients; bright neon pearls; starfish, coral or other new ornaments; text, UI, range rings, arrows, balls; checkerboard or coloured backdrop
Rules: Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look. True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop. One isolated subject, centred, small even margin; do not crop the subject at the canvas edge. Keep the reference proportions; do not stretch or squash. No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them. Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting. Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.
Acceptance:
- 게임플레이 원화 크롭(참조 1·2)의 조개와 같은 형태·색·윤곽으로 보임
- 큰 조개 뒤·작은 조개 앞의 두 개 배치
- 물에 닿는 잔물결과 물속 그림자가 투명하게 사라짐
- 빛 번짐 없음
- 투명 배경, 잘림 없음
```

### lake-garland-v4 · 진주 조개 — 돌·연잎과 어우러진 물가 장면 (RR-010)

상태: **requested** · 결과 0개

- 참조 1 (EXACT TARGET SCENE from the approved gameplay concept: the two pearl shells in the water with a mossy grey rock beside them, floating four-leaf water plants, a lily pad, a loose pearl and ripples. Copy this composition and how the pieces overlap): `assets/art-desk/obj-redo-1/lake-garland-v4/ref-1.png` ← `assets/art-batches/scene-coherent-v1/gameplay-a-002.png` · 크롭 [1310, 500, 260, 200]
- 참조 2 (the same shells at another spot in the concept: shells against large grey bank rocks, reeds and lily pads; shows how rocks and plants frame the shells): `assets/art-desk/obj-redo-1/lake-garland-v4/ref-2.png` ← `assets/art-batches/scene-coherent-v1/gameplay-a-002.png` · 크롭 [1690, 90, 250, 170]
- 참조 3 (the shell design to keep for the two shells (shape, colour, outline, pearls); only the shells, not its empty surroundings): `assets/art-desk/obj-redo-1/lake-garland-v4/ref-3.png` ← `assets/art-desk/obj-redo-1/lake-garland-v3/out-v1.png`
- 참조 4 (the whole lake panel: palette, outline weight, flat painterly colour planes, soft upper-left light, how the props sit on the deep blue water): `assets/art-desk/obj-redo-1/lake-garland-v4/ref-4.png` ← `assets/art-batches/scene-coherent-v1/gameplay-a-002.png` · 크롭 [1300, 0, 644, 809]

```text
[Ball Game art request · obj-redo-1 / lake-garland-v4]
진주 조개 — 돌·연잎과 어우러진 물가 장면 (RR-010) — 호수 치장 오브젝트 lake-garland 리소스. 조개만이 아니라 게임플레이 원화처럼 이끼 돌·연잎·수초·갈대가 함께 있는 작은 물가 장면으로 그려 호수 바닥과 어우러지게 함(사용자 10-12). 승인 뒤 scene-coherent-v1/lake-garland/asset.png 교체, 게임 안 그리기 크기(지금 112×76)는 장면에 맞춰 키움. 상호작용 반경 68은 그대로

Attached references:
- Image 1: EXACT TARGET SCENE from the approved gameplay concept: the two pearl shells in the water with a mossy grey rock beside them, floating four-leaf water plants, a lily pad, a loose pearl and ripples. Copy this composition and how the pieces overlap
- Image 2: the same shells at another spot in the concept: shells against large grey bank rocks, reeds and lily pads; shows how rocks and plants frame the shells
- Image 3: the shell design to keep for the two shells (shape, colour, outline, pearls); only the shells, not its empty surroundings
- Image 4: the whole lake panel: palette, outline weight, flat painterly colour planes, soft upper-left light, how the props sit on the deep blue water

Paint a small lakeside vignette from the approved gameplay concept (reference 1 is the target scene, reference 2 shows the same idea elsewhere) as one reusable decoration. In the middle, the two open pearl shells as a pair, one larger behind and one smaller in front, using the shell design of reference 3. Around them, exactly in the concept's style: one or two mossy grey rocks partly in the water beside the shells, two or three round lily pads, a few small floating four-leaf water plants, a short clump of reeds at one side and one small loose pearl, with thin pale ripple rings and soft dark underwater shadows where things meet the water. The shells stay the clear focal point; the rocks and plants frame them and must not cover them. Do not paint the open lake water itself: the water colour between the props is left transparent, and every outer edge (ripples, shadows, plant tips) fades softly to transparency so the vignette blends into the game's lake floor. Same elevated top-down view, soft upper-left light, flat painterly colour planes and outline weight as reference 4. Isolated on true transparency, centred, filling about three quarters of the canvas width with an even margin.

Output: PNG with true transparent background, canvas 1536x1024 px. 1 image.
Avoid: an opaque square or circular patch of water behind the vignette; hard cut-out edges around the group; shells hidden behind rocks or leaves; three shells or a triangle layout; outer glow, bloom or halo; glossy 3D, photoreal textures or heavy gradients; bright neon pearls; trees, land ground, sand beach; text, UI, range rings, arrows, balls; checkerboard or coloured backdrop
Rules: Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look. True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop. One isolated subject, centred, small even margin; do not crop the subject at the canvas edge. Keep the reference proportions; do not stretch or squash. No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them. Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting. Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.
Acceptance:
- 게임플레이 원화 크롭(참조 1·2)처럼 조개·이끼 돌·연잎·수초·갈대가 한 장면으로 보임
- 조개 두 개가 가운데 눈에 띄고 돌·잎에 가려지지 않음
- 물 색은 칠하지 않고 바깥 가장자리가 투명하게 흐려져 호수 바닥과 어우러짐
- 빛 번짐 없음
- 투명 배경, 잘림 없음
```
