import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(350);
 const radius=await page.evaluate(()=>{
  const g=window.__game;g.paused=true;const p=g.player;p.size=80;p.color='blue';p.colorHex='#3b82f6';p.visualSize=p.size;/* the drawn radius follows the eased visual size */p.scalePulseTimer=.15;p.facing=-.3;
  const units=g.entities.filter(e=>e.behavior==='ai').slice(0,5);g.entities=[p,...units];units.forEach((e,i)=>{e.x=p.x+(i-2)*160;e.y=p.y+170;e.size=70;e.color=g.balance.colors[i].id;e.colorHex=g.balance.colors[i].color;e.role='forager';e.visualSize=e.size;e.scalePulseTimer=.15;e.attackState='READY';e.apex=false;e.hp=e.maxHp;});
  const ctx=g.ctx,arc=ctx.arc,fill=ctx.fill,stroke=ctx.stroke,drawImage=ctx.drawImage;let lastArc=null;const fills=[],strokes=[],images=[],clip=ctx.clip;let clipped=false;ctx.clip=function(...args){clipped=true;return clip.apply(this,args);};ctx.drawImage=function(...args){images.push({arc:lastArc,afterClip:clipped});clipped=false;return drawImage.apply(this,args);};
  ctx.arc=function(...args){lastArc=args;return arc.apply(this,args);};ctx.fill=function(...args){fills.push({arc:lastArc,style:ctx.fillStyle});return fill.apply(this,args);};
  ctx.stroke=function(...args){strokes.push({arc:lastArc,style:ctx.strokeStyle});return stroke.apply(this,args);};
  try{g.drawEntity(ctx,p);}finally{ctx.arc=arc;ctx.fill=fill;ctx.stroke=stroke;ctx.drawImage=drawImage;ctx.clip=clip;}
  const bodyImage=images.find(i=>i.afterClip),raster=!!bodyImage;// raster body: the clip arc right before its drawImage carries the body radius
  return {raster,body:raster?bodyImage.arc?.[2]:fills.find(f=>f.style===p.colorHex)?.arc[2],outline:raster?null:strokes.find(s=>s.style==='#ffffff')?.arc[2],actual:p.size/2};
 });assert.equal(radius.body,radius.actual);if(!radius.raster)assert.equal(radius.outline,radius.actual);await page.waitForTimeout(250);await page.screenshot({path:'/tmp/M22-vector-art.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',species:5,raster:radius.raster,bodyRadius:radius.body,growthOutside:true,playerDirection:true,errors}));
}finally{await browser.close();}
