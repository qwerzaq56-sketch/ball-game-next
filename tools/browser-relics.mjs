import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const prefix=process.env.BROWSER_RELIC_PREFIX??'/tmp/M21';
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);await page.keyboard.press('F5');
 await page.evaluate(()=>{const g=window.__game;g.seed=23;g.reset();g.paused=true;g.entities=[g.player];const r=g.biomes.regions.find(r=>r.id==='desert');g.player.x=r.x-80;g.player.y=r.y;g.camera.x=r.x;g.camera.y=r.y;g.camera.zoom=.7;g.relics.items=[{id:'browser-relic',x:r.x,y:r.y,size:24,kind:'combat',behavior:'relic',expires:g.gameTime+90,alive:true}];});await page.waitForTimeout(250);await page.screenshot({path:`${prefix}-desert-item.png`});assert((await page.locator('#region-text').innerText()).includes('사막'));
 await page.evaluate(()=>{const g=window.__game;g.paused=false;g.input.keys=new Set(['d']);for(let i=0;i<30;i++)g.update(1/60);g.input.keys.clear();g.paused=true;});await page.waitForTimeout(250);assert((await page.locator('#relic-text').innerText()).includes('공격 +10%'));assert.equal(await page.evaluate(()=>window.__game.relics.items.length),0);assert(await page.locator('#touch-attack').isDisabled());await page.screenshot({path:`${prefix}-pickup.png`});
 await page.evaluate(()=>{const g=window.__game;g.handlePlayerDefeat('검증');});await page.waitForTimeout(250);assert(await page.locator('#relic-text').isHidden());
 await page.evaluate(()=>{const g=window.__game;g.reset();g.paused=true;const r=g.biomes.regions.find(r=>r.id==='grassland');g.player.x=r.x;g.player.y=r.y;g.camera.x=r.x;g.camera.y=r.y;g.camera.zoom=.5;});await page.waitForTimeout(250);assert((await page.locator('#region-text').innerText()).includes('초원'));await page.screenshot({path:`${prefix}-grassland.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',touch:true,regions:6,item:true,pickup:true,noUnlockByRelic:true,defeatClear:true,errors}));
}finally{await browser.close();}
