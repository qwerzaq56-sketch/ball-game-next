"""Local review server with consistent JS/SVG MIME types on Windows."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8781)
args=parser.parse_args()
class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.json':'application/json'}
    def __init__(self,*a,**kw):
        super().__init__(*a,directory=str(Path(__file__).resolve().parent.parent),**kw)
print(f'http://127.0.0.1:{args.port}/index.html',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
