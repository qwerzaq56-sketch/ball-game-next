import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();assert.equal(await page.locator('#minimap-panel').isVisible(),false);
 const id=await page.evaluate(()=>{const g=window.__game;g.paused=true;const a=g.entities.find(e=>e.behavior==='ai');a.x=500;a.y=1000;a.apex=true;return a.id;});
 await page.keyboard.press('F5');await page.waitForTimeout(300);assert(await page.locator('#minimap-panel').isVisible());
 const snapshot=await page.evaluate(()=>window.__game.snapshot());
 assert.equal(await page.evaluate(async()=>{const {resetRandom,random}=await import('/js/random.js');resetRandom(5);const expected=random('ai');resetRandom(5);window.__game.ui.ecologyUI.minimap.render(window.__game);return expected===random('ai');}),true);
 const clickAI=async()=>{const r=await page.locator('#minimap-canvas').boundingBox();await page.mouse.click(r.x+r.width*.1,r.y+r.height*.2);};
 await clickAI();assert.equal(await page.locator('#ai-inspector').isVisible(),false);await page.keyboard.press('F2');await clickAI();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__game.ui.inspector.selectedId),id);await page.keyboard.press('F2');
 assert.deepEqual(await page.evaluate(()=>window.__game.snapshot()),snapshot);await page.screenshot({path:'reports/M12-minimap-desktop.png'});
 await page.keyboard.press('F4');await page.waitForTimeout(300);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 const rects=await page.evaluate(()=>['minimap-panel','hud','live-ranking','ecology-panel'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));
 const map=rects[0];assert(map.left>=0&&map.top>=0&&map.right<=390&&map.bottom<=844);for(const r of rects.slice(1))assert(!(map.left<r.right&&map.right>r.left&&map.top<r.bottom&&map.bottom>r.top),`map overlaps ${r.id}`);
 await page.screenshot({path:'reports/M12-minimap-mobile.png'});
 await page.reload();await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();assert(await page.locator('#minimap-panel').isVisible());await page.locator('#minimap-toggle').click();assert.equal(await page.locator('#minimap-panel').isVisible(),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',toggle:true,RNGPurity:true,snapshotPurity:true,selectOnlyWhenInspectorOpen:true,mobileLayout:true,persisted:true,errors}));
}finally{await browser.close();}
