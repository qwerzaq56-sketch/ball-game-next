import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity} from '../js/ai.js';
import {Entity} from '../js/entity.js';
import {random,resetRandom} from '../js/random.js';
test('autoplay defaults off, chooses local food and escapes threats without extra RNG',()=>{
 const g=createGame(23),p=g.player;g.entities=[p,new Entity({x:p.x+100,y:p.y,size:10,color:'red',growthValue:10})];g.buildGrid();assert.equal(g.autoplay.enabled,false);g.autoplay.setEnabled(true);
 resetRandom(99);const expected=random('ai');resetRandom(99);g.autoplay.update(.1);assert(g.autoplay.action.move.x>0);assert.equal(g.autoplay.action.attack,false);assert.equal(random('ai'),expected);
 const enemy=new AIEntity({x:p.x+200,y:p.y,color:'red',colorHex:'#f00',startSize:100,balance:g.balance});g.entities.push(enemy);g.buildGrid();g.autoplay.update(.1);assert(g.autoplay.action.move.x<0);assert.match(g.autoplay.reason,/도주/);
});
test('peaceful companion autoplay cannot attack or cast and reset returns it off',()=>{
 const g=createGame(11),p=g.player;p.size=100;p._recomputeStacks(g.balance,true);p.apex=true;p.specialCooldown=0;
 const ally=new AIEntity({x:p.x+80,y:p.y,color:p.color,colorHex:p.colorHex,startSize:40,balance:g.balance}),enemy=new AIEntity({x:p.x+100,y:p.y,color:'red',colorHex:'#f00',startSize:50,balance:g.balance});g.entities=[p,ally,enemy];g.buildGrid();g.allyLinks.refresh();g.allyLinks.join(ally,p);g.autoplay.setEnabled(true);g.autoplay.update(.1);
 assert.equal(g.autoplay.action.attack,false);assert.equal(g.autoplay.action.special,false);g.reset();assert.equal(g.autoplay.enabled,false);assert.equal(g.runMetrics.samples.length,0);
});
test('autoplay uses ordinary lives and produces no action at game over',()=>{
 const g=createGame(11);g.autoplay.setEnabled(true);for(let i=0;i<3;i++)g.handlePlayerDefeat('test');assert.equal(g.lives,0);assert.equal(g.gameOver,true);g.autoplay.update(.1);assert.equal(g.autoplay.action,null);assert.equal(g.autoplay.reason,'게임 종료');
});
test('observer samples once per second, keeps 600 rows and lifetime totals survive truncation',()=>{
 const g=createGame(11);g.entities=[g.player];g.autoplay.setEnabled(true);g.player.attackState='TELEGRAPH';
 for(let i=0;i<660*60;i++){g.gameTime=(i+1)/60;g.runMetrics.observe(g,1/60);}
 assert.equal(g.runMetrics.samples.length,600);assert.equal(g.runMetrics.samples[0].time,61);assert.equal(g.runMetrics.samples.at(-1).time,660);assert.equal(g.runMetrics.attackStarts,1);assert(Math.abs(g.runMetrics.autoSeconds-660)<1e-6);
 g.player.attackState='READY';g.runMetrics.observe(g,1/60);g.player.attackState='TELEGRAPH';g.runMetrics.observe(g,1/60);assert.equal(g.runMetrics.attackStarts,2);
});
test('read-only export cannot mutate simulation/RNG and makes independent nested samples',()=>{
 const g=createGame(7);g.gameTime=1;g.runMetrics.observe(g,1);const before=JSON.stringify(g.snapshot());resetRandom(42);const expected=random('ai');resetRandom(42);const exported=g.runMetrics.export(g);
 assert.equal(random('ai'),expected);assert.equal(JSON.stringify(g.snapshot()),before);assert.equal(exported.policy.lifePolicy,'normal gameplay; no replenishment');assert.equal(exported.playerProfile.name,g.player.displayName);assert.equal(exported.playerProfile.color,g.player.color);assert.equal(exported.runtimeSettings.allyAbsorptionEnabled,g.player.allyAbsorptionEnabled);const originalColor=g.player.color;exported.playerProfile.color='other';assert.equal(g.player.color,originalColor);exported.samples[0].roles.prey=-1;assert(g.runMetrics.samples[0].roles.prey>=0);exported.config.player.startingSize=999;assert.equal(g.balance.player.startingSize,20);
});
test('phase observation attributes actual titles and transitions without enforcing occupancy',()=>{
 const g=createGame(7),m=g.runMetrics,p=g.player;g.entities=[p];p.apex=false;m.observe(g,2);assert.equal(m.byPhase.abundance.secondsByCount.absent,2);
 p.apex=true;m.observe(g,3);assert.equal(m.byPhase.abundance.titleGains,1);assert.equal(m.byPhase.abundance.longestSolo,3);
 g.era.phase={id:'war'};m.observe(g,4);assert.equal(m.byPhase.war.titleGains,0);assert.equal(m.byPhase.war.longestSolo,4);
 p.apex=false;p.defeatSerial=1;m.observe(g,1);assert.equal(m.byPhase.war.titleLosses,1);assert.equal(m.byPhase.war.playerDefeats,1);assert.equal(m.byPhase.war.seconds,5);
 const exported=m.export(g);exported.byPhase.war.secondsByCount.absent=99;assert.equal(m.byPhase.war.secondsByCount.absent,1);
 assert.equal(m.seconds,Object.values(m.byPhase).reduce((n,s)=>n+s.seconds,0));g.paused=true;g.update(1);assert.equal(m.seconds,10);
});
test('one-holder streak resets on holder or phase changes and disabled Era has separate totals',()=>{
 const g=createGame(7),p=g.player,a=g.entities.find(e=>e.behavior==='ai'),m=g.runMetrics;g.entities=[p,a];p.apex=true;a.apex=false;m.observe(g,3);p.apex=false;a.apex=true;m.observe(g,2);assert.equal(m.byPhase.abundance.longestSolo,3);
 p.apex=true;m.observe(g,4);assert.equal(m.byPhase.abundance.secondsByCount.coexist,4);assert.equal(m.byPhase.abundance.titleGains,3);assert.equal(m.byPhase.abundance.titleLosses,1);
 g.era.enabled=false;p.apex=a.apex=false;m.observe(g,5);assert.equal(m.byPhase.off.longestAbsent,5);assert.equal(m.byPhase.off.titleLosses,2);assert.equal(Object.keys(m.byPhase).length,2);
});
test('autoplay explores new space instead of repeating the same empty-world square',()=>{
 const g=createGame(23),p=g.player;g.entities=[p];g.balance.spawning.maxOrbCount=0;g.balance.spawning.maxEnemyCount=0;g.biomes.enabled=false;g.biomes.regions=[];g.relics.enabled=false;g.relics.items=[];g.autoplay.setEnabled(true);const start={x:p.x,y:p.y},cells=new Set();
 for(let frame=0;frame<120*60;frame++){g.update(1/60);if(frame%360===359)cells.add(`${Math.floor(p.x/500)},${Math.floor(p.y/500)}`);}
 assert(cells.size>=12,'six-second samples cover fresh map cells');assert(Math.hypot(p.x-start.x,p.y-start.y)>500,'does not return to the same starting square');assert(g.autoplay.explorationRecent.length<=4);assert.equal(g.lives,3);
});
test('autoplay destinations persist without extra RNG and respect oversized rectangular bounds',()=>{
 const g=createGame(7),p=g.player;g.balance.world.wrap=false;g.balance.world.worldWidth=500;g.balance.world.worldHeight=1000;p.size=600;p.x=250;p.y=500;g.autoplay.setEnabled(true);resetRandom(31);const expected=random('ai');resetRandom(31);const target=g.autoplay.explore();assert.equal(random('ai'),expected);assert.equal(target.x,250);assert(target.y>=300&&target.y<=700);assert.equal(g.autoplay.explore(),target);
 g.autoplay.dodgeWait=.8;g.autoplay.setEnabled(false);assert.equal(g.autoplay.explorationPoint,null);assert.equal(g.autoplay.explorationRecent.length,0);assert.equal(g.autoplay.dodgeWait,0);
});
