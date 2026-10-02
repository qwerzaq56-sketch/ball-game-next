import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];
try {
 for(const scenario of ['desktop','desktop-debug','touch']) {
  const touch=scenario==='touch';
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
  await page.evaluate(()=>{const g=window.__game;g.seed=23;g.reset();});
  if(scenario==='desktop-debug'){await page.keyboard.press('F2');await page.keyboard.press('F3');await page.keyboard.press('F4');}
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{
   const g=window.__game;window.__timings={update:[],render:[],ui:[],interval:[],previous:performance.now(),started:performance.now()};
   for(const [object,key,label] of [[g,'update','update'],[g,'render','render'],[g.ui,'update','ui']]){
    const original=object[key];object[key]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{window.__timings[label].push(performance.now()-t);if(label==='update'){window.__timings.interval.push(t-window.__timings.previous);window.__timings.previous=t;}}};
   }
  });
  await page.waitForTimeout(6000);
  const data=await page.evaluate(()=>{
   const timings=window.__timings,summary={};
   for(const key of ['update','render','ui','interval']){const a=timings[key].slice(1).sort((a,b)=>a-b);summary[key]={samples:a.length,p50Ms:+a[Math.floor(a.length*.5)].toFixed(3),p95Ms:+a[Math.floor(a.length*.95)].toFixed(3),maxMs:+a.at(-1).toFixed(3)};}
   return {seconds:+((performance.now()-timings.started)/1000).toFixed(2),frames:timings.update.length,entities:window.__game.entities.length,summary};
  });assert(data.frames>=100,'representative frame sample');assert.deepEqual(errors,[]);results.push({scenario,...data,errors});await context.close();
 }
 console.log(JSON.stringify({platform:'cloud Chromium headless; not physical mobile hardware',results},null,2));
} finally {await browser.close();}
