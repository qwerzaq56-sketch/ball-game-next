import test from 'node:test';import assert from 'node:assert/strict';
import {spawnOrb} from '../js/spawning.js';
import {createGame} from '../tools/headless.mjs';import {AIEntity,updateAI} from '../js/ai.js';import {resetRandom} from '../js/random.js';import {applyDamage,attackChargeDistanceForSize,dodgeDistanceForSize} from '../js/combat.js';
function setup(size=500){const g=createGame(17),p=g.player;p.color='green';p.size=size;p.x=p.y=4000;p.hp=p.maxHp=5000;p.apex=true;p._specialApex=true;g.biomes.enabled=false;g.entities=[p];return {g,p,unit:(size,color='green',x=4100)=>new AIEntity({balance:g.balance,x,y:4000,startSize:size,color,colorHex:'#0f0'})};}
function invite(g,p){const cfg=g.abilities.skill(p,'E');g.abilities.fireNormal(p,{id:1,slot:'E',skill:cfg,dir:0,point:{x:p.x,y:p.y}});}
test('green E provides solo attack and real defense, stacks to cap, then expires',()=>{
 const {g,p}=setup();for(let i=0;i<7;i++)invite(g,p);assert.equal(p.inviteBuffs.length,5);assert.equal(g.abilities.defenseMultiplier(p),1.25);assert.equal(g.abilities.damageMultiplier(p),1.2);
 const before=p.hp;applyDamage(p,500,g,null,g.balance,{knockback:false});assert.equal(before-p.hp,187.5);g.gameTime=31;g.abilities.update(0);assert.equal(g.abilities.defenseMultiplier(p),1);assert.equal(g.abilities.damageMultiplier(p),1);
});
test('R-ABIL-006 70 percent E acceptance ignores personality and buffs accepted and existing companions',()=>{
 const {g,p,unit}=setup(),ally=unit(100);p.apex=false;ally.companionAffinity='independent';resetRandom(884);let accepted=0;
 for(let i=0;i<300;i++){g.allyLinks.groups.clear();g.allyLinks.edges.clear();p.companionGroup=ally.companionGroup=null;p.inviteBuffs=ally.inviteBuffs=[];g.entities=[p,ally];invite(g,p);if(ally.companionGroup){accepted++;assert.equal(g.abilities.invitePower(ally,'damage'),.04);}}
 assert(accepted>=190&&accepted<=230,`accepted ${accepted}/300`);g.allyLinks.groups.clear();p.companionGroup=ally.companionGroup=null;g.allyLinks.recruit(p,ally);p.inviteBuffs=ally.inviteBuffs=[];ally.x=5500;invite(g,p);assert.equal(g.abilities.invitePower(ally,'defense'),.05);
});
test('size-scaled randomized summons never exceed one fifth, keep actions and cannot consume food',()=>{
 for(const size of [100,500,1500]){const {g,p}=setup(size);g.abilities.summon(p,{id:1,skill:g.abilities.skill(p,'R')});const summons=g.entities.filter(t=>t.summoned);assert.equal(summons.length,2);assert.notEqual(summons[0].size,summons[1].size);for(const s of summons){assert(s.size<=p.size*.2&&s.size>=p.size*.12);assert(s.attackUnlocked&&s.dodgeUnlocked);}
 const orb=spawnOrb(g.balance,{x:summons[0].x,y:summons[0].y}),before=summons[0].size;g.entities=[summons[0],orb];g.buildGrid();g.resolveConsumption();assert(orb.alive);assert.equal(summons[0].size,before);

 }
});

test('companions stay linked over two size-scaled actions, then disconnect beyond tether',()=>{
 const {g,p,unit}=setup(),ally=unit(100);g.entities.push(ally);g.allyLinks.recruit(p,ally);g.gameTime=25;
 const distance=2*Math.max(attackChargeDistanceForSize(p.size,g.balance,p.apex),dodgeDistanceForSize(p.size,g.balance));
 ally.x=p.x+(p.size+ally.size)/2+distance-1;g.allyLinks.refresh();assert.equal(ally.companionGroup,p.companionGroup);
 ally.x+=3;g.allyLinks.refresh();assert.equal(ally.companionGroup,null);
});
test('summoned companions focus the owner attacker and remain grouped through repeated attack decisions',()=>{
 const {g,p,unit}=setup();g.abilities.summon(p,{id:1,skill:g.abilities.skill(p,'R')});const summons=g.entities.filter(t=>t.summoned),enemy=unit(600,'red',4650);g.entities.push(enemy);g.buildGrid();applyDamage(p,300,g,enemy,g.balance,{knockback:false});
 for(const s of summons){assert(g.allyLinks.combat(s));assert.equal(s.target,enemy);}
 assert.equal(g.allyLinks.groups.get(p.companionGroup).aggressor,enemy);
 g.gameTime=10;for(let i=0;i<30;i++){g.allyLinks.timer=0;for(const s of summons)s.companionCooldown=0;g.allyLinks.update(0);}assert(summons.every(s=>s.companionGroup===p.companionGroup));
});
