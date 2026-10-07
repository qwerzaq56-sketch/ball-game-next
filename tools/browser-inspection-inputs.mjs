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
 const selected=await page.evaluate(()=>{const g=window.__game;g.paused=true;const p=g.player,a=g.entities.find(e=>e.behavior==='ai');g.entities=[p,a];a.x=p.x+100;a.y=p.y;a.size=40;g.camera.x=p.x;g.camera.y=p.y;g.camera.zoom=1;g.autoplay.setEnabled(true);g.ui.inspector.toggle();return {id:a.id,screen:g.worldToScreen(a.x,a.y)};});
 const before=await page.evaluate(()=>JSON.stringify(window.__game.snapshot()));await page.keyboard.down('Shift');await page.mouse.click(selected.screen.x,selected.screen.y);await page.keyboard.up('Shift');assert.equal(await page.evaluate(()=>window.__game.ui.inspector.selectedId),selected.id);assert.equal(await page.evaluate(()=>JSON.stringify(window.__game.snapshot())),before);assert(await page.evaluate(()=>window.__game.autoplay.enabled));
 await page.mouse.click(640,500);assert.equal(await page.evaluate(()=>window.__game.paused),false);assert(await page.evaluate(()=>window.__game.autoplay.enabled));/* resume click is not consumed (R-CTRL-002) */
 await page.mouse.click(640,500);assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),false);await page.keyboard.press('p');assert(await page.evaluate(()=>window.__game.paused));
 await page.evaluate(()=>{const g=window.__game,p=g.player,a=g.entities.find(e=>e.behavior==='ai');a.color=p.color;a.colorHex=p.colorHex;a.x=p.x+80;g.allyLinks.timer=1000;g.allyLinks.refresh();g.allyLinks.join(a,p);});await page.waitForTimeout(100);assert(await page.locator('#companion-leave').isDisabled());
 const paused=await page.evaluate(()=>JSON.stringify({snapshot:window.__game.snapshot(),group:window.__game.player.companionGroup,stats:window.__game.allyLinks.stats}));await page.keyboard.press('g');assert.equal(await page.evaluate(()=>JSON.stringify({snapshot:window.__game.snapshot(),group:window.__game.player.companionGroup,stats:window.__game.allyLinks.stats})),paused);
 await page.evaluate(()=>{document.getElementById('companion-leave').dispatchEvent(new Event('click'));});assert(await page.evaluate(()=>!!window.__game.player.companionGroup));
 await page.keyboard.press('p');await page.keyboard.press('g');assert.equal(await page.evaluate(()=>window.__game.player.companionGroup),null);assert.deepEqual(errors,[]);
 await writeFile(join(tmpdir(),'M26-inspection-inputs.json'),JSON.stringify({result:'PASS',shiftInspectionReadOnly:true,resumeClickKeepsAutoplay:true,normalClickManual:true,pausedLeaveKeyBlocked:true,pausedButtonBlocked:true,resumedLeave:true,errors},null,2));console.log(JSON.stringify({result:'PASS',shiftInspectionReadOnly:true,pausedLeaveBlocked:true,resumedLeave:true,errors}));
}finally{await browser.close();}
