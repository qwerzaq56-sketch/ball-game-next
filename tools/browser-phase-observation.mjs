import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 const expected=await page.evaluate(()=>{
  const g=window.__game,p=g.player,a=g.entities.find(e=>e.behavior==='ai');g.paused=true;g.entities=[p,a];g.runMetrics=new g.runMetrics.constructor();p.apex=a.apex=false;g.gameTime=0;
  const observe=seconds=>{for(let i=0;i<seconds*20;i++){g.gameTime+=.05;g.runMetrics.observe(g,.05);}};
  observe(2);p.apex=true;observe(3);g.era.phase={id:'war',name:'전쟁기'};observe(4);a.apex=true;observe(1);p.apex=false;observe(1);g.era.phase={id:'decline',name:'쇠퇴기'};a.apex=false;observe(1);
  return g.runMetrics.export(g).byPhase;
 });await page.keyboard.press('F1');await page.waitForTimeout(350);const text=await page.locator('#phase-observation').innerText();assert.match(text,/영양기/);assert.match(text,/전쟁기/);assert.match(text,/쇠퇴기/);assert.match(text,/0명 \/ 1명 \/ 2명 이상/);assert.match(text,/상실/);
 const before=await page.evaluate(()=>JSON.stringify({snapshot:window.__game.snapshot(),phase:window.__game.runMetrics.byPhase}));const waiting=page.waitForEvent('download');await page.locator('#metrics-export').click();const download=await waiting;const data=JSON.parse(await readFile(await download.path(),'utf8'));assert.deepEqual(data.byPhase,expected);assert.equal(await page.evaluate(()=>JSON.stringify({snapshot:window.__game.snapshot(),phase:window.__game.runMetrics.byPhase})),before);
 await page.screenshot({path:'/tmp/M27-phase-observation.png'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);await page.locator('#phase-observation').scrollIntoViewIfNeeded();const box=await page.locator('#phase-observation').boundingBox();assert(box.x>=0&&box.x+box.width<=390);await page.screenshot({path:'/tmp/M27-phase-observation-mobile.png'});assert.deepEqual(errors,[]);
 await writeFile('/tmp/M27-phase-observation.json',JSON.stringify({result:'PASS',controlledByPhase:expected,exportReadOnly:true,mobile:true,errors},null,2));console.log(JSON.stringify({result:'PASS',phases:Object.keys(expected),exportReadOnly:true,mobile:true,errors}));
}finally{await browser.close();}
