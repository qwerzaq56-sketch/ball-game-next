import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const prefix=process.env.BROWSER_TOUCH_REPORT_PREFIX??'reports/M10';
const center=async selector=>{const r=await page.locator(selector).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
try {
 await page.goto(process.argv[2]??'http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.locator('#mobile-ui-toggle').evaluate(e=>e.click());
 await page.evaluate(()=>{const g=window.__game,p=g.player;g.entities=[p];g.ecology.timer=1000;g.allyLinks.timer=1000;p.size=80;p.attackUnlocked=true;p.attackStack=p.attackMaxStack=3;p.dodgeUnlocked=true;p.dodgeStack=p.dodgeMaxStack=2;p.apex=true;p._specialApex=true;p.specialCooldown=0;});await page.waitForTimeout(150);
 assert.equal(await page.locator('#touch-stick').isVisible(),false,'floating stick stays hidden until a touch starts');assert.equal(await page.locator('#touch-special').isDisabled(),false);
 const cdp=await context.newCDPSession(page),stick={x:100,y:300},attack={x:300,y:480}/* R-VIS-010: no attack button; a right-half drag aims and releases the attack */,dodge=await center('#touch-dodge'),special=await center('#touch-special');
 assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,stick),'game-canvas','left-half move zone must be the canvas');
 const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 const point=(id,p)=>({id,x:p.x,y:p.y});
 const startX=await page.evaluate(()=>window.__game.player.x);
 await touch('touchStart',[point(1,stick)]);await touch('touchMove',[point(1,{x:stick.x+35,y:stick.y})]);await page.waitForTimeout(250);assert(await page.locator('#touch-stick').isVisible(),'floating stick appears under the moving touch');
 assert((await page.evaluate(()=>window.__game.player.x))>startX);
 await touch('touchStart',[point(1,{x:stick.x+35,y:stick.y}),point(2,attack)]);await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.__game.input.mouseDown),false);assert.equal(await page.evaluate(()=>window.__game.player.attackStack),3);
 await page.evaluate(()=>window.__game.player.frozen=.5);
 await touch('touchMove',[point(1,{x:stick.x+35,y:stick.y}),point(2,{x:attack.x+35,y:attack.y})]);await page.waitForTimeout(50);
 assert.equal(await page.evaluate(()=>{const g=window.__game,p=g.worldToScreen(g.player.x,g.player.y);return g.input.mouseX>p.x+160&&Math.abs(g.input.mouseY-p.y)<8;}),true);
 await page.evaluate(()=>window.__game.player.frozen=0);
 await touch('touchCancel',[]);await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.__game.input.mouseDown),false);assert.deepEqual(await page.evaluate(()=>window.__game.input.touchMove),{x:0,y:0});
 await touch('touchStart',[point(3,dodge)]);await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.__game.player.dodgeState),'READY');await touch('touchEnd',[]);await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.__game.player.dodgeState),'DODGING');await page.waitForTimeout(1000);
 // Touching the battlefield aims without starting an attack.
 await touch('touchStart',[point(4,{x:300,y:400})]);await touch('touchEnd',[]);assert.equal(await page.evaluate(()=>window.__game.input.mouseDown),false);
 await touch('touchStart',[point(5,special)]);await touch('touchEnd',[]);await page.waitForFunction(()=>window.__game.player.specialCast?.directions.length===3);
 await page.screenshot({path:`${prefix}-touch-windup.png`});await page.waitForFunction(()=>window.__game.abilities.events.some(e=>e.type==='special-fire'));
 await touch('touchStart',[point(6,stick)]);await touch('touchMove',[point(6,{x:stick.x-30,y:stick.y})]);await page.locator('#pause-btn').click();await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>window.__game.input.touchMove),{x:0,y:0});await touch('touchEnd',[]);await page.locator('#pause-btn').click();
 await page.screenshot({path:`${prefix}-touch-mobile.png`});
 await touch('touchStart',[point(7,stick)]);await touch('touchMove',[point(7,{x:stick.x+30,y:stick.y})]);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);assert.equal(await page.locator('#touch-stick').isVisible(),false,'resize clears the floating stick');assert.deepEqual(await page.evaluate(()=>window.__game.input.touchMove),{x:0,y:0});await touch('touchEnd',[]);
 assert.equal(await page.evaluate(()=>document.elementFromPoint(120,300)?.id),'game-canvas','landscape move zone must not be covered by the HUD');
 assert(await page.locator('#pause-btn').isVisible());await page.locator('#pause-btn').click();assert.equal(await page.evaluate(()=>window.__game.paused),true);await page.locator('#pause-btn').click();
 await page.screenshot({path:`${prefix}-touch-landscape.png`});
 await page.evaluate(()=>{const g=window.__game,p=g.player;g.paused=true;p.attackUnlocked=false;p.dodgeUnlocked=false;p.apex=false;});await page.waitForTimeout(50);
 assert.equal(await page.locator('#touch-attack').isVisible(),false);assert.match(await page.locator('#touch-dodge').innerText(),/크기 50/);assert.match(await page.locator('#touch-special').innerText(),/크기 100/);assert.match(await page.locator('#touch-special').innerText(),/E 해금/);assert.match(await page.locator('#touch-ultimate').innerText(),/최상위/);
 await page.evaluate(()=>{const g=window.__game,p=g.player,a=g.entities.find(e=>e.behavior==='ai');p.attackUnlocked=p.dodgeUnlocked=true;p.apex=true;a.color=p.color;a.colorHex=p.colorHex;a.x=p.x+80;a.y=p.y;g.allyLinks.refresh();g.allyLinks.join(a,p);p.attackStack=3;p.dodgeStack=2;g.paused=false;});await page.waitForTimeout(80);
 // R-COMP-002 (M38): companions may fight and use abilities, so the attack button must stay usable in a group.
 assert.equal(await page.locator('#attack-pips .pip.filled').count(),3,'attack charges stay usable in a group');assert.match(await page.locator('#touch-special').innerText(),/^E/);await page.evaluate(()=>{window.__game.paused=true;});
 await page.evaluate(()=>{const g=window.__game;g.allyLinks.leave(g.player);g.player.attackStack=g.player.dodgeStack=0;});await page.waitForTimeout(50);
 assert.equal(await page.locator('#attack-pips .pip.filled').count(),0);assert.match(await page.locator('#touch-dodge').innerText(),/회피 충전/);assert.equal(await page.locator('#touch-dodge').isDisabled(),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',genuineTouch:true,analogMove:true,simultaneousAttack:true,dragAim:true,pointerCancel:true,dodge:true,aimWithoutAttack:true,specialWindupFire:true,pauseClear:true,errors}));
} finally {await browser.close();}
