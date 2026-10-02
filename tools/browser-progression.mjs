import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.evaluate(()=>window.__game.paused=true);await page.waitForTimeout(50);
 assert.match(await page.locator('#growth-goal-text').innerText(),/공격 해금.*40/);
 await page.evaluate(()=>{const g=window.__game;g.player.addGrowth(4000,g.balance);g.player.attackStack=0;const a=g.entities.find(e=>e.behavior==='ai');a.size=120;a._recomputeStacks(g.balance);a.attackStack=0;});
 await page.keyboard.press('F1');await page.locator('#debug-panel label').filter({hasText:'Attack 2nd Stack Size'}).locator('input').fill('200');
 const states=await page.evaluate(()=>{const g=window.__game;return [g.player,...g.entities.filter(e=>e.behavior==='ai'&&e.size===120)].map(e=>({stack:e.attackStack,max:e.attackMaxStack}));});assert(states.length>=2);for(const e of states)assert.deepEqual(e,{stack:0,max:1});
 await page.waitForTimeout(50);assert.match(await page.locator('#growth-goal-text').innerText(),/공격 2스택.*200/);
 await page.locator('#debug-panel label').filter({hasText:'Attack 2nd Stack Size'}).locator('input').fill('100');assert.equal(await page.evaluate(()=>window.__game.player.attackStack),1);await page.keyboard.press('F1');
 await page.evaluate(()=>{window.__game.player.size=45;});await page.waitForTimeout(50);assert.match(await page.locator('#growth-goal-text').innerText(),/회피 해금.*50/);
 await page.evaluate(async()=>{const {resetRandom,random}=await import('/js/random.js');const {nextSkillGoal}=await import('/js/progression.js');resetRandom(8);const expected=random('ai');resetRandom(8);const g=window.__game,before=JSON.stringify(g.snapshot());for(let i=0;i<100;i++)nextSkillGoal(g.player,g.balance);if(expected!==random('ai')||before!==JSON.stringify(g.snapshot()))throw Error('progression changed gameplay');});
 await page.evaluate(()=>document.getElementById('pause-indicator').style.display='none');await page.screenshot({path:'reports/M14-growth-goal.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);const hud=await page.locator('#hud').boundingBox();assert(hud.x>=0&&hud.x+hud.width<=390&&hud.y+hud.height<=844);await page.screenshot({path:'reports/M14-growth-mobile.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',growthGoal:true,liveThresholds:true,capacityClamp:true,presentationPurity:true,mobile:true,errors}));
}finally{await browser.close();}
