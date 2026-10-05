from pathlib import Path
import hashlib, json
from PIL import Image

folder = Path(__file__).resolve().parent
root = folder.parents[2]
source = root / 'planning/art-concepts/effect-direction-v2/combat-002.png'
regions = {'charge': (700, 116, 832, 223), 'impact': (876, 113, 946, 199), 'dodge': (646, 377, 780, 482), 'growth': (705, 810, 839, 934)}
image = Image.open(source)
records = []
for asset, box in regions.items():
    target = folder / 'references' / (asset + '-combat-002.png')
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        raise SystemExit('Preserve existing crop: ' + str(target))
    image.crop(box).save(target)
    records.append({'id': asset, 'source': str(source.relative_to(root)).replace('\\', '/'), 'sourceSize': list(image.size), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'boxXYXY': list(box), 'crop': str(target.relative_to(root)).replace('\\', '/'), 'cropSha256': hashlib.sha256(target.read_bytes()).hexdigest()})
(folder / 'references/crop-manifest.json').write_text(json.dumps({'version': 1, 'rowsExcluded': [3], 'items': records}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(records, ensure_ascii=False))
