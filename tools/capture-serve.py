"""Local review server that also saves canvas captures (look-dev master, tools/lookdev-capture.mjs).

python tools/capture-serve.py --port 8003 --out <dir>
Serves the repo like tools/serve.py; PUT /__capture/<name>.(png|jpg|webp) writes the body to --out.
Local only (127.0.0.1); names are restricted to letters, digits, '-' and '_'.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse, re
parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8003)
parser.add_argument('--out',default='reports/captures')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
out=Path(args.out) if Path(args.out).is_absolute() else root/args.out
out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.json':'application/json'}
    def __init__(self,*a,**kw):
        super().__init__(*a,directory=str(root),**kw)
    def do_PUT(self):
        m=re.fullmatch(r'/__capture/([A-Za-z0-9_-]{1,80}\.(?:png|jpg|webp))',self.path)
        if not m:
            self.send_error(400,'bad capture name');return
        data=self.rfile.read(int(self.headers.get('Content-Length',0)))
        (out/m.group(1)).write_bytes(data)
        self.send_response(204);self.end_headers()
print(f'http://127.0.0.1:{args.port}/index.html -> captures in {out}',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
