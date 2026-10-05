from pathlib import Path
root=Path('assets/terrain')
# Shared alpha at the real edge, irregular inland contour; no gameplay-classification change.
for direction,angle in [('north',0),('east',90),('south',180),('west',270)]:
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="115"><stop stop-color="white"/><stop offset=".6" stop-color="white" stop-opacity=".35"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs><g transform="rotate({angle} 200 200)"><path d="M0 0H400V72Q360 115 310 86T220 91T120 82T30 100L0 85Z" fill="url(#a)"/></g></svg>'''
 (root/f'mask-edge-{direction}.svg').write_text(svg,encoding='utf-8')
for direction in ['nw','ne','se','sw']:
 p=root/f'mask-corner-{direction}.svg';s=p.read_text(encoding='utf-8').replace('r="48"','r="100"');p.write_text(s,encoding='utf-8')
