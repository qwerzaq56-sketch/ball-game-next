# 아트 요청 · lava-river-1

용암 강 띠 리소스 (RR-011 방식 A)

> 생성 담당(GPT)용 작업 지시서. `desk.json`에서 자동 생성되며 직접 고치지 않는다. 매뉴얼: `tools/ART_DESK.md`.

## 진행 방법

- **Codex:** `python tools/art_desk.py next lava-river-1` → 지시대로 imagegen(참조 이미지를 역할 순서대로 첨부) → `python tools/art_desk.py ingest lava-river-1 --id <ID> --file <결과> --by codex --prompt-file <실제 프롬프트>` → 검사 결과 확인 → 다시 `next`.
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
| lava-strip-a | terrain | generated | 용암 강 띠 A (RR-011 방식 A) | 화산 용암 강을 경로를 따라 휘어 붙이는 띠 그림. 강 폭 124 = 띠의 둑 바깥 끝 폭. 코드가 강 방향으로 천천히 밀어 흐름을 보임. drawLavaSurface 교체용 | canvas 1536x1024 px |
| lava-strip-b | terrain | generated | 용암 강 띠 B (RR-011 방식 A) | 띠 A와 번갈아 붙여 반복이 덜 보이게 하는 두 번째 띠. 폭·색·둑은 띠 A와 같고 딱지 섬·불꽃 줄기 배치만 다름 | canvas 1536x1024 px |
| lava-end-cap | terrain | generated | 용암 강 끝 마개 (RR-011 방식 A) | 용암 강 줄이 끊기는 곳(강 시작·끝, 화산 경계)에 붙이는 둥근 끝. 띠와 같은 폭으로 왼쪽에서 들어와 둥글게 끝남 | canvas 1024x1024 px |

### lava-strip-a · 용암 강 띠 A (RR-011 방식 A)

상태: **generated** · 결과 1개

- 참조 1 (EXACT LOOK of the lava river in the approved gameplay concept: bright yellow-orange molten core with long flame streaks running along the river, red-orange edges, small dark crust islands, glowing cracks and dark basalt boulders on the banks): `assets/art-desk/lava-river-1/lava-strip-a/ref-1.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [1010, 0, 280, 430]
- 참조 2 (the same river lower in the concept: how the molten core, crust and basalt bank meet): `assets/art-desk/lava-river-1/lava-strip-a/ref-2.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [940, 530, 350, 279]
- 참조 3 (whole volcano panel: palette, outline weight, flat painterly colour planes, scale of the river next to the balls): `assets/art-desk/lava-river-1/lava-strip-a/ref-3.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [652, 0, 638, 809]

```text
[Ball Game art request · lava-river-1 / lava-strip-a]
용암 강 띠 A (RR-011 방식 A) — 화산 용암 강을 경로를 따라 휘어 붙이는 띠 그림. 강 폭 124 = 띠의 둑 바깥 끝 폭. 코드가 강 방향으로 천천히 밀어 흐름을 보임. drawLavaSurface 교체용

Attached references:
- Image 1: EXACT LOOK of the lava river in the approved gameplay concept: bright yellow-orange molten core with long flame streaks running along the river, red-orange edges, small dark crust islands, glowing cracks and dark basalt boulders on the banks
- Image 2: the same river lower in the concept: how the molten core, crust and basalt bank meet
- Image 3: whole volcano panel: palette, outline weight, flat painterly colour planes, scale of the river next to the balls

Paint one straight horizontal section of the volcano lava river from the approved gameplay concept (reference 1 is the target look), seen from the same elevated top-down view, as a seamlessly tileable strip. The river runs left to right across the full canvas width; its left and right edges must tile seamlessly with each other. The band is horizontal and centred vertically and takes about the middle 45% of the canvas height. From the centre outward: a bright yellow-orange molten core with long flame streaks flowing along the river direction (left to right), red-orange molten edges with a few small dark cooled-crust islands, then a narrow dark basalt bank with low dark rocks and thin glowing cracks along both sides. Outside the banks fade quickly to full transparency; the top and bottom of the canvas are fully transparent. Flat painterly colour planes and dark subtle outlines like reference 3. The flame streaks must clearly run along the river so that slowly scrolling the strip reads as flowing lava.

Output: PNG with true transparent background, canvas 1536x1024 px. 1 image.
Avoid: red dashed warning line, warning signs or any UI; balls, food pellets, text, arrows, range rings; a curved or diagonal river (keep it straight and horizontal); volcano ground, large boulders or trees outside the banks; opaque background or checkerboard; glow or bloom spilling into the transparent area; road-like centre dashes or a repeating diamond pattern; photoreal lava or heavy gradients
Rules: Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look. True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop. One isolated subject, centred, small even margin; do not crop the subject at the canvas edge. Keep the reference proportions; do not stretch or squash. No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them. Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting. Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.
Acceptance:
- 원화의 용암 강(참조 1·2)과 같은 불꽃 줄기·주황 가장자리·검은 둑으로 보임
- 가로로 곧고, 왼쪽 끝과 오른쪽 끝이 이어 붙음
- 띠 위아래 바깥은 투명
- 불꽃 줄기가 강 방향(가로)으로 흘러 밀면 흐름으로 보임
- UI·경고 표시 없음
```

### lava-strip-b · 용암 강 띠 B (RR-011 방식 A)

상태: **generated** · 결과 1개

- 참조 1 (EXACT LOOK of the lava river in the approved gameplay concept (lower stretch): molten core, crust islands, basalt bank): `assets/art-desk/lava-river-1/lava-strip-b/ref-1.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [940, 530, 350, 279]
- 참조 2 (the same river higher up in the concept: flame streaks and glowing cracks): `assets/art-desk/lava-river-1/lava-strip-b/ref-2.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [1010, 0, 280, 430]
- 참조 3 (whole volcano panel: palette, outline weight, flat painterly colour planes): `assets/art-desk/lava-river-1/lava-strip-b/ref-3.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [652, 0, 638, 809]

```text
[Ball Game art request · lava-river-1 / lava-strip-b]
용암 강 띠 B (RR-011 방식 A) — 띠 A와 번갈아 붙여 반복이 덜 보이게 하는 두 번째 띠. 폭·색·둑은 띠 A와 같고 딱지 섬·불꽃 줄기 배치만 다름

Attached references:
- Image 1: EXACT LOOK of the lava river in the approved gameplay concept (lower stretch): molten core, crust islands, basalt bank
- Image 2: the same river higher up in the concept: flame streaks and glowing cracks
- Image 3: whole volcano panel: palette, outline weight, flat painterly colour planes

Paint a second straight horizontal section of the same volcano lava river from the approved gameplay concept, as a seamlessly tileable strip, so it can alternate with another strip of the same river. Same layout as the first strip: the river runs left to right across the full canvas width with seamlessly tiling left and right edges; the band is horizontal, centred vertically and takes about the middle 45% of the canvas height. From the centre outward: bright yellow-orange molten core with long flame streaks flowing left to right, red-orange molten edges, then a narrow dark basalt bank with low dark rocks and thin glowing cracks on both sides; outside the banks fade quickly to full transparency, top and bottom of the canvas fully transparent. Vary only the details: place the dark cooled-crust islands, the flame streaks and the bank rocks differently, for example one slightly larger crust island and a wider bright streak. Flat painterly colour planes and dark subtle outlines like the references.

Output: PNG with true transparent background, canvas 1536x1024 px. 1 image.
Avoid: red dashed warning line, warning signs or any UI; balls, food pellets, text, arrows, range rings; a curved or diagonal river; a different band width, height or colour from a matching straight strip; opaque background or checkerboard; glow or bloom spilling into the transparent area; road-like centre dashes or a repeating diamond pattern; photoreal lava or heavy gradients
Rules: Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look. True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop. One isolated subject, centred, small even margin; do not crop the subject at the canvas edge. Keep the reference proportions; do not stretch or squash. No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them. Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting. Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.
Acceptance:
- 띠 A와 같은 폭·높이·색으로 번갈아 붙일 수 있음
- 왼쪽 끝과 오른쪽 끝이 이어 붙음
- 딱지 섬·불꽃 줄기 배치가 띠 A와 다름
- 띠 바깥은 투명
- UI·경고 표시 없음
```

### lava-end-cap · 용암 강 끝 마개 (RR-011 방식 A)

상태: **generated** · 결과 1개

- 참조 1 (EXACT LOOK of the lava river in the approved gameplay concept: molten core, red-orange edges, crust, basalt bank and glowing cracks): `assets/art-desk/lava-river-1/lava-end-cap/ref-1.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [1010, 0, 280, 430]
- 참조 2 (the cracked lava vent in the concept: how molten lava glows between dark basalt rocks and fades into thin cracks (use for the rounded basalt rim, not as the shape)): `assets/art-desk/lava-river-1/lava-end-cap/ref-2.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [660, 420, 200, 200]
- 참조 3 (whole volcano panel: palette and painterly style): `assets/art-desk/lava-river-1/lava-end-cap/ref-3.png` ← `assets/art-batches/scene-coherent-v1/gameplay-b-002.png` · 크롭 [652, 0, 638, 809]

```text
[Ball Game art request · lava-river-1 / lava-end-cap]
용암 강 끝 마개 (RR-011 방식 A) — 용암 강 줄이 끊기는 곳(강 시작·끝, 화산 경계)에 붙이는 둥근 끝. 띠와 같은 폭으로 왼쪽에서 들어와 둥글게 끝남

Attached references:
- Image 1: EXACT LOOK of the lava river in the approved gameplay concept: molten core, red-orange edges, crust, basalt bank and glowing cracks
- Image 2: the cracked lava vent in the concept: how molten lava glows between dark basalt rocks and fades into thin cracks (use for the rounded basalt rim, not as the shape)
- Image 3: whole volcano panel: palette and painterly style

Paint the rounded end of the volcano lava river from the approved gameplay concept, seen from the same elevated top-down view. The river enters straight from the left edge of the canvas, horizontal and vertically centred, with its band taking about the middle 45% of the canvas height (same width as a straight river strip), and it ends near the centre-right in a rounded pool-like end. Same layers as the river: bright yellow-orange molten core with flame streaks, red-orange molten edges with small dark crust, and a narrow dark basalt bank with low dark rocks and thin glowing cracks that wraps around the rounded end. At the left edge the band must be cut straight so it joins a straight strip seamlessly. Everything outside the bank fades quickly to full transparency. Flat painterly colour planes and dark subtle outlines like the references.

Output: PNG with true transparent background, canvas 1024x1024 px. 1 image.
Avoid: red dashed warning line, warning signs or any UI; balls, food pellets, text, arrows, range rings; an eruption, smoke column or volcano cone; opaque background or checkerboard; glow or bloom spilling into the transparent area; photoreal lava or heavy gradients
Rules: Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look. True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop. One isolated subject, centred, small even margin; do not crop the subject at the canvas edge. Keep the reference proportions; do not stretch or squash. No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them. Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting. Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.
Acceptance:
- 왼쪽에서 띠와 같은 폭으로 들어와 둥글게 끝남
- 왼쪽 끝이 곧게 잘려 띠와 이어 붙음
- 둑이 둥근 끝을 감쌈
- 바깥은 투명
- UI·경고 표시 없음
```
