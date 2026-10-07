import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(process.argv[2]??'http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const ids=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;const ais=g.entities.filter(e=>e.behavior==='ai').slice(0,7);g.entities=[g.player,...ais];
  g.player.score=10000;g.player.size=20;g.player.apex=false;
  ais.forEach((e,i)=>{e.size=150-i*10;e.score=i*100;e.apex=undefined;});
  g.ecology=new g.ecology.constructor();g.ecology.update(g,0);g.apexHistory.observe(g.entities,0,g.gameTime);
  return {holders:ais.filter(e=>e.apex).map(e=>e.id),expected:ais.slice(0,g.balance.ecology.maxApex??3).map(e=>e.id),playerApex:g.player.apex,playerId:g.player.id,largest:ais[0].id};
 });assert.deepEqual(ids.holders,ids.expected);assert.equal(ids.playerApex,false);
 await page.locator('#quick-ranking').click();/* R-VIS-010: open the full ranking */await page.locator('#ranking-mode-score').click();await page.waitForTimeout(350);assert.equal(Number(await page.locator('.rank-row').first().getAttribute('data-id')),ids.playerId);
 assert(!(await page.locator('.rank-row').first().innerText()).includes('★'));
 await page.locator('#ranking-mode-size').click();await page.waitForTimeout(350);
 assert.equal(Number(await page.locator('.rank-row').first().getAttribute('data-id')),ids.largest);
 assert((await page.locator('.rank-row').first().innerText()).includes('★'));
 await page.screenshot({path:process.env.BROWSER_TITLE_SCREENSHOT??'/tmp/current-size-titles.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',sizeTitles:true,scoreLeaderboardPreserved:true,sizeLeaderboard:true,errors}));
} finally {await browser.close();}
