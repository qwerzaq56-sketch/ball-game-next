import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 for(const [width,height] of [[844,390],[390,844],[812,375]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);
  assert.equal(await page.locator('#mobile-orientation-hint').isVisible(),height>width);
  const hud=await page.locator('#hud').boundingBox(),stick=await page.locator('#touch-stick').boundingBox(),actions=await page.locator('#touch-actions').boundingBox();
  assert(hud.height<100);assert(hud.y+hud.height<stick.y);assert(stick.x+stick.width<width/2);assert(actions.x>width/2);assert(actions.x+actions.width<=width);
  const result=await page.evaluate(()=>{
   const g=window.__game,p=g.player,c=g.ctx;p.x=900;p.y=1000;p.size=80;g.entities=[p];g.paused=false;g.camera.x=950;g.camera.y=970;g.camera.zoom=.65;
   g.touchAim={angle:-Math.PI/4};const strokes=[],original=c.stroke;
   c.stroke=function(...args){if(this.strokeStyle==='#ffffff'&&this.lineCap==='round'){const m=this.getTransform();strokes.push({x:m.e,y:m.f,color:this.strokeStyle});}return original.apply(this,args);};
   g.render();c.stroke=original;
   const expected=g.worldToScreen(p.x,p.y),pixel=c.getImageData(Math.floor(expected.x)-1,Math.floor(expected.y)-1,3,3).data;
   return {expected,origin:strokes.at(-1),pixel:[...pixel],canvas:[g.canvas.width,g.canvas.height]};
  });
  assert(Math.abs(result.expected.x-result.origin.x)<.001);assert(Math.abs(result.expected.y-result.origin.y)<.001);assert.equal(result.origin.color,'#ffffff');assert(Array.from({length:9},(_,i)=>result.pixel.slice(i*4,i*4+3).every(v=>v>230)).some(Boolean),'white pixels around the center');assert.deepEqual(result.canvas,[width,height]);
  checks.push({width,height,hudHeight:hud.height,...result});
 }
 await page.evaluate(()=>{const g=window.__game;g.camera.x=g.player.x;g.camera.y=g.player.y;g.touchAim={angle:-Math.PI/4};g.render();});
 await page.screenshot({path:'reports/M32-landscape-white-arrow.png'});
 await page.locator('#mobile-ui-toggle').click();await page.waitForTimeout(100);const hud=await page.locator('#hud').boundingBox(),stick=await page.locator('#touch-stick').boundingBox();assert(hud.y+hud.height<stick.y);assert(await page.locator('#live-ranking').isVisible());
 assert.deepEqual(errors,[]);const result={status:'PASS',automaticOrientation:true,centeredCanvasArrow:true,whiteArrow:true,landscapeControlSeparation:true,fullHUDScroll:true,checks,errors};writeFileSync('reports/M32-landscape-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
