// R-CTRL-007: situational tips appear on their own (here: attack still locked after the start guide), stay on screen
// clear of the vitals and ability bar, hide while help is open, and "팁 끄기" turns them off for this device.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[],results={};
const overlaps=(a,b)=>a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
for(const [name,viewport,touch] of [['desktop',{width:1280,height:720},false],['portrait',{width:390,height:844},true],['landscape',{width:844,height:390},true]]){
 const context=await browser.newContext({viewport,isMobile:touch,hasTouch:touch}),page=await context.newPage();page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);
 await page.evaluate(()=>localStorage.setItem('ballgamenext_tutorial_v1',JSON.stringify({firstRun:true,regions:['grassland','forest','lake','snow','desert','volcano']})));
 await page.reload();await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(300);
 assert(await page.locator('#situational-tip').isHidden(),`${name}: no tip while the start guide is up`);
 await page.evaluate(()=>{window.__game.gameTime=25;document.getElementById('starter-guide-close').click();});
 await page.waitForFunction(()=>!document.getElementById('situational-tip').hidden,null,{timeout:5000});
 const tip=await page.evaluate(()=>{const r=id=>{const n=document.getElementById(id);if(!n||!n.getClientRects().length)return null;const b=n.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom};};
  return {id:document.getElementById('situational-tip').dataset.tip,text:document.getElementById('situational-tip').innerText,box:r('situational-tip'),hud:r('hud'),bar:r('ability-bar'),vw:innerWidth,vh:innerHeight};});
 assert.equal(tip.id,'attack-locked');assert.match(tip.text,/크기 40/);
 assert(tip.box.left>=0&&tip.box.top>=0&&tip.box.right<=tip.vw&&tip.box.bottom<=tip.vh,`${name}: tip on screen`);
 assert(!overlaps(tip.box,tip.hud)&&!overlaps(tip.box,tip.bar),`${name}: tip clear of vitals and ability bar`);
 await page.keyboard.press('h');await page.waitForTimeout(100);
 assert(await page.locator('#situational-tip').isHidden(),`${name}: tip hides while help is open`);
 await page.keyboard.press('Escape');await page.waitForTimeout(150);
 await page.locator('#situational-tip-off').click();await page.waitForTimeout(100);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ballgamenext_tips_v1')));
 assert(await page.locator('#situational-tip').isHidden());assert.equal(saved.enabled,false);assert.deepEqual(saved.seen,['attack-locked']);
 results[name]=true;await context.close();
}
await browser.close();
assert.deepEqual(errors,[]);
console.log(JSON.stringify({result:'PASS',...results,errors}));
