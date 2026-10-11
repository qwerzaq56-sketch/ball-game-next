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
| lake-garland-v2 | object | requested | 진주 조개 다듬기 (RR-010) | 호수 치장 오브젝트 lake-garland 리소스를 게임플레이 원화 크롭에 가깝게 다시 그림. 승인 뒤 scene-coherent-v1/lake-garland/asset.png 교체 (룩뎁 L-OBJ-05) | canvas 1536x1024 px |

### lake-garland-v2 · 진주 조개 다듬기 (RR-010)

상태: **requested** · 결과 0개

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
