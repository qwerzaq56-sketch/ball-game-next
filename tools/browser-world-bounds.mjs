import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 const result=await page.evaluate(()=>{
  const g=window.__game,world=g.balance.world,W=world.worldWidth,H=world.worldHeight,wrapPos=(v,n)=>((v%n)+n)%n;g.paused=true;g.entities=[g.player];g.player.size=6000;g.player.x=g.player.y=-1000;g.clampAllToWorld();g.updateCamera(1);g.render();
  const oversized={x:g.player.x,y:g.player.y,size:g.player.size,camera:{...g.camera},expected:world.wrap?{x:wrapPos(-1000,W),y:wrapPos(-1000,H),size:6000}:{x:2500,y:2500,size:6000}};
  const gapOf=(a,b)=>{let dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);if(world.wrap){dx=Math.min(dx,W-dx);dy=Math.min(dy,H-dy);}return Math.hypot(dx,dy);};
  g.player.size=1800;g.player.x=g.player.y=2500;g.pickSafeSpawnPos=()=>({x:2850,y:2500});
  const births=Array.from({length:100},()=>{const e=g.createSafeEnemy(g.balance.colors[0]);return {gap:gapOf(e,g.player),required:Math.max(350,(e.size+g.player.size)/2+80),x:e.x,y:e.y,size:e.size,inside:world.wrap?(e.x>=0&&e.x<W&&e.y>=0&&e.y<H):(e.x>=e.size/2&&e.x<=W-e.size/2&&e.y>=e.size/2&&e.y<=H-e.size/2)};});
  return {oversized,births,world:{W,H,wrap:world.wrap}};
 });assert.equal(result.oversized.x,result.oversized.expected.x);assert.equal(result.oversized.y,result.oversized.expected.y);assert.equal(result.oversized.size,result.oversized.expected.size);for(const e of result.births){assert(e.gap>=e.required);assert(e.inside);}assert.deepEqual(errors,[]);
 await writeFile(join(tmpdir(),'M24-browser-world-bounds.json'),JSON.stringify({result:'PASS',...result,errors},null,2));console.log(JSON.stringify({result:'PASS',world:result.world,oversized:result.oversized,safeBirths:result.births.length,errors}));
}finally{await browser.close();}
