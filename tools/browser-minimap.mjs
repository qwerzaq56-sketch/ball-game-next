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
 const aiAt=await page.evaluate(id=>{const g=window.__game,w=g.balance.world,a=g.entities.find(e=>e.id===id);return {x:a.x/w.worldWidth,y:a.y/w.worldHeight};},id);
 const clickAI=async()=>{const r=await page.locator('#minimap-canvas').boundingBox();await page.mouse.click(r.x+r.width*aiAt.x,r.y+r.height*aiAt.y);};
 await clickAI();assert.equal(await page.locator('#ai-inspector').isVisible(),false);await page.keyboard.press('F2');await clickAI();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__game.ui.inspector.selectedId),id);await page.keyboard.press('F2');
 assert.deepEqual(await page.evaluate(()=>window.__game.snapshot()),snapshot);await page.screenshot({path:'reports/M12-minimap-desktop.png'});
 // Portrait phone (R-CTRL-003): ranking first, minimap as a tappable thumbnail under the HUD, ecology stacked under the ranking; nothing overlaps.
 const phone=await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto('http://127.0.0.1:8001/');await phone.waitForFunction(()=>window.__game);await phone.locator('#player-start').click();await phone.waitForTimeout(300);
 await phone.evaluate(()=>{window.__game.paused=true;for(const id of ['quick-map','quick-ecology','quick-ranking'])document.getElementById(id).click();});await phone.waitForTimeout(500);
 const rectsOf=()=>phone.evaluate(()=>Object.fromEntries(['minimap-panel','hud','live-ranking','ecology-panel','minimal-tools','touch-actions'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{left:r.left,top:r.top,right:r.right,bottom:r.bottom}];})));
 const apart=(a,b)=>a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;
 let r=await rectsOf();assert(await phone.locator('#minimap-panel.thumb').isVisible());assert(r['minimap-panel'].right-r['minimap-panel'].left<=110);assert(r['minimap-panel'].bottom<=844&&r['minimap-panel'].left>=0);
 for(const [a,b] of [['minimap-panel','hud'],['minimap-panel','live-ranking'],['minimap-panel','ecology-panel'],['minimap-panel','minimal-tools'],['minimap-panel','touch-actions'],['live-ranking','ecology-panel'],['ecology-panel','minimal-tools']])assert(apart(r[a],r[b]),`${a} overlaps ${b}`);
 assert(r['live-ranking'].top<r['ecology-panel'].top);
 const phoneSnapshot=await phone.evaluate(()=>window.__game.snapshot());
 await phone.locator('#minimap-canvas').tap();await phone.waitForTimeout(300);assert(await phone.locator('#minimap-panel.expanded').isVisible());assert(await phone.locator('#minimap-backdrop').isVisible());
 r=await rectsOf();assert(r['minimap-panel'].right-r['minimap-panel'].left>=300);await phone.screenshot({path:'reports/M12-minimap-mobile.png'});
 await phone.touchscreen.tap(20,780);await phone.waitForTimeout(300);assert(await phone.locator('#minimap-panel.thumb').isVisible());assert.equal(await phone.locator('#minimap-backdrop').isVisible(),false);
 assert(await phone.evaluate(()=>window.__game.paused));assert.deepEqual(await phone.evaluate(()=>window.__game.snapshot()),phoneSnapshot);
 await phone.evaluate(()=>document.getElementById('quick-ranking').click());await phone.waitForTimeout(400);r=await rectsOf();assert(apart(r['ecology-panel'],r['minimal-tools']));assert(r['ecology-panel'].top>=r['live-ranking'].bottom-1,'ecology sits under the compact ranking overlay');
 await page.keyboard.press('F4');await page.waitForTimeout(300);
 await page.reload();await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();assert(await page.locator('#minimap-panel').isVisible());await page.locator('#minimap-toggle').click();assert.equal(await page.locator('#minimap-panel').isVisible(),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',phoneThumbnail:true,phoneExpand:true,phoneStack:true,toggle:true,RNGPurity:true,snapshotPurity:true,selectOnlyWhenInspectorOpen:true,mobileLayout:true,persisted:true,errors}));
}finally{await browser.close();}
