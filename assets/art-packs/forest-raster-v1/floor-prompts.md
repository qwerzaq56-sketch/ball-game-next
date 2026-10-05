# Forest floor separation · 2026-10-06

Reference: ground-005.png. Built-in imagegen; generated originals preserved.

## floor-001 — rejected as empty underlay (too much baked foliage)

Create a seamless square forest ground texture for a 2D game, matching the attached reference's muted moss green palette and clean painterly vector-like shapes, softly oblique top view and subdued upper-left lighting. This is the SPARSE BASE FLOOR layer only: 85% quiet mossy green earth with broad gentle organic tonal patches, 15% tiny sparse low grass and fallen leaves, no large bushes, no rocks, no trees, no branches, no objects, no paths baked in, no bright lime highlights, no dark outlines, no UI. Maintain reference hue, intermediate dark moss olive greens, low contrast. Avoid speckled fine grain and uniform scattered dots. Seamless on both axes, no border. Other layers will be added by the game.

## floor-002 — empty moss underlay

Use attached forest image ONLY as color/style reference. Produce a NEW almost empty seamless moss-earth floor texture, NOT a leafy vegetation carpet. Remove EVERY identifiable leaf, clover, blade, bush, branch, rock, tree. 100% quiet bare moss-green earth made of broad smooth muted flat green/olive shapes, no black gaps, no fine mottled detail, no dots, no highlights. Colors sampled from the medium green moss area of reference, restrained hand painted vector-like style. Even low contrast surface, large subtle tonal patches only. Square seamless tile on both axes, no border, no scenery, no objects. This is an EMPTY UNDERLAY below separately rendered foliage.

Runtime: 800-world repeat shared with other raster biomes. Dense ground-005 overlays the empty floor through world-space forestDensity. Small SVG decals are independent, noninteractive assets with 18–29 world footprints. No rotation of baked lighting. This is a first compositing pass, not completion of every planned grass/path variant.
