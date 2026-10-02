// Real-time browser soak. Keeps diagnostics outside the checkout until the run completes.
import {createRequire} from 'node:module';
import {writeFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const start=Date.now(),argument=process.argv[2]??'60';
const deadline=/^\d+$/.test(argument)?start+Number(argument)*1000:Date.parse(argument);
if(!Number.isFinite(deadline)||deadline<=start||deadline-start>12*3600000)throw Error('Provide 1–43200 seconds or a future UTC deadline within 12 hours');
const output=process.argv[3]??'/tmp/ball-next-live-soak.json';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const workingTreeDirty=!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
const imagePrefix=output.replace(/\.json$/,'');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={commit,workingTreeDirty,policy:'nearest-food / survival escape / periodic attacks; replenished lives',startedAt:new Date(start).toISOString(),deadline:new Date(deadline).toISOString(),status:'RUNNING',timeline:[],errors};
async function save(){await writeFile(`${output}.tmp`,JSON.stringify(report,null,2));await rename(`${output}.tmp`,output);}
let lastProgress=0,lastTimeline=0,lastViewport=-1,lastDialogue=-1;
try {
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-name').fill('검증봇');await page.locator('#player-start').click();
 await page.evaluate(()=>{
  const g=window.__game;g.seed=23;g.reset();g.ui.ecologyUI.toggle('minimap',true);g.ui.ecologyUI.toggle('ecology',true);
  window.__soak={frames:0,checks:0,maxApex:0,maxGroups:0,maxSize:0,lastCheck:0,violation:null};
  const original=g.update;
  g.update=function(dt){
   original.call(this,dt);const s=window.__soak;if(this.paused)return;s.frames++;
   const units=this.entities.filter(e=>e.alive&&e.behavior!=='orb');
   const apex=units.filter(e=>e.apex).length;s.maxApex=Math.max(s.maxApex,apex);s.maxGroups=Math.max(s.maxGroups,this.allyLinks.groups.size);
   if(apex>3)s.violation=`apex cap ${apex}`;
   for(const group of this.allyLinks.groups.values()){
    if(group.members.size<2||group.members.size>6||!group.members.has(group.leader))s.violation='group membership';
    for(const e of group.members)if(!e.alive||e.color!==group.color||e.companionGroup!==group.id||e.attackState!=='READY'||e.specialCast)s.violation=`peaceful member #${e.id}`;
   }
   if(this.gameTime-s.lastCheck>=1){s.lastCheck=this.gameTime;for(const e of units){s.checks++;s.maxSize=Math.max(s.maxSize,e.size);for(const k of ['x','y','size','hp','maxHp','moveSpeed','facing'])if(!Number.isFinite(e[k]))s.violation=`nonfinite ${k} #${e.id}`;if(!(e.hp>0&&e.hp<=e.maxHp+1e-6))s.violation=`health #${e.id}`;if(e.companionGroup&&!this.allyLinks.groups.has(e.companionGroup))s.violation=`orphan #${e.id}`;}}
  };
 });
 while(Date.now()<deadline){
  if(errors.length)throw Error(errors.at(-1));
  const elapsed=(Date.now()-start)/1000;
  const viewportPhase=Math.floor(elapsed/600)%2;
  if(viewportPhase!==lastViewport){lastViewport=viewportPhase;await page.setViewportSize(viewportPhase?{width:844,height:390}:{width:390,height:844});}
  const dialoguePhase=Math.floor(elapsed/900);
  if(dialoguePhase>0&&dialoguePhase!==lastDialogue){lastDialogue=dialoguePhase;await page.locator('#help-btn').click();await page.waitForTimeout(150);await page.keyboard.press('Escape');}
  const sample=await page.evaluate(()=>{
   const g=window.__game,p=g.player,s=window.__soak;
   // A duration test is not a natural survival claim. Resume after exhausted test lives.
   if(g.gameOver){g.gameOver=false;g.lives=g.balance.lives.maxLives;g.paused=false;g.respawnPlayer();g.ui.hideGameOver();}
   if(g.lives<g.balance.lives.maxLives)g.lives=g.balance.lives.maxLives;
   if(g.paused&&!document.getElementById('play-help').open)g.paused=false;
   let target,escape=false;
   const field=g.abilities.fields.find(f=>f.owner.color!==p.color&&Math.hypot(f.x-p.x,f.y-p.y)<420);
   const threat=p.beingAbsorbedByRef??field??g.entities.filter(e=>e.alive&&e.behavior==='ai'&&e.size>p.size*1.3&&Math.hypot(e.x-p.x,e.y-p.y)<280).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
   if(threat){target=threat;escape=true;}else target=g.entities.filter(e=>e.alive&&e.behavior==='orb'&&e.size<p.size).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
   const dx=(target?.x??p.x)-p.x,dy=(target?.y??p.y)-p.y,sign=escape?-1:1;
   g.input.keys=new Set();if(Math.abs(dx)>8)g.input.keys.add(sign*dx>0?'d':'a');if(Math.abs(dy)>8)g.input.keys.add(sign*dy>0?'s':'w');
   const enemy=g.entities.filter(e=>e.alive&&e.behavior==='ai'&&e.color!==p.color&&Math.hypot(e.x-p.x,e.y-p.y)<400).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
   const aim=enemy??target??p,screen=g.worldToScreen(aim.x,aim.y);g.input.mouseX=screen.x;g.input.mouseY=screen.y;g.input.mouseDown=!!enemy&&!escape;
   if(p.apex&&enemy)g.input._specialQueued=true;if(escape&&p.dodgeStack>0)g.input._dodgeQueued=true;
   return {...s,gameSeconds:+g.gameTime.toFixed(2),size:+p.size.toFixed(2),score:p.score,defeats:p.defeatSerial??0,liveAI:g.entities.filter(e=>e.alive&&e.behavior==='ai').length,groups:g.allyLinks.groups.size,joins:g.allyLinks.stats.joins,leaves:g.allyLinks.stats.leaves,specialFires:g.abilities.specialFires??g.abilities.events.filter(e=>e.type==='special-fire').length,era:g.era?{phase:g.era.phase.id,cycle:g.era.cycle,apocalypses:g.era.completedApocalypses,duels:g.era.duelStarts}:null,relics:g.relics?{items:g.relics.items.length,pickups:g.relics.pickups}:null,heapBytes:performance.memory?.usedJSHeapSize??null};
  });
  if(sample.violation)throw Error(sample.violation);
  report.latest={wallSeconds:+elapsed.toFixed(1),...sample};
  if(elapsed-lastTimeline>=600||!report.timeline.length){lastTimeline=elapsed;report.timeline.push(report.latest);await page.screenshot({path:`${imagePrefix}-last.png`});}
  if(elapsed-lastProgress>=30||!lastProgress){lastProgress=elapsed;await save();console.log(JSON.stringify({status:'RUNNING',...report.latest}));}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(!report.latest||report.latest.frames<Math.min(100,(deadline-start)/100))throw Error('Insufficient active frame sample');
 await page.screenshot({path:`${imagePrefix}-last.png`});
 report.status='PASS';report.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:'PASS',output,...report.latest}));
}catch(error){report.status='FAIL';report.failure=String(error);report.completedAt=new Date().toISOString();await save();await page.screenshot({path:`${imagePrefix}-failure.png`}).catch(()=>{});throw error;}
finally{await browser.close();}
