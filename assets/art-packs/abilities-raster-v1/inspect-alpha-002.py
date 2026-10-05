from pathlib import Path
from PIL import Image
import json
p=Path(__file__).resolve().parent
rows=[]
for path in sorted(p.glob('*-002.png')):
 im=Image.open(path).convert('RGBA');pixels=list(im.getdata());counts={}
 for low,high in [(0,0),(1,15),(16,63),(64,127),(128,254),(255,255)]:
  counts[f'{low}-{high}']=sum(low<=px[3]<=high for px in pixels)
 hidden=sum(px[3]==0 and max(px[:3])>0 for px in pixels)
 rows.append({'id':path.stem,'pixels':len(pixels),'alphaBands':counts,'alphaZeroNonzeroRGB':hidden,'alphaZeroRGBInvisibleInCanvas':True,'visibleRGBBounds':{c:[min(px[i] for px in pixels if px[3]>0),max(px[i] for px in pixels if px[3]>0)] for i,c in enumerate('RGB')},'interpretation':'Alpha-zero RGB cannot establish visible haze. Positive low-alpha pixels may contribute faint haze; assess cached alpha curve and actual Canvas composition.'})
(p/'visible-alpha-qc-002.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps(rows))
