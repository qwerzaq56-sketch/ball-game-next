import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 await page.evaluate(()=>{const g=window.__game,p=g.player;g.entities=[p];g.ecology.timer=g.allyLinks.timer=10000;p.size=80;p.attackUnlocked=p.dodgeUnlocked=true;p.attackStack=2;p.attackMaxStack=3;p.dodgeStack=1;p.dodgeMaxStack=2;p.attackStackTimer=g.balance.attack.attackCooldown*.5;p.dodgeStackTimer=g.balance.dodge.dodgeCooldown*.5;});await page.waitForTimeout(100);
 const attack=page.locator('#touch-attack'),dodge=page.locator('#touch-dodge');assert.equal(await attack.getAttribute('data-charges'),'2/3');assert.equal(await dodge.getAttribute('data-charges'),'1/2');assert.match(await attack.getAttribute('aria-label'),/충전 2\/3/);assert.equal(await attack.getAttribute('data-state'),'ready');assert(Number(await attack.getAttribute('data-progress'))>=50);
 await page.screenshot({path:'reports/M33-charge-buttons.png'});
 await page.evaluate(()=>{const g=window.__game;g.paused=true;g.player.attackStack=0;});await page.waitForTimeout(70);assert.equal(await attack.getAttribute('data-state'),'cooldown');assert(await attack.isDisabled());assert.match(await attack.innerText(),/충전 중/);
 await page.evaluate(()=>{const p=window.__game.player;p.attackStack=2;p.frozen=1;});await page.waitForTimeout(70);assert.equal(await attack.getAttribute('data-state'),'frozen');assert(await dodge.isDisabled());
 await page.evaluate(()=>{const p=window.__game.player;p.frozen=0;p.attackState='TELEGRAPH';});await page.waitForTimeout(70);assert.equal(await attack.getAttribute('data-state'),'busy');
 await page.evaluate(()=>{const p=window.__game.player;p.attackState='READY';p.companionGroup=1;});await page.waitForTimeout(70);assert.equal(await attack.getAttribute('data-state'),'paused');assert(await attack.isDisabled());
 await page.evaluate(()=>{const p=window.__game.player;p.companionGroup=null;p.apex=true;p.specialCooldown=2.2;});await page.waitForTimeout(70);assert.equal(await page.locator('#touch-special').getAttribute('data-state'),'cooldown');assert.match(await page.locator('#touch-special').innerText(),/E 3s/);
 assert.deepEqual(errors,[]);const result={status:'PASS',charges:true,rechargeProgress:true,accessibleLabels:true,cooldownFrozenBusyCompanion:true,specialCountdown:true,errors};writeFileSync('reports/M33-touch-feedback.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
