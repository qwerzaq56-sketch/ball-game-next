import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 await page.evaluate(()=>{const g=window.__game;g.seed=23;g.reset();g.entities=[g.player];g.autoplay.setEnabled(true);});await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),true);
 await page.touchscreen.tap(100,500);/* floating stick: any left-half canvas touch is a move takeover */assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),false);
 await page.evaluate(()=>window.__game.autoplay.setEnabled(true));await page.touchscreen.tap(250,560);assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),false);
 await page.keyboard.press('F1');await page.waitForTimeout(300);const tools=await page.locator('#observation-tools').boundingBox();assert(tools.x>=0&&tools.x+tools.width<=390);await page.screenshot({path:'/tmp/M23-observation-touch.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',touchTakeover:true,canvasTakeover:true,mobilePanel:true,errors}));
}finally{await browser.close();}
