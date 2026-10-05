"""Exact reference crops only; no retouching or alpha manipulation."""
from pathlib import Path
from PIL import Image
import hashlib,json
root=Path(__file__).resolve().parents[1]
source=root/'planning/art-concepts/ally-buffs-001.png'
out=root/'planning/art-concepts/effect-direction-v2/references'
out.mkdir(parents=True,exist_ok=True)
im=Image.open(source)
boxes={'shield-application':(515,2,1021,251),'empowerment-application':(515,258,1021,508),'frost-application':(515,515,1021,767),'heal-application':(515,773,1021,1023)}
items=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name,box in boxes.items():
 dest=out/(name+'.png');im.crop(box).save(dest)
 items.append({'id':name,'source':str(source.relative_to(root)),'sourceSize':list(im.size),'cropXYXY':list(box),'sourceSHA256':sha(source),'output':str(dest.relative_to(root)),'outputSHA256':sha(dest)})
(out/'crop-manifest.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'created':len(items),'sourceSHA256':sha(source)}))
