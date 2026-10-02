import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const id=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;const [a,b,c]=g.entities.filter(e=>e.behavior==='ai');
  g.entities=[g.player,a,b,c];g.player.role='forager';a.role='prey';b.role='predator';c.role='predator';
  a.color=b.color=g.player.color;a.x=g.player.x+80;a.y=g.player.y;b.x=g.player.x+160;b.y=g.player.y;
  g.allyLinks.refresh();g.allyLinks.join(a,g.player);g.allyLinks.join(b,a);g.player.displayName='<img src=x>';return a.id;
 });await page.keyboard.press('F4');await page.keyboard.press('F2');await page.evaluate(id=>window.__game.ui.inspector.select(id),id);await page.waitForTimeout(300);
 assert.match(await page.locator('#ecology-roles').innerText(),/프레이\s+1 · 25%/);assert.match(await page.locator('#ecology-roles').innerText(),/프레데터\s+2 · 50%/);
 assert.match(await page.locator('#ecology-companions').innerText(),/동행 3 \/ 4개체 · 1개 대열/);
 assert.match(await page.locator('#ai-detail').innerText(),/대열 구성원/);assert.match(await page.locator('#ai-detail').innerText(),/\(리더\)/);assert.equal(await page.locator('#ai-detail img').count(),0);
 assert.equal(await page.evaluate(async()=>{const {resetRandom,random}=await import('/js/random.js');resetRandom(9);const expected=random('ai');resetRandom(9);const g=window.__game,before=JSON.stringify(g.snapshot());g.ui.ecologyUI.renderEcology(g);g.ui.inspector.render();return expected===random('ai')&&before===JSON.stringify(g.snapshot());}),true);
 const rect=await page.locator('#ai-inspector').boundingBox();assert(rect.y>=0&&rect.y+rect.height<=720);
 await page.keyboard.press('F2');await page.evaluate(()=>{window.__game.player.displayName='달빛 늑대';document.getElementById('pause-indicator').style.display='none';});await page.waitForTimeout(300);await page.screenshot({path:'reports/M11-ecology-observation.png'});
 await page.locator('#help-btn').click();const group=await page.evaluate(()=>window.__game.player.companionGroup);await page.keyboard.press('g');assert.equal(await page.evaluate(()=>window.__game.player.companionGroup),group);await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);const eco=await page.locator('#ecology-panel').boundingBox();assert(eco.x>=0&&eco.x+eco.width<=390&&eco.y>=0&&eco.y+eco.height<=844);
 await page.evaluate(()=>{window.__game.reset();window.__game.paused=true;});await page.waitForTimeout(300);assert.match(await page.locator('#ecology-companions').innerText(),/진입 0 \/ 이탈 0/);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',roleCounts:true,groupCounts:true,members:true,nameEscaping:true,presentationPurity:true,inspectorViewport:true,helpInputGuard:true,resetCounts:true,errors}));
} finally {await browser.close();}
