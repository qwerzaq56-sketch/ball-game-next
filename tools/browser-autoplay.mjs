import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),false);
 await page.evaluate(async()=>{const {Entity}=await import('/js/entity.js');const g=window.__game;g.seed=23;g.reset();g.paused=true;g.entities=[g.player,new Entity({x:g.player.x+120,y:g.player.y,size:10,color:'red',colorHex:'#ef4444',growthValue:10})];g.balance.spawning.maxEnemyCount=0;g.balance.spawning.orbSpawnInterval=1000;});await page.waitForTimeout(300);
 await page.keyboard.press('F1');await page.waitForTimeout(300);await page.locator('#autoplay-toggle').check();await page.keyboard.press('F1');await page.locator('#pause-btn').click();await page.waitForTimeout(2000);
 const active=await page.evaluate(()=>{const g=window.__game;return {enabled:g.autoplay.enabled,size:g.player.size,score:g.player.score,autoSeconds:g.runMetrics.autoSeconds,lives:g.lives,time:g.gameTime,paused:g.paused,reason:g.autoplay.reason};});assert.deepEqual(errors,[]);assert(active.enabled);assert(active.score>=10);assert(active.autoSeconds>1);assert.equal(active.lives,3);
 await page.keyboard.down('d');await page.waitForTimeout(150);await page.keyboard.up('d');assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),false);
 await page.keyboard.press('F1');await page.waitForTimeout(300);await page.locator('#autoplay-toggle').check();await page.keyboard.press('P');const paused=await page.evaluate(()=>JSON.stringify(window.__game.snapshot()));await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>JSON.stringify(window.__game.snapshot())),paused);
 const pending=page.waitForEvent('download');await page.locator('#metrics-export').click();const download=await pending;await download.saveAs('/tmp/M23-observation.json');const record=JSON.parse(await readFile('/tmp/M23-observation.json','utf8'));assert.equal(record.seed,23);assert(record.policy.autoSeconds>1);assert(record.samples.length>=2);assert.equal(await page.evaluate(()=>JSON.stringify(window.__game.snapshot())),paused);await page.screenshot({path:'/tmp/M23-observation-tools.png'});
 await page.keyboard.press('F1');await page.keyboard.press('P');await page.waitForTimeout(100);await page.mouse.click(600,500);assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),false);
 await page.evaluate(()=>{window.__game.reset();window.__game.paused=true;});await page.keyboard.press('F1');await page.waitForTimeout(300);assert.equal(await page.locator('#autoplay-toggle').isChecked(),false);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',defaultOff:true,ordinaryLives:active.lives,grew:active.size,score:active.score,keyboardTakeover:true,pointerTakeover:true,pauseStable:true,exportSamples:record.samples.length,exportPure:true,resetOff:true,errors}));
}finally{await browser.close();}
