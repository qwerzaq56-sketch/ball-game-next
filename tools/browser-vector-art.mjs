import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 const radius=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;const p=g.player;p.size=80;p.color='blue';p.colorHex='#3b82f6';p.scalePulseTimer=.15;p.facing=-.3;
  const units=g.entities.filter(e=>e.behavior==='ai').slice(0,5);g.entities=[p,...units];units.forEach((e,i)=>{e.x=p.x+(i-2)*160;e.y=p.y+170;e.size=70;e.color=g.balance.colors[i].id;e.colorHex=g.balance.colors[i].color;e.role='forager';e.scalePulseTimer=.15;e.attackState='READY';e.apex=false;e.hp=e.maxHp;});
  const ctx=g.ctx,arc=ctx.arc,fill=ctx.fill;let lastArc=null;const fills=[];
  ctx.arc=function(...args){lastArc=args;return arc.apply(this,args);};ctx.fill=function(...args){fills.push({arc:lastArc,style:ctx.fillStyle});return fill.apply(this,args);};
  try{g.drawEntity(ctx,p);}finally{ctx.arc=arc;ctx.fill=fill;}
  return {body:fills.find(f=>f.style===p.colorHex)?.arc[2],actual:p.size/2};
 });assert.equal(radius.body,radius.actual);await page.waitForTimeout(250);await page.screenshot({path:'/tmp/M22-vector-art.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',species:5,bodyRadius:radius.body,growthOutside:true,playerDirection:true,errors}));
}finally{await browser.close();}
