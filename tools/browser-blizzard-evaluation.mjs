import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const state=await page.evaluate(async()=>{const g=window.__game;g.paused=true;const snow=g.biomes.regions.find(r=>r.id==='snow');g.player.x=g.camera.x=snow.x;g.player.y=g.camera.y=snow.y;g.camera.zoom=1;g.gameTime=17;g.entities=[g.player];const {spawnOrb}=await import('./js/spawning.js');const near=spawnOrb(g.balance,{x:snow.x+100,y:snow.y}),far=spawnOrb(g.balance,{x:snow.x+500,y:snow.y});g.entities.push(near,far);g.buildGrid();g.render();return{radius:g.biomes.playerSightRadius(),near:g.biomes.playerCanSee(near),far:g.biomes.playerCanSee(far),labels:g.biomes.labels.every(l=>g.biomes.regionAt(l).id===l.id)};});
 assert.equal(state.radius,208);assert(state.near&&!state.far&&state.labels);
 await page.screenshot({path:'reports/M40-snow-fog.png'});
 const pixels=await page.evaluate(()=>{const g=window.__game;const canvas=g.canvas;g.gameTime=17;g.render();const a=canvas.toDataURL();g.gameTime=18;g.render();return{static:a===canvas.toDataURL()};});assert(pixels.static);
 const clear=await page.evaluate(()=>{const g=window.__game;g.gameTime=24;g.render();return g.biomes.playerSightRadius()===Infinity;});assert(clear);
 await page.screenshot({path:'reports/M40-snow-clear.png'});
 await page.keyboard.press('F1');assert((await page.locator('body').innerText()).includes('플레이 평가 기준'));assert((await page.locator('#evaluation-summary').innerText()).includes('구간 충족'));const exported=await page.evaluate(()=>{const g=window.__game;g.autoplay.setEnabled(true);g.runMetrics.observe(g,1);return g.runMetrics.export(g);});assert.equal(exported.evaluation.targetSeconds,5);assert.equal(exported.samples.at(-1).purposeful,true);
 await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{window.__game.gameTime=17;window.__game.render();});await page.screenshot({path:'reports/M40-snow-mobile.png'});
 assert.deepEqual(errors,[]);const result={result:'PASS',...state,...pixels,clear,mobile:true,errors};writeFileSync('reports/M40-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
