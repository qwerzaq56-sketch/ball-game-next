import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 const result=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;g.entities=[g.player];g.player.size=6000;g.player.x=g.player.y=-1000;g.clampAllToWorld();g.updateCamera(1);g.render();
  const oversized={x:g.player.x,y:g.player.y,size:g.player.size,camera:{...g.camera}};
  g.player.size=1800;g.player.x=g.player.y=2500;g.pickSafeSpawnPos=()=>({x:2850,y:2500});
  const births=Array.from({length:100},()=>{const e=g.createSafeEnemy(g.balance.colors[0]);return {gap:Math.hypot(e.x-g.player.x,e.y-g.player.y),required:Math.max(350,(e.size+g.player.size)/2+80),x:e.x,y:e.y,size:e.size};});
  return {oversized,births};
 });assert.equal(result.oversized.x,2500);assert.equal(result.oversized.y,2500);assert.equal(result.oversized.size,6000);for(const e of result.births){assert(e.gap>=e.required);assert(e.x>=e.size/2&&e.x<=5000-e.size/2);assert(e.y>=e.size/2&&e.y<=5000-e.size/2);}assert.deepEqual(errors,[]);
 await writeFile('/tmp/M24-browser-world-bounds.json',JSON.stringify({result:'PASS',...result,errors},null,2));console.log(JSON.stringify({result:'PASS',oversized:result.oversized,safeBirths:result.births.length,errors}));
}finally{await browser.close();}
