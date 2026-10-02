import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const prefix=process.env.BROWSER_BIOME_PREFIX??'/tmp/M19';
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 await page.keyboard.press('F5');
 for(const id of ['forest','lake','snow','volcano']){
  const name=await page.evaluate(id=>{const g=window.__game;g.paused=true;const r=g.biomes.regions.find(r=>r.id===id);g.player.x=r.x;g.player.y=r.y;g.camera.x=r.x;g.camera.y=r.y;g.camera.zoom=.5;g.gameTime=16;return r.name;},id);
  await page.waitForTimeout(250);assert((await page.locator('#region-text').innerText()).includes(name));await page.screenshot({path:`${prefix}-${id}.png`});
 }
 const lava=await page.evaluate(()=>{const g=window.__game;g.entities=[g.player];g.biomes.damageTimer=0;g.paused=false;const before=g.player.hp;for(let i=0;i<30;i++)g.update(1/60);g.paused=true;return {before,after:g.player.hp,lives:g.lives};});assert(lava.after<lava.before);assert.equal(lava.lives,3);
 const encounter=await page.evaluate(()=>{const g=window.__game;g.entities=[g.player];g.biomes.spawnEncounter();return g.entities.filter(e=>e.regionReward).length;});assert.equal(encounter,32);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert(await page.locator('#minimap-panel').isVisible());await page.screenshot({path:`${prefix}-mobile.png`});
 await page.keyboard.press('H');assert(await page.locator('#play-help').isVisible());assert((await page.locator('#play-help').innerText()).includes('지역 탐험'));await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',regions:4,lava,encounter,minimap:true,mobile:true,errors}));
}finally{await browser.close();}
