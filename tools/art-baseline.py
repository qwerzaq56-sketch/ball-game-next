"""Prepare once; verify approved original art/prompt hashes. Never re-approve."""
import argparse, hashlib, json, subprocess, sys, tempfile
from pathlib import Path
IDS=('ball-002-refined','gameplay-regions-a-001','gameplay-regions-b-001','ally-buffs-001','objects-t3a-001','objects-t3b-001','terrain-t1-001','concept-002-vector')
MANIFEST='planning/art-baselines/initial/manifest.json'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def git(root,*args):
 result=subprocess.run(['git','-C',str(root),*args],capture_output=True,text=True)
 return result.stdout.strip() if result.returncode==0 else None
def prepare(root,manifest):
 if manifest.exists(): raise ValueError('Existing manifest is immutable; prepare refuses overwrite.')
 items=[];missing=[]
 for name in IDS:
  paths=[f'planning/art-concepts/{name}.png',f'planning/art-concepts/{name}-prompt.md']
  if not all((root/p).is_file() for p in paths):
   missing.append({'id':name,'missingPaths':[p for p in paths if not (root/p).is_file()]});continue
  files=[]
  for path in paths:
   files.append({'path':path,'sha256':sha(root/path),'bytes':(root/path).stat().st_size,'lastCommit':git(root,'log','-1','--format=%H','--',path),'workingTreeStatus':git(root,'status','--porcelain','--',path)})
  items.append({'id':name,'files':files,'exactPromptSource':paths[1],'promptReuse':'Read exact generation prompt in original source markdown; do not paraphrase or replace source. Full file SHA covers wording and surrounding provenance.'})
 if not items: raise ValueError('No complete image/prompt pair found.')
 data={'schema':1,'basis':'Current user-approved repository files at prepare time; not proof of original generation bytes. Git provenance is recorded and may be unavailable. No automatic approval refresh.','head':git(root,'rev-parse','HEAD'),'items':items,'missingRequested':missing}
 manifest.parent.mkdir(parents=True,exist_ok=True)
 with manifest.open('x',encoding='utf-8') as file:json.dump(data,file,ensure_ascii=False,indent=2);file.write('\n')
 return {'ok':True,'prepared':len(items),'manifest':str(manifest),'missingRequested':missing}
def verify(root,manifest):
 data=json.loads(manifest.read_text(encoding='utf-8'));issues=[]
 for item in data['items']:
  for entry in item['files']:
   path=(root/entry['path']).resolve()
   if not path.is_relative_to(root.resolve()):issues.append({'path':entry['path'],'reason':'outside-root'});continue
   if not path.is_file():issues.append({'path':entry['path'],'reason':'missing'});continue
   actual=sha(path)
   if actual!=entry['sha256']:issues.append({'path':entry['path'],'reason':'changed','expected':entry['sha256'],'actual':actual})
 return {'ok':not issues,'verifiedPairs':len(data['items']),'issues':issues,'missingRequested':data.get('missingRequested',[])}
def self_test():
 with tempfile.TemporaryDirectory(prefix='ball-art-baseline-') as tmp:
  root=Path(tmp);folder=root/'planning/art-concepts';folder.mkdir(parents=True)
  image=folder/'ball-002-refined.png';image.write_bytes(b'fixture original')
  (folder/'ball-002-refined-prompt.md').write_text('exact fixture prompt')
  manifest=root/MANIFEST;prepare(root,manifest);before=manifest.read_bytes()
  assert verify(root,manifest)['ok']
  image.write_bytes(b'fixture changed');assert verify(root,manifest)['issues'][0]['reason']=='changed'
  try:prepare(root,manifest)
  except ValueError:pass
  else:raise AssertionError('Overwrite accepted')
  assert manifest.read_bytes()==before
  image.unlink();assert verify(root,manifest)['issues'][0]['reason']=='missing'
 return {'ok':True,'checks':['unchanged-passes','sha-change-fails','manifest-overwrite-refused','missing-fails'],'fixtureOnly':True}
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['prepare','verify','self-test']);parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);parser.add_argument('--manifest',type=Path);parser.add_argument('--json','--JSON',dest='json',action='store_true');args=parser.parse_args()
 try:
  root=args.root.resolve();manifest=args.manifest or root/MANIFEST
  result=self_test() if args.command=='self-test' else prepare(root,manifest) if args.command=='prepare' else verify(root,manifest)
 except (OSError,ValueError,KeyError,json.JSONDecodeError) as error:result={'ok':False,'error':str(error)}
 print(json.dumps(result,ensure_ascii=False,indent=2) if args.json else ('PASS' if result['ok'] else 'FAIL')+' '+json.dumps(result,ensure_ascii=False))
 return 0 if result['ok'] else 1
if __name__=='__main__':sys.exit(main())
