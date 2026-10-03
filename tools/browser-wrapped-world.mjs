import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const image=await page.evaluate(()=>{
  const g=window.__game,p=g.player,a=g.entities.find(e=>e.behavior==='ai');g.paused=true;g.ecology.timer=g.allyLinks.timer=10000;p.x=4990;p.y=2500;p.size=80;a.x=20;a.y=2600;a.size=40;a.color='red';a.colorHex='#ef4444';g.entities=[p,a];g.camera={x:4990,y:2500,zoom:1};
  const seen=[],draw=g.drawEntity;g.drawEntity=function(ctx,e){if(e===a){const m=ctx.getTransform();seen.push({x:m.a*e.x+m.c*e.y+m.e,y:m.b*e.x+m.d*e.y+m.f});}return draw.call(this,ctx,e);};
  const border=g.drawWorldBorder;g.drawWorldBorder=()=>{throw Error('wall drawn on wrapped map');};g.render();g.drawEntity=draw;g.drawWorldBorder=border;
  return {seen,expected:g.worldToScreen(a.x,a.y)};
 });assert(image.seen.some(p=>Math.abs(p.x-image.expected.x)<.001&&Math.abs(p.y-image.expected.y)<.001));await page.screenshot({path:'reports/M37-wrap-seam.png'});
 const large=await page.evaluate(()=>{const g=window.__game,a=g.entities[1];a.size=800;g.camera.x=4400;let drawn=0;const original=g.drawEntity;g.drawEntity=function(ctx,e){if(e===a)drawn++;return original.call(this,ctx,e);};g.render();g.drawEntity=original;return drawn;});assert(large>0,'opposite large body appears before camera view reaches the seam');
 const travel=[];
 for(const [x,y,key,axis]of [[4990,2500,'d','x'],[10,2500,'a','x'],[2500,4990,'s','y'],[2500,10,'w','y']]){
  await page.evaluate(({x,y,key})=>{const g=window.__game;g.entities=[g.player];g.player.x=x;g.player.y=y;g.camera.x=x;g.camera.y=y;g.input.keys=new Set([key]);g.paused=false;}, {x,y,key});await page.waitForTimeout(150);
  const state=await page.evaluate(()=>{const g=window.__game;g.input.keys.clear();g.paused=true;return {x:g.player.x,y:g.player.y,screen:g.worldToScreen(g.player.x,g.player.y)};});
  assert(key==='d'||key==='s'?state[axis]<100:state[axis]>4900);assert(Math.abs(state.screen.x-422)<80&&Math.abs(state.screen.y-195)<80);travel.push({key,...state});
 }
 await page.locator('#mobile-ui-toggle').click();await page.keyboard.press('F5');await page.waitForTimeout(80);assert(await page.locator('#minimap-panel').isVisible());
 await page.evaluate(()=>{const g=window.__game;g.player.x=4990;g.player.y=4990;g.camera={x:4990,y:4990,zoom:1};g.render();});await page.waitForTimeout(80);await page.screenshot({path:'reports/M37-wrap-corner-minimap.png'});
 assert.deepEqual(errors,[]);const result={status:'PASS',periodicRendering:true,oppositeActorProjection:true,largeBodyBeforeSeam:true,noWalls:true,allFourEdges:true,cameraContinuous:true,minimap:true,image,travel,errors};writeFileSync('reports/M37-wrap-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
