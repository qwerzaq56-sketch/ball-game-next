// Drag title bars only, leaving panel inputs and content scrolling available.
export function installMovablePanels(){
 const selector='#ecology-panel .observer-heading,#live-ranking .observer-heading,#minimap-panel .minimap-heading,#debug-panel h2,#ai-inspector .ai-head,#play-help .help-heading,#minimal-tools';
 const panels=new Set();let drag=null;
 const clamp=(panel,x,y)=>{const r=panel.getBoundingClientRect();panel.style.left=`${Math.max(0,Math.min(x,Math.max(0,innerWidth-r.width)))}px`;panel.style.top=`${Math.max(0,Math.min(y,Math.max(0,innerHeight-Math.min(r.height,innerHeight))))}px`;};
 document.addEventListener('pointerdown',e=>{const handle=e.target.closest?.(selector);if(!handle||e.target.closest('button,input,select,textarea,a')||e.button>0)return;const panel=handle.id==='minimal-tools'?handle:handle.parentElement,r=panel.getBoundingClientRect();e.preventDefault();handle.setPointerCapture(e.pointerId);panel.style.position='fixed';panel.style.right='auto';panel.style.bottom='auto';panel.style.margin='0';panel.style.transform='none';panel.classList.add('panel-moved');clamp(panel,r.left,r.top);panels.add(panel);drag={id:e.pointerId,panel,x:e.clientX,y:e.clientY,left:r.left,top:r.top};});
 document.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();clamp(drag.panel,drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>{if(drag?.id===e.pointerId)drag=null;});
 window.addEventListener('blur',()=>{drag=null;});window.addEventListener('resize',()=>{drag=null;for(const panel of panels){const r=panel.getBoundingClientRect();clamp(panel,r.left,r.top);}});
}
