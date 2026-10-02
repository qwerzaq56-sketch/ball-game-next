import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const prefix=process.env.BROWSER_ERA_PREFIX??'/tmp/M20';
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);await page.keyboard.press('F4');await page.keyboard.press('F5');
 for(const [time,name]of [[0,'영양기'],[180,'경쟁기'],[360,'전쟁기'],[480,'쇠퇴기']]){
  await page.evaluate(time=>{const g=window.__game;g.paused=true;g.gameTime=time;g.era.update(0);},time);await page.waitForTimeout(300);assert((await page.locator('#era-text').innerText()).includes(name));assert((await page.locator('#ecology-era').innerText()).includes(name));
 }
 await page.evaluate(()=>{const g=window.__game,f=g.era.apocalypse;g.player.x=f.x+f.radius+100;g.player.y=f.y;g.camera.x=f.x;g.camera.y=f.y;g.camera.zoom=.7;});await page.waitForTimeout(200);await page.screenshot({path:`${prefix}-warning.png`});assert((await page.locator('#era-text').innerText()).includes('전조'));
 const damage=await page.evaluate(()=>{const g=window.__game,f=g.era.apocalypse;g.entities=[g.player];g.player.x=f.x;g.player.y=f.y;const before=g.player.hp;g.gameTime=486.5;g.era.update(.5);return {before,after:g.player.hp,active:g.era.apocalypse.active};});assert(damage.active);assert(damage.after<damage.before);await page.waitForTimeout(200);await page.screenshot({path:`${prefix}-active.png`});
 const rewards=await page.evaluate(()=>{const g=window.__game;g.gameTime=494;g.era.update(7.5);return g.entities.filter(e=>e.regionReward==='apocalypse').length;});assert.equal(rewards,12);
 await page.evaluate(()=>{const g=window.__game;g.reset();g.paused=true;const a=g.entities.find(e=>e.behavior==='ai'),b=g.entities.find(e=>e.behavior==='ai'&&e.color!==a.color);a.x=g.player.x+150;a.y=g.player.y;b.x=a.x+200;b.y=a.y;b.apex=true;a.role='predator';a.apex=false;a.state='chase_fight';a.challengeTarget=b;g.era.observeDuels();});await page.waitForTimeout(300);assert((await page.locator('#ecology-duels').innerText()).includes('1쌍'));await page.screenshot({path:`${prefix}-duel.png`});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.screenshot({path:`${prefix}-mobile.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',phases:4,warning:true,damage,rewards,duel:true,errors}));
}finally{await browser.close();}
