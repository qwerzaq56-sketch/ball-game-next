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
 const encounter=await page.evaluate(()=>{const g=window.__game;g.entities=[g.player];g.biomes.spawnEncounter();const orbs=g.entities.filter(e=>e.regionReward);return {actual:orbs.length,expected:g.biomes.regions.length*8,perRegion:g.biomes.regions.map(r=>orbs.filter(o=>o.regionReward===r.id).length),onLava:orbs.filter(o=>g.biomes.lavaAt(o,30)).length};});
 // spawnEncounter skips sample points on lava (remaining++/continue), so a region can get fewer than 8; assert the invariant, not an exact count.
 assert(encounter.actual<=encounter.expected&&encounter.perRegion.every(n=>n>=6&&n<=8),`encounter counts ${JSON.stringify(encounter)}`);assert.equal(encounter.onLava,0);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert(await page.locator('#minimap-panel').isVisible());await page.screenshot({path:`${prefix}-mobile.png`});
 await page.keyboard.press('H');assert(await page.locator('#play-help').isVisible());assert((await page.locator('#play-help').innerText()).includes('지역 탐험'));await page.keyboard.press('Escape');
 // R-ECO-010: a Life respawn lands off-centre, out of lava, with a 부활 무적 chip and a white ring
 await page.setViewportSize({width:1280,height:720});
 const respawn=await page.evaluate(()=>{const g=window.__game;g.paused=false;g.handlePlayerDefeat('DEFEATED');const p=g.player;return {x:p.x,y:p.y,inv:p.respawnInvulnerableRemaining,lava:!!g.biomes.lavaAt(p,p.size/2),centre:p.x===g.balance.world.worldWidth/2&&p.y===g.balance.world.worldHeight/2};});
 await page.waitForTimeout(200);assert.equal(respawn.inv>0,true);assert.equal(respawn.lava,false);assert.equal(respawn.centre,false);
 // R-WORLD-017: ?terrains forces or counts the round's terrains; a round without snow or desert runs blizzard/sandstorm timers without errors
 const terrains={};
 for(const [query,expect] of [['lake,volcano',['grassland','lake','volcano']],['2',null]]){
  await page.goto(`http://127.0.0.1:8001/?terrains=${query}`);await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
  const ids=await page.evaluate(()=>{const g=window.__game;g.autoplay.setEnabled(true);for(let i=0;i<60*30;i++)g.update(1/60);return g.biomes.regions.map(r=>r.id).sort();});
  await page.waitForTimeout(300);terrains[query]=ids;
  if(expect)assert.deepEqual(ids,expect);else{assert.equal(ids.length,3);assert(ids.includes('grassland'));}
 }
 await page.screenshot({path:`${prefix}-two-terrains.png`});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',regions:4,lava,encounter,minimap:true,mobile:true,respawn,terrains,errors}));
}finally{await browser.close();}
