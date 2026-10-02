import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],failed=[];
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push(`${r.status()} ${r.url()}`)});
const reportPrefix=process.env.BROWSER_REPORT_PREFIX??'reports/M5';
const url=process.argv[2]??'http://127.0.0.1:8001/';
try {
  await page.goto(url);await page.waitForFunction(()=>window.__game?.entities.length>1);
  if(await page.locator('#player-setup').count())await page.locator('#player-start').click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.rank-row:visible').count(),10);
  assert.match(await page.locator('#my-rank').innerText(),/순위/);
  const x=await page.evaluate(()=>window.__game.player.x);
  await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');
  assert.notEqual(await page.evaluate(()=>window.__game.player.x),x);
  const snapshot=await page.evaluate(()=>{
    const g=window.__game;g.paused=true;
    const actors=g.entities.filter(e=>e.behavior==='ai').slice(0,3);
    actors.forEach((e,i)=>{e.x=g.player.x+(i-1)*80;e.y=g.player.y-100;e.score=1000-i*100;});
    return g.snapshot();
  });
  await page.waitForTimeout(350);
  await page.locator('.rank-row:not(:disabled)').first().click();await page.waitForTimeout(300);
  assert.equal(await page.locator('#ai-inspector').isVisible(),false);
  await page.keyboard.press('F2');
  const selectedName=await page.locator('.rank-row:not(:disabled)').first().locator('.rank-name').innerText();
  await page.locator('.rank-row:not(:disabled)').first().click();await page.waitForTimeout(300);
  assert(await page.locator('#ai-inspector').isVisible());
  assert((await page.locator('#ai-detail').innerText()).includes(selectedName.replace('★ ','')));
  assert.match(await page.locator('#ai-detail').innerText(),/이름/);
  await page.keyboard.press('F2');await page.keyboard.press('F1');assert(await page.locator('#debug-panel').isVisible());await page.keyboard.press('F1');
  await page.keyboard.press('F4');assert(await page.locator('#ecology-panel').isVisible());
  await page.keyboard.press('F3');await page.keyboard.press('F3');
  await page.locator('#names-toggle').click();await page.locator('#ranking-toggle').click();
  assert.equal(await page.locator('#live-ranking').isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>window.__game.snapshot()),snapshot);
  await page.reload();await page.waitForFunction(()=>window.__game);
  if(await page.locator('#player-setup').count())await page.locator('#player-start').click();
  assert.equal(await page.locator('#live-ranking').isVisible(),false);
  assert.equal(await page.locator('#names-toggle').getAttribute('aria-pressed'),'false');
  assert(await page.locator('#ecology-panel').isVisible());
  await page.locator('#names-toggle').click();await page.locator('#ranking-toggle').click();
  await page.evaluate(()=>{
    const g=window.__game;g.paused=true;
    const a=g.entities.find(e=>e.behavior==='ai');a.apex=true;a.size=140;a.score=1200;a.x=g.player.x+120;a.y=g.player.y-100;
    g.apexHistory.observe(g.entities,0,g.gameTime);g.gameTime+=72;g.apexHistory.observe(g.entities,72,g.gameTime);
  });
  await page.waitForTimeout(350);
  assert.match(await page.locator('#ecology-summary').innerText(),/현재 1/);
  assert.match(await page.locator('#apex-current').innerText(),/1분 12초/);
  const labels=await page.evaluate(()=>window.__game.visibleNameLabels);
  assert(labels.length>0);
  const reserved=await page.evaluate(()=>window.__game.ui.overlayRects);
  for(let i=0;i<labels.length;i++) {
    const a=labels[i].box;
    for(const b of [...reserved,...labels.slice(i+1).map(l=>l.box)]) {
      assert(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top),'name overlaps panel or name');
    }
  }
  await page.screenshot({path:`${reportPrefix}-desktop.png`});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
  const rects=await page.evaluate(()=>['hud','live-ranking','ecology-panel'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));
  assert(rects.find(r=>r.id==='hud').right < rects.find(r=>r.id==='live-ranking').x,'mobile HUD overlaps ranking');
  for(const r of rects){assert(r.x>=0&&r.right<=390,`${r.id} leaves viewport`);assert(r.y>=0&&r.bottom<=844,`${r.id} leaves viewport`);}
  await page.screenshot({path:`${reportPrefix}-mobile.png`});
  await page.setViewportSize({width:1280,height:720});
  const mute=await page.locator('#mute-btn').innerText();await page.locator('#mute-btn').click();assert.notEqual(await page.locator('#mute-btn').innerText(),mute);
  await page.locator('#reset-btn').click();await page.locator('#reset-confirm-no').click();assert.equal(await page.locator('#reset-confirm-overlay').isVisible(),false);
  await page.locator('#reset-btn').click();await page.locator('#reset-confirm-yes').click();
  if(await page.locator('#player-setup').count())await page.locator('#player-start').click();
  assert.equal(await page.evaluate(()=>window.__game.apexHistory.gains),0);
  assert.equal(await page.evaluate(()=>window.__game.score),0);
  assert.equal(await page.locator('#names-toggle').getAttribute('aria-pressed'),'true');
  // Actual E-key activation: real windup/three projectiles, not a direct fire() call.
  await page.evaluate(()=>{
    const g=window.__game,p=g.player;g.entities=[p];g.paused=false;
    p.apex=true;p._specialApex=true;p.specialCooldown=0;p.size=120;p.hp=p.maxHp=600;p.score=9999;
  });
  await page.mouse.move(950,360);await page.keyboard.press('e');
  await page.waitForFunction(()=>window.__game.player.specialCast?.directions.length===3);
  const directions=await page.evaluate(()=>[...window.__game.player.specialCast.directions]);
  await page.screenshot({path:`${reportPrefix}-blue-windup.png`});
  await page.waitForFunction(()=>window.__game.abilities.waves.length===3);
  assert.deepEqual(await page.evaluate(()=>window.__game.abilities.waves.map(w=>w.dir)),directions);
  await page.screenshot({path:`${reportPrefix}-blue-cast.png`});
  await page.waitForFunction(()=>window.__game.abilities.waves.length===0);
  assert.equal(await page.evaluate(()=>window.__game.abilities.events.filter(e=>e.type==='special-fire').length),1);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log(JSON.stringify({result:'PASS',checks:['movement','TOP10','inspector selection','F1-F4','presentation purity','preference reload','apex tenure','name layout','desktop/mobile','mute','reset','E-key triple wave windup and fire'],errors,failed}));
} finally {await browser.close();}
