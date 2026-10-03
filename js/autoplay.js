import {delta} from './topology.js';
import { boundCenter } from './worldBounds.js';
import {canEatOrb,canAbsorb,isHostile,dist} from './collision.js';
import {canStartAttack,canStartDodge} from './combat.js';
export class Autoplay {
 constructor(game){this.game=game;this.enabled=false;this.timer=0;this.dodgeWait=0;this.action=null;this.reason='OFF';this.policy='local-survival-v2';this.explorationPoint=null;this.explorationRecent=[];this.explorationIndex=0;}
 setEnabled(value){this.enabled=!!value;this.timer=0;this.dodgeWait=0;this.action=null;this.explorationPoint=null;this.explorationRecent=[];this.explorationIndex=0;this.reason=this.enabled?'탐색 준비':'OFF';if(value){const input=this.game.input;input.keys.clear();input.mouseDown=false;input.touchMove=null;input._specialQueued=false;input._dodgeQueued=false;}}
 explore(){
  const g=this.game,p=g.player,held=this.explorationPoint;
  if(held&&g.gameTime<held.expires&&dist(p,held)>40)return held;
  const w=g.balance.world,angle=((g.seed>>>0)%360)*Math.PI/180+this.explorationIndex++*Math.PI*(3-Math.sqrt(5));
  const points=Array.from({length:4},(_,i)=>({x:boundCenter(p.x+Math.cos(angle+i*Math.PI/2)*600,p.size,w.worldWidth,w.wrap),y:boundCenter(p.y+Math.sin(angle+i*Math.PI/2)*600,p.size,w.worldHeight,w.wrap)}));
  const score=point=>dist(p,point)-this.explorationRecent.reduce((n,r)=>n+Math.max(0,350-dist(point,r)),0);
  points.sort((a,b)=>score(b)-score(a));this.explorationRecent=[...this.explorationRecent,{x:p.x,y:p.y}].slice(-4);
  this.explorationPoint={...points[0],expires:g.gameTime+12};return this.explorationPoint;
 }
 update(dt){
  if(!this.enabled)return;const g=this.game,p=g.player;
  if(g.gameOver||!p.alive){this.action=null;this.reason='게임 종료';return;}
  this.timer-=dt;this.dodgeWait=Math.max(0,this.dodgeWait-dt);if(this.timer>0)return;this.timer=.1;
  const candidates=g.getNearbyEntities(p,800).filter(e=>e.alive&&dist(p,e)<=800);
  const threats=candidates.filter(e=>e.behavior!=='orb'&&dist(p,e)<360&&(isHostile(p,e)&&e.size>=p.size*1.2||canAbsorb(e,p)));
  const sand=g.abilities.fields.find(f=>f.owner.alive&&f.owner.apex&&f.owner.color!==p.color&&dist(p,f)<420);
  const environment=g.biomes.danger(p);const danger=p.beingAbsorbedByRef??environment??sand??threats.sort((a,b)=>dist(p,a)-dist(p,b)||a.id-b.id)[0];
  let target,escape=!!danger;
  if(danger){const away=delta(danger,p);target={x:p.x+away.x,y:p.y+away.y};if(target.x===p.x&&target.y===p.y)target.x+=100;this.reason=`도주 · ${environment?.name??(sand?'모래바람':'위협')}`;}
  else {
   const safe=e=>threats.every(t=>dist(e,t)>180)&&!g.biomes.danger(e);
   const relic=g.relics.desired(p,safe);
   const food=candidates.filter(e=>canEatOrb(p,e,g.balance)&&safe(e)).sort((a,b)=>b.growthValue/(dist(p,b)+60)-a.growthValue/(dist(p,a)+60)||a.id-b.id)[0];
   target=relic??food;this.reason=relic?'유물 수집':food?'먹이 탐색':'월드 탐색';
   if(!target)target=this.explore();
   target=g.biomes.routePoint(p,target);
  }
  const w=g.balance.world;
  target={x:boundCenter(target.x,p.size,w.worldWidth,w.wrap),y:boundCenter(target.y,p.size,w.worldHeight,w.wrap)};
  const {x:dx,y:dy}=delta(p,target),length=Math.hypot(dx,dy),enemy=candidates.filter(e=>isHostile(p,e)&&dist(p,e)<=350).sort((a,b)=>dist(p,a)-dist(p,b)||a.id-b.id)[0];
  const dodge=escape&&this.dodgeWait<=0&&canStartDodge(p);if(dodge)this.dodgeWait=.8;
  this.action={move:length>8?{x:dx/length,y:dy/length}:{x:0,y:0},aim:enemy??target,attack:!escape&&p.hp/p.maxHp>.3&&!!enemy&&canStartAttack(p),dodge,special:!escape&&!!enemy&&g.abilities.canCast(p)};
 }
}
