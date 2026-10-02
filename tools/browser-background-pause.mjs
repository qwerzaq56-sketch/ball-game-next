import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const signal=await page.evaluate(()=>{
  const g=window.__game;g.audio.startAbsorbDrone();g._absorbDroneActive=true;const wasActive=!!g.audio.absorbDrone;
  g.input.keys.add('d');g.input.mouseDown=true;g.input.touchMove={x:1,y:0};window.dispatchEvent(new Event('blur'));
  return {wasActive,paused:g.paused,droneStopped:g.audio.absorbDrone===null,inputsCleared:g.input.keys.size===0&&!g.input.mouseDown&&g.input.touchMove.x===0};
 });assert.deepEqual(signal,{wasActive:true,paused:true,droneStopped:true,inputsCleared:true});
 const time=await page.evaluate(()=>window.__game.gameTime);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__game.gameTime),time);assert.match(await page.locator('#pause-indicator').innerText(),/창 전환/);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.equal(await page.evaluate(()=>window.__game.paused),true);
 await page.screenshot({path:'reports/M13-background-pause.png'});await page.locator('#pause-btn').click();await page.waitForFunction(()=>!window.__game.paused);
 await page.locator('#help-btn').click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__game.paused),true);
 await page.locator('#pause-btn').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await page.evaluate(()=>window.__game.paused),true);
 await page.locator('#pause-btn').click();
 // P/help/reset all stop an already-created graph synchronously, before the next RAF.
 const stopBy=button=>page.evaluate(button=>{const g=window.__game;g.audio.startAbsorbDrone();g._absorbDroneActive=true;document.getElementById(button).click();return g.audio.absorbDrone===null;},button);
 assert.equal(await stopBy('pause-btn'),true);await page.keyboard.press('p');
 assert.equal(await stopBy('help-btn'),true);await page.keyboard.press('Escape');
 assert.equal(await stopBy('reset-btn'),true);await page.locator('#reset-confirm-no').click();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',controlledLifecycleSignals:true,blurPause:true,visibilityPause:true,manualResume:true,helpBlurPreserved:true,continuousAudioStops:true,inputsCleared:true,errors}));
}finally{await browser.close();}
