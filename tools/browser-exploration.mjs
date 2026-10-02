import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 const result=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;const a=g.entities.find(e=>e.behavior==='ai');g.entities=[g.player,a];a.x=g.player.x+300;a.y=g.player.y;a.state='search';a.target=null;a.decisionTimer=100;a.companionGroup=null;a.explorationPoint={x:a.x+600,y:a.y,expires:g.gameTime+10};
  const start=a.x;g.balance.spawning.orbSpawnInterval=1000;g.balance.spawning.enemySpawnInterval=1000;
  g.paused=false;for(let i=0;i<300;i++)g.update(1/60);g.paused=true;g.ui.inspector.toggle();g.ui.inspector.select(a.id);
  return {travel:a.x-start,point:a.explorationPoint,range:g.balance.ai.detectionRange,target:a.target,state:a.state};
 });assert(result.travel>100);assert.equal(result.range,320);assert.equal(result.target,null);assert.equal(result.state,'search');await page.waitForTimeout(350);
 assert.match(await page.locator('#ai-detail').innerText(),/탐색 목적지/);await page.screenshot({path:process.env.BROWSER_EXPLORATION_PREFIX??'/tmp/M18-exploration.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',...result,errors}));
}finally{await browser.close();}
