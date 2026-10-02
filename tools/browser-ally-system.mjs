import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const prefix=process.env.BROWSER_ALLY_REPORT_PREFIX??'reports/M8';
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(process.argv[2]??'http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const actorId=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;g.allyLinks.timer=1000;
  const ais=g.entities.filter(e=>e.behavior==='ai').slice(0,3);g.entities=[g.player,...ais];g.player.displayName='<img src=x>';g.player.size=80;
  ais.forEach((e,i)=>{e.color=g.player.color;e.colorHex=g.player.colorHex;e.x=g.player.x+140+i*100;e.y=g.player.y;e.size=50;e.hp=e.maxHp=250;e.score=1000-i*100;});
  g.allyLinks.refresh();g.allyLinks.join(ais[0],g.player);g.allyLinks.join(ais[1],ais[0]);g.allyLinks.join(ais[2],ais[1]);
  return ais[0].id;
 });await page.waitForTimeout(350);
 assert.match(await page.locator('#ally-link-status').innerText(),/대열 동행/);assert.equal(await page.locator('#companion-leave').isDisabled(),false);
 assert.equal(await page.evaluate(()=>window.__game.abilities.canCast(window.__game.player)),false);
 const before=await page.evaluate(()=>JSON.stringify(window.__game.snapshot()));await page.locator('#ally-links-toggle').click();assert.equal(await page.evaluate(()=>window.__game.showAllyLinks),false);assert.equal(await page.evaluate(()=>JSON.stringify(window.__game.snapshot())),before);await page.locator('#ally-links-toggle').click();
 await page.keyboard.press('F2');await page.evaluate(id=>window.__game.ui.inspector.select(id),actorId);await page.waitForTimeout(350);
 assert((await page.locator('#ai-detail').innerText()).includes('<img src=x>'));assert.equal(await page.locator('#ai-detail img').count(),0);await page.keyboard.press('F2');
 await page.evaluate(()=>{window.__game.player.displayName='달빛 늑대';});await page.waitForTimeout(150);
 await page.screenshot({path:`${prefix}-ally-chain.png`});
 await page.keyboard.press('G');assert.equal(await page.evaluate(()=>window.__game.player.companionGroup),null);
 await page.evaluate(()=>{const g=window.__game;g.paused=false;});await page.waitForTimeout(300);
 await page.evaluate(()=>{const g=window.__game;g.reset();g.paused=true;g.allyLinks.timer=1000;const p=g.player;p.color='yellow';p.colorHex='#eab308';p.size=120;p.apex=true;p._specialApex=true;p.specialCooldown=0;g.entities=[p];g.abilities.start(p,0);});
 await page.screenshot({path:`${prefix}-sand-windup.png`});
 await page.evaluate(()=>{const g=window.__game;for(let i=0;i<48;i++)g.abilities.update(1/60);});assert.equal(await page.evaluate(()=>window.__game.abilities.fields.length),1);
 await page.screenshot({path:`${prefix}-sand-field.png`});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',chain:true,companionship:true,peaceful:true,leaveG:true,lineTogglePurity:true,inspector:true,sand:true,errors}));
} finally {await browser.close();}
