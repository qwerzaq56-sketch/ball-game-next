"""Small resumable art workflow. Generation uses Codex's built-in imagegen separately."""
import argparse,json,subprocess,hashlib,shutil,zipfile
from pathlib import Path
from datetime import datetime,timezone
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/art-batches/scene-coherent-v1'
parser=argparse.ArgumentParser();parser.add_argument('action',choices=['prepare','record','status','pack']);parser.add_argument('--id');parser.add_argument('--file',type=Path);args=parser.parse_args()
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
if args.action=='prepare':
 OUT.mkdir(parents=True,exist_ok=True)
 catalog=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {DEFAULT_OBJECT_IDS,BIOME_OBJECTS} from './js/biomeObjectCatalog.js';console.log(JSON.stringify(DEFAULT_OBJECT_IDS.map(id=>({id,...BIOME_OBJECTS[id]}))))"],cwd=ROOT,text=True,encoding='utf-8'))
 refs=ROOT/'planning/art-concepts'
 rows={'grass-garland':('a',0),'grass-wind-stack':('a',1),'forest-berry-grove':('a',2),'lake-garland':('a',4),'lake-current':('b',0),'lake-vortex':('b',1),'desert-obelisk':('b',3),'volcano-obsidian-stack':('b',4),'volcano-vent-cycle':('b',5)}
 revised={'forest-tree':(140,12,380,214),'snow-flowers':(140,268,390,494),'snow-shelter':(110,518,410,741),'desert-oasis':(110,770,430,1014)}
 descriptions={'grass-garland':'small cream flower cluster with dark green leaves','grass-wind-stack':'grey wind stone with pale carved spiral','forest-berry-grove':'rounded low dark green bush with red berries','forest-tree':'short thick trunk and rounded layered guardian canopy','lake-garland':'three open pale shells with pearls','lake-current':'gently curved blue current ribbon; no baked arrows','lake-vortex':'blue spiral whirlpool; no baked danger ring','snow-flowers':'three crystalline blue ice flowers with small cream centers','snow-shelter':'low semicircle of snow-capped rocks, not a cave doorway','desert-oasis':'small teal pool edged by warm rocks, reeds and lily pads, no palm tree','desert-obelisk':'angular warm sandstone standing slab with subtle carved spiral','volcano-obsidian-stack':'dark violet angular obsidian crystal cluster','volcano-vent-cycle':'dark broken rock vent with restrained orange heat in the center'}
 prior=json.loads((OUT/'manifest.json').read_text(encoding='utf-8')) if (OUT/'manifest.json').exists() else {'items':[]}
 states={i['id']:i for i in prior['items']};items=[]
 for c in catalog:
  ident=c['id'];folder=OUT/ident;folder.mkdir(exist_ok=True)
  if ident in revised:source=refs/'objects-t3-r2-001.png';box=revised[ident]
  else:
   sheet,row=rows[ident];source=refs/f'objects-t3{sheet}-001.png';height=146 if sheet=='a' else 170;box=(230,row*height+8,560,(row+1)*height-7)
  Image.open(source).crop(box).save(folder/'reference.png')
  scene=refs/('gameplay-regions-a-001.png' if c['region'] in ['grassland','forest','lake'] else 'gameplay-regions-b-001.png')
  prompt=f"Extract and faithfully reconstruct only this planned game object: {descriptions[ident]}. Reference 1 is the cropped original object design. Reference 2 is the authoritative FINAL GAMEPLAY LOOK: match its muted palette, broad flat organic color planes, soft restrained upper-left lighting, dark but subtle outlines, elevated top-down view and readable detail density. Overall harmony with reference 2 takes priority over copying every individual detail. Keep the object silhouette and gameplay identity of reference 1. Single isolated object on true transparency, centered with margin, no surrounding terrain, balls, UI, text, range rings, arrows or flying buff particles. Do not add glossy gradients, photoreal textures, tiny noisy leaves, exaggerated volume, new ornaments or a different camera. No rotation or mirroring of lighting. Preserve compact scene-scale proportions. For shelter and oasis keep a healthy continuous-benefit body, no depleted state. This is a reusable scene-coherent asset, not a redesign or a screenshot."
  (folder/'prompt.txt').write_text(prompt,encoding='utf-8')
  items.append({**states.get(ident,{}),'id':ident,'name':c['name'],'region':c['region'],'references':[str(folder/'reference.png'),str(scene)],'originalReference':str(source),'crop':box,'prompt':prompt,'status':states.get(ident,{}).get('status','prepared'),'output':str(folder/'asset.png')})
 write(OUT/'manifest.json',{'version':1,'scope':'13 current planned object identities; archived function aliases reuse these identities','finalLook':'gameplay-regions-a-001','generation':'built-in imagegen, one call per item','items':items})
elif args.action=='record':
 manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'));item=next(i for i in manifest['items'] if i['id']==args.id)
 target=Path(item['output']);source=args.file.resolve()
 if target.exists():raise SystemExit('Preserve existing output; create a new batch version for retries.')
 shutil.copy2(source,target);im=Image.open(target)
 item.update(status='generated-review-pending',size=im.size,mode=im.mode,alphaExtrema=im.getchannel('A').getextrema() if im.mode=='RGBA' else None,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),generatedSource=str(source))
 write(OUT/'manifest.json',manifest)
 with (OUT/'history.jsonl').open('a',encoding='utf-8') as log:log.write(json.dumps({'time':datetime.now(timezone.utc).isoformat(),'id':args.id,'action':'record','status':item['status'],'sha256':item['sha256']},ensure_ascii=False)+'\n')
elif args.action=='pack':
 if not args.file:raise SystemExit('pack requires --file output.zip')
 if args.file.exists():raise SystemExit('Existing archive preserved; choose a versioned name.')
 files=list(OUT.rglob('*'))+[ROOT/'tools/art-batch.py',ROOT/'tools/ART_BATCH_README.md',ROOT/'tools/art-batch-review.html',ROOT/'js/biomeObjectCatalog.js']
 files += [ROOT/'planning/art-concepts'/name for name in ['objects-t3a-001.png','objects-t3b-001.png','objects-t3-r2-001.png','gameplay-regions-a-001.png','gameplay-regions-b-001.png']]
 args.file.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(args.file,'x',compression=zipfile.ZIP_DEFLATED) as archive:
  for path in files:
   if path.is_file():archive.write(path,path.relative_to(ROOT))
 print(str(args.file.resolve()))
m=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
print(json.dumps({'items':len(m['items']),'generated':sum(i['status']=='generated-review-pending' for i in m['items']),'manifest':str(OUT/'manifest.json')},ensure_ascii=False))

