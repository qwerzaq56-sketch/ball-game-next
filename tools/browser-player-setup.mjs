import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push(r.url())});
try {
  await page.goto(process.argv[2]??'http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);
  assert(await page.locator('#player-setup').isVisible());
  await page.locator('#player-name').pressSequentially('we a d');await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__game.gameTime),0);assert.equal(await page.evaluate(()=>window.__game.input.keys.size),0);
  await page.keyboard.press('F4');assert.equal(await page.locator('#ecology-panel').isVisible(),false);
  const colors=['cyan','blue','green','red','yellow'];
  for(const color of colors) {
    await page.locator('#player-name').fill('달빛 늑대');await page.locator(`input[value="${color}"]`).check();
    await page.screenshot({path:'reports/M6-player-setup.png'});await page.locator('#player-start').click();
    const identity=await page.evaluate(()=>({color:window.__game.player.color,name:window.__game.player.displayName,paused:window.__game.paused}));
    assert.deepEqual(identity,{color,name:'달빛 늑대',paused:false});
    await page.locator('#reset-btn').evaluate(e=>e.click());await page.locator('#reset-confirm-yes').click();assert(await page.locator('#player-setup').isVisible());
    assert.equal(await page.locator('#player-name').inputValue(),'달빛 늑대');
  }
  await page.locator('#player-name').fill('<img src=x>');await page.locator('input[value="green"]').check();await page.locator('#player-start').click();
  await page.evaluate(()=>{
    const g=window.__game;g.paused=true;
    const [a,b]=g.entities.filter(e=>e.behavior==='ai');g.entities=[g.player,a,b];
    g.player.score=2000;g.player.size=40;a.score=1000;a.size=80;b.score=10;b.size=160;
  });await page.waitForTimeout(350);
  await page.locator('#quick-ranking').click();/* R-VIS-010: the rank number opens the full ranking */await page.locator('#ranking-mode-score').click();await page.waitForTimeout(350);
  assert.equal(await page.locator('.rank-row').first().locator('.rank-name').innerText(),'<img src=x>');
  assert.equal(await page.locator('#live-ranking img').count(),0);
  const scoreTop=await page.locator('.rank-row').first().getAttribute('data-id');
  await page.locator('#ranking-mode-size').click();await page.waitForTimeout(350);
  assert.notEqual(await page.locator('.rank-row').first().getAttribute('data-id'),scoreTop);
  assert.equal(await page.locator('.rank-row').first().locator('.rank-score').innerText(),'160');
  assert.equal(await page.locator('.rank-row').first().locator('.rank-secondary').innerText(),'점수 10');
  assert.match(await page.locator('#my-rank').innerText(),/크기 순위 3 \/ 3/);
  await page.evaluate(()=>window.__game.player.displayName='달빛 늑대');await page.waitForTimeout(300);
  await page.screenshot({path:'reports/M6-size-ranking.png'});
  await page.reload();await page.waitForFunction(()=>window.__game);
  assert.equal(await page.locator('#player-name').inputValue(),'<img src=x>');assert(await page.locator('input[value="green"]').isChecked());
  assert.equal(await page.locator('#ranking-mode-size').getAttribute('aria-pressed'),'true');
  await page.locator('#player-name').fill('');await page.locator('#player-start').click();assert.equal(await page.evaluate(()=>window.__game.player.displayName),'나');
  await page.locator('#reset-btn').evaluate(e=>e.click());await page.locator('#reset-confirm-yes').click();
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
  const r=await page.locator('#player-setup').boundingBox();assert(r.x>=0&&r.x+r.width<=390&&r.y>=0&&r.y+r.height<=844);
  await page.screenshot({path:'reports/M6-player-setup-mobile.png'});
  await page.locator('#player-name').fill('새 포식자');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#player-setup').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.__game.player.displayName),'새 포식자');
  const x=await page.evaluate(()=>window.__game.player.x);await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');assert.notEqual(await page.evaluate(()=>window.__game.player.x),x);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log(JSON.stringify({result:'PASS',checks:['setup pauses simulation/input','five colors','name/reset','HTML as plain text','score/size ranking','profile and ranking persistence','blank fallback','mobile dialog','Enter start','movement'],errors,failed}));
} finally {await browser.close();}
