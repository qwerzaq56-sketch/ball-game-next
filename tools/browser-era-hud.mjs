import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const phases=[];
 for(const [time,id,name]of [[90,'abundance','영양기'],[270,'competition','경쟁기'],[420,'war','전쟁기'],[510,'decline','쇠퇴기'],[540,'abundance','영양기']]){
  await page.evaluate(time=>{const g=window.__game;g.paused=true;g.gameTime=time;g.era.update(0);},time);await page.waitForTimeout(60);
  const badge=page.locator('#era-status');assert(await badge.isVisible());assert.equal(await badge.getAttribute('data-phase'),id);assert.equal(await page.locator('#era-phase-name').innerText(),name);assert.match(await page.locator('#era-countdown').innerText(),/^\d+:\d\d$/);if(time>90)assert.equal(await badge.getAttribute('data-transition'),'true');phases.push({time,id,text:await badge.innerText(),label:await badge.getAttribute('aria-label')});
 }
 await page.screenshot({path:'reports/M34-era-landscape.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);const hud=await page.locator('#hud').boundingBox();await page.evaluate(()=>{window.__game.paused=false;});const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:9,x:90,y:700}]});await page.waitForTimeout(60);const stick=await page.locator('#touch-stick').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(stick,'floating stick appears on a left-half touch');assert(hud.height<100);assert(hud.y+hud.height<stick.y);assert(await page.locator('#era-status').isVisible());await page.screenshot({path:'reports/M34-era-portrait.png'});
 await page.locator('#mobile-ui-toggle').evaluate(e=>e.click());await page.waitForTimeout(60);assert(await page.locator('#era-status').isVisible());await page.evaluate(()=>{window.__game.era.enabled=false;});await page.waitForTimeout(60);assert.equal(await page.locator('#era-phase-name').innerText(),'Era OFF');
 assert.deepEqual(errors,[]);const result={status:'PASS',visibleInMinimalAndFull:true,phaseTransitions:true,remainingTime:true,mobileLayouts:true,phases,errors};writeFileSync('reports/M34-era-hud.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
