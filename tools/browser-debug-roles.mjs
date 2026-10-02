import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(process.argv[2]??'http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const texts=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;g.ui.preferences.names=false;
  const ais=g.entities.filter(e=>e.behavior==='ai').slice(0,5);
  const roles=['prey','forager','predator','predator','predator'],relations=['challenger','subordinate','subordinate','challenger','independent'];
  ais.forEach((e,i)=>{e.role=roles[i];e.relationship=relations[i];e.x=g.player.x+(i%3-1)*180;e.y=g.player.y+(i<3?-130:130);e.size=60;e.apex=false;});g.entities=[g.player,...ais];
  const texts=[],original=g.ctx.fillText;g.ctx.fillText=function(text,...args){texts.push(text);return original.call(this,text,...args)};
  g.render();g.ctx.fillText=original;return texts;
 });
 for(const label of ['프레이','포레이저','프레데터 · 종속','프레데터 · 도전','프레데터 · 독립'])assert(texts.includes(label),label);
 await page.screenshot({path:'reports/M6-debug-roles.png'});
 await page.keyboard.press('F3');assert.equal(await page.evaluate(()=>window.__game.showAILabels),false);await page.keyboard.press('F3');
 await page.keyboard.press('F2');await page.waitForTimeout(300);await page.locator('#ai-rows [data-id]').last().click();await page.waitForTimeout(300);
 assert.match(await page.locator('#ai-detail').innerText(),/프레데터 관계/);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',roles:true,relationships:true,F3:true,inspector:true,errors}));
} finally {await browser.close();}
