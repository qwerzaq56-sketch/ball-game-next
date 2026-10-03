import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 const result=await page.evaluate(()=>{
  const g=window.__game;g.seed=23;g.reset();g.paused=true;g.entities=[g.player];g.camera={x:2500,y:2500,zoom:1};g.player.x=g.player.y=2500;
  g.allyLinks.edges.clear();g.particles=[];
  for(let i=0;i<1000;i++){
   const x=i<50?2150+(i%10)*60:4000+(i%10)*20,y=i<50?2350+Math.floor(i/10)*40:4000+Math.floor(i/10)*2;
   const a={id:10000+i*2,x,y,size:20,color:'blue',colorHex:'#3b82f6',alive:true,behavior:'ai'},b={...a,id:a.id+1,x:x+70};g.allyLinks.edges.set(`${a.id}:${b.id}`,[a,b]);
  }
  for(let i=0;i<4000;i++){const visible=i<200;g.particles.push({x:visible?2150+(i%20)*30:4000+(i%20)*20,y:visible?2350+Math.floor(i/20)*25:4000+Math.floor(i/20)*2,size:3,life:.5,maxLife:1,color:'#ffffff',type:i%4===0?'ring':'dot'});}
  const stats={};for(const [label,draw]of [['effects',()=>{g.allyLinks.draw(g.ctx,g.camera.zoom);g.drawParticles(g.ctx);}],['render',()=>g.render()]]){
   for(let i=0;i<20;i++)draw();const samples=[];for(let i=0;i<120;i++){const t=performance.now();draw();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);stats[label]={p50Ms:samples[60],p95Ms:samples[114]};
  }
  let strokes=0,arcs=0;const c=g.ctx,stroke=c.stroke,arc=c.arc;c.stroke=function(...a){strokes++;return stroke.apply(this,a);};c.arc=function(...a){arcs++;return arc.apply(this,a);};g.render();c.stroke=stroke;c.arc=arc;
  return {scene:'deterministic synthetic stress: 1000 ally edges, 4000 particles, mostly offscreen; paused rendering only',stats,strokes,arcs,png:g.canvas.toDataURL()};
 });const png=result.png;delete result.png;result.imageHash=createHash('sha256').update(png).digest('hex');writeFileSync(process.argv[2]??'/tmp/render-budget.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
