// R-CTRL-006 / R-VIS-009 / R-VIS-010: era banner at the top centre without covering vitals, top buttons, toggle tray, ranking, minimap or ability rings; sprint gauge under the HP bar; E/R cooldowns on the ability rings; status chips and the green absorb lock drawn.
// Phones: the top band (vitals, era, buttons, tray) stays apart and the dodge button is the biggest control at the bottom-right thumb rest.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[],results={};
const IDS=['hud','hud-top','toggle-tray','ability-bar','live-ranking','minimap-panel'];
async function open(viewport,touch){
 const context=await browser.newContext({viewport,isMobile:touch,hasTouch:touch}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();await page.waitForTimeout(300);
 // grow past sprint unlock, jump to the decline doom warning, open ranking + minimap
 await page.evaluate(()=>{const g=window.__game;g.player.addGrowth(4000,g.balance);g.gameTime=500;g.era.update(0);});await page.waitForTimeout(900);
 await page.evaluate(()=>{const g=window.__game;g.paused=true;g.player.specialCooldown=0;g.player.normalSkillCooldown=5;});await page.waitForTimeout(200);
 return {page,context};
}
const rects=page=>page.evaluate(ids=>{const out={};const vis=e=>e&&!e.hidden&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>0;
 for(const id of ids){const e=document.getElementById(id);if(!vis(e))continue;const r=e.getBoundingClientRect();out[id]={left:r.left,top:r.top,right:r.right,bottom:r.bottom};}
 const b=document.getElementById('era-status').getBoundingClientRect();out.era={left:b.left,top:b.top,right:b.right,bottom:b.bottom};return out;},IDS);
const apart=(a,b)=>a.right<=b.left+.5||a.left>=b.right-.5||a.bottom<=b.top+.5||a.top>=b.bottom-.5;
async function checkLayout(page,label,width){
 const r=await rects(page);
 for(const [id,box]of Object.entries(r))if(id!=='era')assert(apart(r.era,box),`${label}: era banner overlaps ${id} ${JSON.stringify({era:r.era,[id]:box})}`);
 assert(r.era.left>=0&&r.era.right<=width,`${label}: banner inside the screen`);
 assert(r.era.top<=(width<500?100:60),`${label}: banner stays at the top`);/* portrait: second row under vitals and the rank */
 assert.match(await page.locator('#era-event').innerText(),/파멸 전조/,`${label}: doom warning shown in the banner`);
 return r;
}
try{
 // desktop
 {const {page,context}=await open({width:1280,height:760},false);const r=await checkLayout(page,'desktop',1280);
  assert(Math.abs((r.era.left+r.era.right)/2-640)<=2,'desktop banner centred');
  const g=await page.evaluate(()=>{const hp=document.querySelector('#hud .hp-bar-outer').getBoundingClientRect(),s=document.getElementById('sprint-gauge').getBoundingClientRect();return {gap:s.top-hp.bottom,dw:Math.abs(s.width-hp.width),dl:Math.abs(s.left-hp.left),hidden:document.getElementById('sprint-gauge').hidden};});
  assert.equal(g.hidden,false);assert(g.gap>=0&&g.gap<=8,'sprint gauge directly under the HP bar');assert(g.dw<1&&g.dl<1,'sprint gauge matches the HP bar');
  const rings=await page.evaluate(()=>[...document.querySelectorAll('#ability-bar .ab')].map(a=>({kind:a.dataset.kind,state:a.dataset.state,label:a.querySelector('.ab-label').textContent,sub:a.querySelector('.ab-key').textContent,p:+a.querySelector('.ab-ring').style.getPropertyValue('--p')})));
  assert.deepEqual(rings.map(x=>x.kind),['attack','dodge','special','ultimate'],'four ability rings');
  const e=rings.find(x=>x.kind==='special');assert.equal(e.label,'E');assert.match(e.sub,/\d+s/,'E cooldown seconds visible on its ring');assert(e.p>=0&&e.p<100,'E ring fills while cooling down');
  assert(r['ability-bar'].bottom<=760&&Math.abs((r['ability-bar'].left+r['ability-bar'].right)/2-640)<=2,'ability rings bottom centre');
  assert(apart(r['ability-bar'],r['toggle-tray']),'tray clear of the rings');
  // status chips + green absorb lock render through the real canvas
  const drawn=await page.evaluate(()=>{const g=window.__game,p=g.player,now=g.gameTime,ai=g.entities.find(e=>e.behavior==='ai'&&e.alive);ai.x=p.x+220;ai.y=p.y;ai.summoned={owner:p,absorbableAt:now+20,absorbable:false};p.frozen=1;p.objectSpeedUntil=now+3;p.objectSpeedMultiplier=1.25;
   const before=JSON.stringify(g.snapshot()),texts=[],orig=g.ctx.fillText;g.ctx.fillText=function(t,...a){texts.push(String(t));return orig.call(this,t,...a)};try{g.render();}finally{g.ctx.fillText=orig;}return {texts,same:before===JSON.stringify(g.snapshot())};});
  assert(drawn.texts.some(t=>/^흡수 불가 \d+s$/.test(t)),'green absorb lock chip drawn');assert(drawn.texts.some(t=>/^빙결 /.test(t)));assert(drawn.texts.some(t=>/^가속 \+25%/.test(t)));assert(drawn.same,'drawing does not change the game');
  await page.screenshot({path:'reports/R-CTRL-006-desktop.png'});results.desktop=true;await context.close();}
 // phones, minimal then full UI
 for(const [name,viewport]of [['landscape',{width:844,height:390}],['portrait',{width:390,height:844}]]){
  const {page,context}=await open(viewport,true);
  await page.evaluate(()=>{for(const id of ['quick-map','quick-ranking'])document.getElementById(id).click();});await page.waitForTimeout(400);
  assert(await page.evaluate(()=>document.body.classList.contains('mobile-minimal')),`${name} starts minimal`);
  const band=await checkLayout(page,`${name} minimal (ranking open)`,viewport.width);
  for(const [a,b]of [['hud','hud-top'],['hud','toggle-tray'],['hud-top','toggle-tray']])assert(apart(band[a],band[b]),`${name}: ${a} clear of ${b}`);
  const thumb=await page.evaluate(()=>Object.fromEntries(['touch-dodge','touch-special','touch-ultimate','toggle-tray','touch-attack','ability-bar'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return [id,getComputedStyle(e).display==='none'||e.hidden?null:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:r.width}];})));
  assert.equal(thumb['touch-attack'],null,`${name}: no attack button (right-half drag attacks)`);assert.equal(thumb['ability-bar'],null,`${name}: no desktop rings`);
  assert(thumb['touch-dodge'].w>thumb['touch-special'].w&&thumb['touch-dodge'].w>=96,`${name}: dodge is the biggest button`);
  assert(thumb['touch-dodge'].right>viewport.width*.85&&thumb['touch-dodge'].bottom>viewport.height*.85,`${name}: dodge at the right-thumb rest`);
  assert(thumb['toggle-tray'].bottom<viewport.height*.4,`${name}: toggles live in the top band, away from the attack drag`);
  await page.evaluate(()=>document.getElementById('quick-ranking').click());await page.waitForTimeout(300);await checkLayout(page,`${name} minimal (compact ranking)`,viewport.width);
  await page.screenshot({path:`reports/R-CTRL-006-${name}-minimal.png`});
  await page.evaluate(()=>document.getElementById('mobile-ui-toggle').click());await page.waitForTimeout(400);
  assert(!(await page.evaluate(()=>document.body.classList.contains('mobile-minimal'))),`${name} full UI`);
  await checkLayout(page,`${name} full UI`,viewport.width);await page.screenshot({path:`reports/R-CTRL-006-${name}-full.png`});
  results[name]=true;await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',...results,errors}));
}finally{await browser.close();}
