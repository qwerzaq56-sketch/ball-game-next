import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 const result=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;g.gameTime=360;g.era.update(0);g.camera.x=g.camera.y=2500;g.camera.zoom=1;
  const fronts=g.era.fronts(),positions=g.balance.colors.map(c=>g.era.warDestination({color:c.id,role:'predator',attackUnlocked:true}));
  const before=JSON.stringify(g.snapshot());const ctx=g.ctx,original=ctx.fillText;let labels=0;
  ctx.fillText=function(text,...args){if(text==='전선')labels++;return original.call(this,text,...args);};try{g.render();}finally{ctx.fillText=original;}
  g.ui.ecologyUI.toggle('minimap',true);g.ui.ecologyUI.toggle('ecology',true);g.ui.ecologyUI.minimap.render(g);
  return {fronts,positions,labels,pure:before===JSON.stringify(g.snapshot())};
 });assert.equal(result.fronts.length,5);assert.equal(result.labels,5);assert(result.pure);result.fronts.forEach((p,i)=>{assert.equal(p.x,result.positions[i].x);assert.equal(p.y,result.positions[i].y);});
 await page.waitForTimeout(350);assert.match(await page.locator('#minimap-era').innerText(),/□ 전선/);assert.match(await page.locator('#ecology-duels').innerText(),/전선 이동/);await page.screenshot({path:'/tmp/M25-war-fronts.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);await page.screenshot({path:'/tmp/M25-war-fronts-mobile.png'});
 const end=await page.evaluate(()=>{const g=window.__game;g.gameTime=480;g.era.update(0);g.ui.ecologyUI.minimap.render(g);return g.era.fronts().length;});assert.equal(end,0);assert.doesNotMatch(await page.locator('#minimap-era').innerText(),/전선/);assert.deepEqual(errors,[]);
 await writeFile('/tmp/M25-browser-war-fronts.json',JSON.stringify({result:'PASS',...result,hiddenAfterWar:true,mobile:true,errors},null,2));console.log(JSON.stringify({result:'PASS',fronts:5,sameDestinations:true,readOnly:result.pure,hiddenAfterWar:true,mobile:true,errors}));
}finally{await browser.close();}
