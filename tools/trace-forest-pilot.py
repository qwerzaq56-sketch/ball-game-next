import sys,json,time,argparse
from pathlib import Path
parser=argparse.ArgumentParser(description='Trace the preserved forest pilot PNG; install vtracer==0.6.15 and Pillow separately.')
parser.add_argument('--dependency-dir',type=Path)
args=parser.parse_args()
if args.dependency_dir: sys.path.insert(0,str(args.dependency_dir.resolve()))
import vtracer
from PIL import Image
root=Path('assets/art-packs/forest-raster-v1');start=time.perf_counter()
vtracer.convert_image_to_svg_py(str(root/'tree-001.png'),str(root/'tree-001-traced.svg'),colormode='color',hierarchical='stacked',mode='spline',filter_speckle=8,color_precision=5,layer_difference=16,path_precision=2)
s=(root/'tree-001-traced.svg').read_text();im=Image.open(root/'tree-001.png');alpha=im.getchannel('A') if im.mode=='RGBA' else None
report={'engine':'vtracer 0.6.15','seconds':time.perf_counter()-start,'pngBytes':(root/'tree-001.png').stat().st_size,'svgBytes':(root/'tree-001-traced.svg').stat().st_size,'paths':s.count('<path'),'pngSize':im.size,'alphaExtrema':alpha.getextrema() if alpha else None,'selectedRuntime':'PNG; SVG comparison only pending visual review'}
(root/'trace-metrics.json').write_text(json.dumps(report,indent=2));print(report)
