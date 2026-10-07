// R-CTRL-005: the first start shows the basic ability cards and the player's species card, paused, once per device;
// the help button reopens basic, species and terrain decks; the first visit to a terrain shows a hint that opens its card.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[],result={};
const card=page=>page.evaluate(()=>({id:document.getElementById('tc-card').dataset.card,title:document.querySelector('#tc-card h3')?.textContent,text:document.getElementById('tc-card').innerText,count:document.getElementById('tc-count').textContent,next:document.getElementById('tc-next').textContent}));
try{
 // desktop, first start
 {const context=await browser.newContext({viewport:{width:1280,height:760}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8001/?tutorial');await page.waitForFunction(()=>window.__game);
  await page.locator('#player-colors input[value="red"]').check();await page.locator('#player-start').click();await page.waitForTimeout(300);
  assert(await page.locator('#play-help').evaluate(d=>d.open&&d.classList.contains('tutorial-mode')),'first start opens the tutorial cards');
  assert.equal(await page.evaluate(()=>window.__game.paused),true,'the game waits while the cards are open');
  assert.equal(await page.locator('#play-help-title').innerText(),'처음 시작 안내');assert(!(await page.locator('#help-guide').isVisible()),'tutorial mode shows only the cards');
  const titles=[];for(let i=0;i<6;i++){const c=await card(page);titles.push(c.title);if(i===0){assert.match(c.text,/좌클릭/);assert.equal(c.count,'1 / 6');}if(i<5)await page.keyboard.press('ArrowRight');}
  assert.deepEqual(titles,['공격','회피','흡수','달리기','동행 요청','빨강 종족']);
  const last=await card(page);assert.equal(last.next,'시작하기');assert.match(last.text,/혈족 집결/);assert.match(last.text,/용암/);
  await page.screenshot({path:'reports/R-CTRL-005-first-run.png'});
  await page.locator('#tc-next').click();await page.waitForTimeout(150);
  assert.equal(await page.locator('#play-help').evaluate(d=>d.open),false);assert.equal(await page.evaluate(()=>window.__game.paused),false,'start resumes play');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ballgamenext_tutorial_v1')).firstRun),true);
  // help button: all three decks, own species first, guide text still there
  await page.locator('#help-btn').click();await page.waitForTimeout(100);
  assert.equal(await page.locator('#play-help-title').innerText(),'도움말');assert(await page.locator('#help-guide').isVisible());
  assert.equal((await card(page)).title,'공격');assert.equal(await page.locator('.tc-tab').count(),3);
  await page.locator('.tc-tab[data-deck="species"]').click();const sp=await card(page);assert.equal(sp.title,'빨강 종족');assert.equal(sp.count,'1 / 5');
  await page.locator('.tc-tab[data-deck="terrain"]').click();const tr=await card(page),here=await page.evaluate(()=>{const g=window.__game;return 'terrain-'+g.biomes.regionAt(g.player).id;});assert.equal(tr.id,here,'terrain deck opens on the current region');assert.match(tr.count,/ \/ 6$/);assert.match(tr.text,/지형 오브젝트/);
  for(let i=0;i<6;i++)await page.keyboard.press('ArrowLeft');const terrainTitles=[];for(let i=0;i<6;i++){terrainTitles.push((await card(page)).title);await page.keyboard.press('ArrowRight');}
  assert.deepEqual([...terrainTitles].sort(),['숲','사막','설원','초원','호수','화산'].sort());
  await page.locator('.tc-tab[data-deck="terrain"]').click();
  await page.screenshot({path:'reports/R-CTRL-005-help-terrain.png'});
  await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.locator('#play-help').evaluate(d=>d.open),false);
  // first visit to a terrain: non-blocking hint that opens that card
  await page.evaluate(()=>{const g=window.__game,r=g.biomes.regions.find(x=>x.id==='volcano');localStorage.setItem('ballgamenext_tutorial_v1',JSON.stringify({firstRun:true,regions:g.biomes.regions.filter(x=>x.id!=='volcano').map(x=>x.id)}));window.__tutorial.seen=JSON.parse(localStorage.getItem('ballgamenext_tutorial_v1'));g.player.x=r.x;g.player.y=r.y;});
  // the start region may still be showing its own 7s hint, so wait for the volcano text itself
  await page.waitForFunction(()=>!document.getElementById('terrain-hint').hidden&&document.getElementById('terrain-hint-text').textContent.startsWith('새 지형 · 화산'),null,{timeout:3000});
  assert.match(await page.locator('#terrain-hint-text').innerText(),/^새 지형 · 화산/);assert.equal(await page.evaluate(()=>window.__game.paused),false,'the hint does not pause');
  const hint=await page.locator('#terrain-hint').boundingBox(),era=await page.locator('#era-status').boundingBox();assert(hint.y>=era.y+era.height,'hint sits under the era banner');
  await page.screenshot({path:'reports/R-CTRL-005-terrain-hint.png'});
  await page.locator('#terrain-hint-open').click();await page.waitForTimeout(100);assert.equal((await card(page)).title,'화산');await page.keyboard.press('Escape');
  // reload: no second first-run deck
  await page.reload();await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(300);
  assert.equal(await page.locator('#play-help').evaluate(d=>d.open),false,'tutorial shows once per device');
  result.desktop=true;await context.close();}
 // phone portrait and landscape: the first-run card fits the screen
 for(const [name,viewport]of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8001/?tutorial');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(300);
  assert(await page.locator('#play-help').evaluate(d=>d.open));const c=await card(page);assert.match(c.text,/드래그/,'touch wording on touch screens');
  const box=await page.locator('#play-help').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,`${name} dialog inside the screen`);
  const next=await page.locator('#tc-next').boundingBox();assert(next.y+next.height<=viewport.height,`${name} next button reachable`);
  await page.screenshot({path:`reports/R-CTRL-005-${name}.png`});
  await page.locator('#help-close').click();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__game.paused),false,'skip resumes play');
  assert(await page.evaluate(()=>document.body.classList.contains('mobile-minimal')));await page.locator('#menu-btn').click();await page.locator('#quick-help').click();await page.waitForTimeout(100);
  assert(await page.locator('#play-help').evaluate(d=>d.open&&!d.classList.contains('tutorial-mode')),`${name} minimal UI help button reopens the cards`);const qb=await page.locator('#menu-btn').boundingBox();assert(qb.x>=0&&qb.x+qb.width<=viewport.width);await page.locator('#help-close').click();await page.waitForTimeout(150);
  result[name]=true;await context.close();
 }
 // automation without ?tutorial keeps a clear screen for the other checks
 {const page=await browser.newPage();await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(300);assert.equal(await page.locator('#play-help').evaluate(d=>d.open),false);await page.close();}
 assert.deepEqual(errors,[]);const out={status:'PASS',...result,errors};writeFileSync('reports/R-CTRL-005-tutorial.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));
}finally{await browser.close();}
