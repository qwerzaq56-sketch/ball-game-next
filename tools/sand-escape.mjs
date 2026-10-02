import {createGame} from './headless.mjs';
import {AIEntity,updateAI} from '../js/ai.js';
import {ABILITIES} from '../js/abilities.js';
import {dist} from '../js/collision.js';
export function sandEscape({size=40,speed=130,offset=0}={}) {
 const g=createGame(23),owner=g.player;owner.color='yellow';owner.size=120;owner.apex=true;owner._specialApex=true;
 const center={x:owner.x+350,y:owner.y};
 const prey=new AIEntity({x:center.x+offset,y:center.y,startSize:size,color:'red',colorHex:'#f00',balance:g.balance});
 prey.role='prey';prey.personality='cautious';prey.moveSpeed=speed;prey.decisionTimer=0;prey.attackStack=0;
 g.entities=[owner,prey];g.abilities.fields=[{owner,...center,time:0,tick:0}];
 const hp=prey.hp,dt=1/60;
 while(prey.alive&&dist(prey,center)<=ABILITIES.yellow.radius&&g.gameTime<6){
  g.gameTime+=dt;g.buildGrid();g.abilities.update(dt);updateAI(prey,dt,g,g.balance);
 }
 return {size,speed,offset,radius:ABILITIES.yellow.radius,seconds:Number(g.gameTime.toFixed(3)),remainingHp:Number(prey.hp.toFixed(3)),lostFraction:Number(((hp-prey.hp)/hp).toFixed(3)),alive:prey.alive,escaped:dist(prey,center)>ABILITIES.yellow.radius};
}
if(process.argv[1]?.endsWith('sand-escape.mjs'))console.log(JSON.stringify([20,40,60].map(size=>sandEscape({size})),null,2));
