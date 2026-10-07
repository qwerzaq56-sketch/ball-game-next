import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 await page.evaluate(()=>{const g=window.__game,p=g.player;g.entities=[p];g.ecology.timer=g.allyLinks.timer=10000;p.size=80;p.attackUnlocked=true;p.attackStack=p.attackMaxStack=3;});
 const cdp=await context.newCDPSession(page),touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 await page.locator('#pause-btn').click();await touch('touchStart',[{id:1,x:520,y:120}]);assert.equal(await page.evaluate(()=>window.__game.paused),true);
 await touch('touchMove',[{id:1,x:570,y:120}]);await touch('touchEnd',[]);await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.__game.paused),false);assert.equal(await page.evaluate(()=>window.__game.player.attackStack),3);assert.equal(await page.evaluate(()=>window.__game.input._attackQueued),null);
 await touch('touchStart',[{id:2,x:520,y:120}]);await touch('touchMove',[{id:2,x:570,y:120}]);await touch('touchEnd',[]);await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.__game.player.attackStack),2);
 await page.locator('#pause-btn').click();await touch('touchStart',[{id:3,x:520,y:120}]);await touch('touchCancel',[]);assert.equal(await page.evaluate(()=>window.__game.paused),true);
 await page.mouse.click(520,120);assert.equal(await page.evaluate(()=>window.__game.paused),false);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>window.__game.paused),true);await page.touchscreen.tap(520,120);assert.equal(await page.evaluate(()=>window.__game.paused),false);
 await page.locator('#mobile-ui-toggle').evaluate(e=>e.click());await page.locator('#help-btn').evaluate(e=>e.click());await page.touchscreen.tap(15,220);assert.equal(await page.evaluate(()=>window.__game.paused),true);assert.equal(await page.locator('#play-help').evaluate(e=>e.open),true);await page.locator('#help-close').click();
 await page.locator('#reset-btn').evaluate(e=>e.click());await page.touchscreen.tap(15,220);assert.equal(await page.evaluate(()=>window.__game.paused),true);assert(await page.locator('#reset-confirm-overlay').isVisible());await page.locator('#reset-confirm-no').click();
 await page.evaluate(()=>{const g=window.__game;g.paused=true;g.autoplay.setEnabled(true);});await page.touchscreen.tap(520,120);assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),true);
 await page.evaluate(()=>{const g=window.__game;g.autoplay.setEnabled(false);g.gameOver=true;g.paused=true;});await page.touchscreen.tap(520,120);assert.equal(await page.evaluate(()=>window.__game.paused),true);
 assert.deepEqual(errors,[]);const result={status:'PASS',touchResume:true,noAttackOnResume:true,nextGestureAttacks:true,cancelKeepsPause:true,mouseResume:true,backgroundResume:true,helpResetProtected:true,autoplayPreserved:true,gameOverProtected:true,errors};writeFileSync('reports/M35-tap-resume.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
