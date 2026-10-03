// Conservative view tests; these never change simulation or consume randomness.
export function worldView(canvas,camera){
 const x=canvas.width/(2*camera.zoom),y=canvas.height/(2*camera.zoom);
 return {left:camera.x-x,right:camera.x+x,top:camera.y-y,bottom:camera.y+y};
}
export function boxInView(view,left,top,right,bottom,padding=0){
 return right+padding>=view.left&&left-padding<=view.right&&bottom+padding>=view.top&&top-padding<=view.bottom;
}
export function segmentInView(view,a,b,padding=0){
 return boxInView(view,Math.min(a.x,b.x),Math.min(a.y,b.y),Math.max(a.x,b.x),Math.max(a.y,b.y),padding);
}
