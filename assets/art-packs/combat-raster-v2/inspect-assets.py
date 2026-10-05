from pathlib import Path
from PIL import Image
import hashlib, json

folder = Path(__file__).resolve().parent
records = []
for file in sorted(folder.glob('*.png')):
    image = Image.open(file)
    alpha = image.getchannel('A')
    hist = alpha.histogram()
    records.append({'file': file.name, 'size': list(image.size), 'mode': image.mode, 'alphaExtrema': alpha.getextrema(), 'alphaZeroFraction': hist[0] / (image.width * image.height), 'visibleAlpha32BBoxXYXY': alpha.point(lambda a: 255 if a > 32 else 0).getbbox(), 'visibleAlpha128BBoxXYXY': alpha.point(lambda a: 255 if a > 128 else 0).getbbox(), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
(folder / 'asset-metrics.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(records, ensure_ascii=False))
