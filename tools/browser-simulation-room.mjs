import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
try {
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8001/simulation-room.html');await page.waitForFunction(()=>window.__room);
  assert.equal(await page.locator('#skill-preset-save').count(),0);await page.click('#baseline');await page.locator('#value').fill('250');await page.locator('#value').dispatchEvent('change');await page.click('#compare');
  const comparison=await page.evaluate(()=>window.__roomComparison);assert(comparison.runs.B.samples.at(-1).damage>comparison.runs.A.samples.at(-1).damage);assert.equal(comparison.runs.B.units.length,2);
  await page.screenshot({path:`reports/M80-room${mobile?'-mobile':''}.png`,fullPage:true});
  await page.click('#review');await page.waitForSelector('#designer-review[open]');assert(await page.evaluate(()=>window.__room.paused));
  await page.locator('#designer-review select').selectOption('B가 적절함');await page.locator('#designer-review textarea').fill('수치 변경에 따른 차이가 보입니다.');
  await page.screenshot({path:`reports/M80-question${mobile?'-mobile':''}.png`});await page.getByRole('button',{name:'의견 저장',exact:true}).click();
  const answer=await page.evaluate(()=>window.__designerReview.answers.at(-1));assert.equal(answer.answer.choice,'B가 적절함');assert.equal(answer.context.runs.B.balance.combatScaling.baseAttackDamage,250);
  await page.evaluate(()=>{window.__room.paused=false;window.__room.input.keys.add('w');window.__room.input.mouseDown=true;window.__answer=window.__designerReview.ask({id:'test-plain',title:'<img src=x onerror=alert(1)>',options:['확인']});});
  assert.equal(await page.locator('#designer-review img').count(),0);assert.equal(await page.evaluate(()=>window.__room.input.keys.size),0);await page.getByRole('button',{name:'나중에',exact:true}).click();assert.equal(await page.evaluate(()=>window.__answer),null);assert.equal(await page.evaluate(()=>window.__room.paused),false);
  await page.click('#reset');await page.locator('#condition-targetColor').selectOption('blue');await page.locator('#condition-distance').fill('90');await page.locator('#operation').selectOption('absorb');await page.click('#compare');
  assert(await page.evaluate(()=>!window.__room.entities[1].alive&&window.__room.player.size>100));
  const downloadPromise=page.waitForEvent('download');await page.click('#export');const download=await downloadPromise;const data=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(data.operation,'absorb');
  await page.route('**/data/designer-questions.json?*',route=>route.fulfill({json:{format:'ball-next-questions-v1',questions:[{id:'remote-test',revision:1,title:'새 실험 의견 요청',options:['적절함']}]}}));await page.evaluate(()=>window.__designerReview.poll());await page.waitForSelector('#designer-review[open]');await page.locator('#designer-review select').selectOption('적절함');await page.getByRole('button',{name:'의견 저장',exact:true}).click();await page.evaluate(()=>window.__designerReview.poll());assert.equal(await page.locator('#designer-review[open]').count(),0);
  assert.deepEqual(errors,[]);results.push({mobile,damageA:comparison.runs.A.samples.at(-1).damage,damageB:comparison.runs.B.samples.at(-1).damage,answerSaved:true,absorptionCompleted:true,queueDeduplicated:true,errors});await page.close();
 }
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8001/index.html');await page.waitForFunction(()=>window.__game&&window.__designerReview);assert.equal(await page.locator('a[href="simulation-room.html"]').count(),1);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());window.__game.paused=true;window.__designerReview.ask({id:'main-test',title:'플레이 의견',options:['확인']});});await page.waitForSelector('#designer-review[open]');await page.keyboard.press('Escape');assert(await page.evaluate(()=>window.__game.paused));assert.deepEqual(errors,[]);await page.close();
 fs.writeFileSync('reports/M80-browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
