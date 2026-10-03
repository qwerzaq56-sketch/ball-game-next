import {sizeBand} from './balanceMetrics.js';
// Lifetime totals retain no dead actor references. Only current windups enter pending.
export class AbilityMetrics {
 constructor(game){this.game=game;this.rows=new Map();this.pending=new Map();}
 token(owner,cast){
  if(cast?.metricKey)return {key:cast.metricKey};
  const skill=cast?.skill,id=skill?.id??`${owner.color}-legacy`,slot=cast?.slot??'R';
  const dims={skill:id,slot,color:owner.color,type:owner.behavior,band:sizeBand(owner.size),personality:owner.personality??'survival-player',region:this.game?.biomes?.regionAt(owner)?.id??'none'},key=JSON.stringify(dims);
  if(!this.rows.has(key))this.rows.set(key,{...dims,starts:0,fires:0,cancelled:0,hits:0,damage:0,hpRatio:0,recruits:0,summons:0,buffs:0,marks:0});
  const row=this.rows.get(key),settings=Object.fromEntries(Object.entries(skill??{}).filter(([,value])=>typeof value==='number'));if(!row.settings)row.settings=settings;else if(JSON.stringify(row.settings)!==JSON.stringify(settings))row.mixedSettings=true;
  if(cast)cast.metricKey=key;return {key};
 }
 row(token){return this.rows.get(token?.key);}
 start(owner,cast){const token=this.token(owner,cast);this.row(token).starts++;this.pending.set(cast.id,{owner,cast,token});}
 fire(owner,cast){this.row(this.token(owner,cast)).fires++;this.pending.delete(cast.id);}
 count(owner,cast,kind,count=1){const row=this.row(this.token(owner,cast));if(row&&['recruits','summons','buffs','marks'].includes(kind))row[kind]+=count;}
 hit(token,lost,maxHp){const row=this.row(token);if(!row)return;row.hits++;row.damage+=lost;row.hpRatio+=lost/Math.max(1,maxHp);}
 reconcile(){for(const [id,p] of this.pending)if(!p.owner.alive||p.owner.specialCast!==p.cast){this.row(p.token).cancelled++;this.pending.delete(id);}}
 export(){const signatures=new Map();let mixedConfiguration=false;for(const row of this.rows.values()){const signature=JSON.stringify(row.settings);if(row.mixedSettings||signatures.has(row.skill)&&signatures.get(row.skill)!==signature)mixedConfiguration=true;signatures.set(row.skill,signature);}return {mixedConfiguration,format:'ball-next-skills-v1',meaning:'Direct skill damage only; HP ratios sum lostHP/maxHP at each hit. Buff-assisted attacks are not attributed.',pending:this.pending.size,rows:[...this.rows.values()].map(row=>({...row,settings:{...row.settings}}))};}
}
