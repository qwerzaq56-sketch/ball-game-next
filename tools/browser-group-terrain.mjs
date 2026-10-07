import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 assert.equal(await page.locator('#mobile-ui-toggle').count(),1);assert(await page.locator('#live-ranking').isVisible());
 /* R-VIS-010: desktop starts in the quiet HUD, so the ranking is the compact overlay */assert.equal(await page.locator('#live-ranking').evaluate(e=>getComputedStyle(e).pointerEvents),'none');assert(await page.locator('#era-status').isVisible());
 await page.keyboard.press('u');assert.notEqual(await page.locator('#live-ranking').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 await page.locator('#mobile-ui-toggle').evaluate(e=>e.click());assert(await page.locator('#live-ranking').isVisible());
 await page.keyboard.press('F1');const cap=page.locator('label').filter({hasText:'최상위 포식자 최대 수'}).locator('input');assert.equal(await cap.inputValue(),'5');await cap.fill('7');assert.equal(await page.evaluate(()=>window.__game.balance.ecology.maxApex),7);
 await cap.press('u');assert.equal(await page.locator('#live-ranking').isVisible(),true);await cap.fill('5');await page.keyboard.press('F1');
 await page.evaluate(async()=>{
  const g=window.__game,{AIEntity}=await import('./js/ai.js');g.reset();g.entities=[g.player];const p=g.player;p.x=p.y=4000;p.size=150;p.color='green';p.colorHex='#22c55e';p.apex=true;p.specialCooldown=0;p._recomputeStacks(g.balance,true);g.ecology.timer=g.allyLinks.timer=10000;g.gameTime=10;
  const followers=Array.from({length:3},(_,i)=>new AIEntity({x:4000+70+i*30,y:4000,color:'green',colorHex:'#22c55e',startSize:100,balance:g.balance}));followers.forEach(e=>e.personality='growth');g.entities.push(...followers);g.buildGrid();g.abilities.start(p,0);g.abilities.update(.5);g.paused=true;g.render();
 });
 const group=await page.evaluate(async()=>{const g=window.__game,{scaledSkill}=await import('./js/skillCatalog.js'),r=scaledSkill(g.balance,g.player,'R'),group=g.allyLinks.groups.get(g.player.companionGroup);return {size:group.members.size,expected:4+(r.effect==='summon'?(r.summonCount??0):0),leader:group.leader===g.player,kind:g.allyLinks.personality(group)};});assert.equal(group.size,group.expected);assert.equal(group.leader,true);assert.equal(group.kind,'challenge');
 await page.screenshot({path:'reports/M38-green-group.png'});
 const terrain=await page.evaluate(()=>{const g=window.__game;return {width:g.balance.world.worldWidth,tiles:g.biomes.tiles.length,biomes:[...new Set(g.biomes.tiles.map(t=>t.region.id))],riverPoints:g.biomes.rivers.length};});assert.equal(terrain.width,8000);assert.equal(terrain.biomes.length,6);assert(terrain.riverPoints>25);
 await page.evaluate(()=>{const g=window.__game,r=g.biomes.regions.find(r=>r.id==='snow');g.gameTime=16;g.player.x=r.x;g.player.y=r.y;g.camera={x:r.x,y:r.y,zoom:.7};g.biomes.update(0);g.render();});await page.screenshot({path:'reports/M38-blizzard.png'});
 await page.evaluate(()=>{const g=window.__game,r=g.biomes.regions.find(r=>r.id==='volcano');g.player.x=r.x;g.player.y=r.y;g.camera={x:r.x,y:r.y,zoom:.4};g.render();});await page.screenshot({path:'reports/M38-lava-river.png'});
 await page.evaluate(async()=>{const g=window.__game,{startAttack}=await import('./js/combat.js');g.player.x=g.player.y=4000;g.camera={x:4000,y:4000,zoom:.8};g.player.attackStack=3;g.player.attackState='READY';startAttack(g.player,0,g.balance);g.render();});await page.screenshot({path:'reports/M38-attack-area.png'});
 assert.deepEqual(errors,[]);const result={status:'PASS',desktopToggle:true,shortcut:true,shortcutIgnoresInput:true,apexBalanceInput:true,greenRecruitment:group,terrain,errors};writeFileSync('reports/M38-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
