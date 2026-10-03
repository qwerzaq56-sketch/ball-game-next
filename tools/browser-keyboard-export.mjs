import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720},acceptDownloads:true}),errors=[],downloads=[];page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 await page.evaluate(()=>{const g=window.__game;g.paused=true;g.autoplay.setEnabled(true);g.gameTime=1;g.player.score=7;g.runMetrics.observe(g,1);});await page.keyboard.press('F1');await page.waitForTimeout(350);
 const before=await page.evaluate(()=>JSON.stringify(window.__game.snapshot()));await page.locator('#metrics-export').focus();await page.keyboard.press('Space');await page.waitForTimeout(150);const after=await page.evaluate(()=>JSON.stringify(window.__game.snapshot()));const auto=await page.evaluate(()=>window.__game.autoplay.enabled);
 if(process.argv.includes('--probe')){const result={downloadCount:downloads.length,autoplayAfter:auto,snapshotChanged:before!==after,errors};await writeFile('/tmp/M30-keyboard-before.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
 else {
  assert.equal(downloads.length,1);assert.equal(auto,true);assert.equal(after,before);const json=JSON.parse(await readFile(await downloads[0].path(),'utf8'));assert.equal(json.current.observation.autoplay,true);assert.equal(json.playerProfile.color,await page.evaluate(()=>window.__game.player.color));
  await page.locator('#metrics-csv-export').focus();await page.keyboard.press('Space');await page.waitForTimeout(150);assert.equal(downloads.length,2);assert.equal(await page.evaluate(()=>JSON.stringify(window.__game.snapshot())),before);const csv=await readFile(await downloads[1].path(),'utf8');assert(csv.startsWith('\ufeffseed,policy,time'));assert(csv.includes('local-survival-v2'));assert(csv.includes(',7,'));assert(csv.includes('평원'));await writeFile('/tmp/M30-samples.csv',csv);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);await page.locator('#metrics-csv-export').scrollIntoViewIfNeeded();const box=await page.locator('#metrics-csv-export').boundingBox();assert(box.x>=0&&box.x+box.width<=390);await page.screenshot({path:'/tmp/M30-csv-mobile.png'});
  await page.keyboard.press('F1');await page.evaluate(()=>{const g=window.__game,p=g.player,a=g.entities.find(e=>e.behavior==='ai');g.entities=[p,a];a.color=p.color;a.x=p.x+80;a.y=p.y;g.allyLinks.timer=1000;g.allyLinks.refresh();g.allyLinks.join(a,p);g.paused=false;});await page.waitForTimeout(100);await page.locator('#companion-leave').focus();await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__game.player.companionGroup),null);assert.equal(await page.evaluate(()=>window.__game.autoplay.enabled),false);assert.deepEqual(errors,[]);
  await writeFile('/tmp/M30-keyboard-export.json',JSON.stringify({result:'PASS',keyboardJSON:true,keyboardCSV:true,readOnly:true,autoplayPreserved:true,manualCompanionDeparture:true,mobile:true,errors},null,2));console.log(JSON.stringify({result:'PASS',keyboardJSON:true,keyboardCSV:true,readOnly:true,autoplayPreserved:true,errors}));
 }
}finally{await browser.close();}
