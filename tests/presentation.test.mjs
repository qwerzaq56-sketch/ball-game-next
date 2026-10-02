import test from 'node:test';
import assert from 'node:assert/strict';
import {assignDisplayName,scoreRanking,layoutNameLabels,overlaps,durationLabel,sizeRanking} from '../js/presentation.js';
import {ApexHistory} from '../js/apexHistory.js';
import {resetRandom,random} from '../js/random.js';
import {createGame} from '../tools/headless.mjs';
import {loadPresentationPreferences,savePresentationPreferences} from '../js/storage.js';

const unit=(id,extra={})=>({id,alive:true,behavior:'ai',score:0,displayName:`AI ${id}`,colorHex:'#fff',apex:true,...extra});
test('names are seeded, assigned once and independent of gameplay and particle streams',()=>{
  const names=()=>[1,2,3].map(id=>{const e=unit(id,{displayName:undefined});assignDisplayName(e);return e.displayName});
  resetRandom(12);const expected=names();const nextAI=random('ai'),nextWorld=random('world'),nextVisual=random('visual');
  resetRandom(12);assert.equal(random('ai'),nextAI);assert.equal(random('world'),nextWorld);assert.equal(random('visual'),nextVisual);
  resetRandom(12);for(let i=0;i<100;i++)random('visual');assert.deepEqual(names(),expected);
  const e=unit(9);assignDisplayName(e);assert.equal(e.displayName,'AI 9');
  const player=unit(1,{behavior:'player',displayName:undefined});assignDisplayName(player);assert.equal(player.displayName,'나');
  const orb=unit(2,{behavior:'orb',displayName:undefined});assignDisplayName(orb);assert.equal(orb.displayName,undefined);
});
test('birth and full reset recreate names while ranking and layout consume no gameplay RNG',()=>{
  const g=createGame(23);const names=g.entities.filter(e=>e.behavior==='ai').map(e=>e.displayName);
  assert.equal(new Set(names).size,names.length);g.reset();assert.deepEqual(g.entities.filter(e=>e.behavior==='ai').map(e=>e.displayName),names);
  resetRandom(9);const expected=random('ai');resetRandom(9);
  for(let i=0;i<10;i++){scoreRanking(g.entities,g.ecology.scoreOrder);layoutNameLabels([],100,100);}
  assert.equal(random('ai'),expected);
});
test('ranking excludes dead/orb entities, uses raw scores and keeps committed tie order',()=>{
  const all=[unit(1,{score:4.1}),unit(2,{score:4.2}),unit(3,{score:4.1}),unit(4,{score:99,alive:false}),unit(5,{score:99,behavior:'orb'})];
  assert.deepEqual(scoreRanking(all,[3,1,2]).map(e=>e.id),[2,3,1]);
  assert.deepEqual(all.map(e=>e.id),[1,2,3,4,5]);
});
test('name labels stay inside screen and avoid reserved panels and each other',()=>{
  const reserved=[{left:0,top:0,right:100,bottom:100}];
  const candidates=[{id:1,x:200,y:100,textWidth:70},{id:2,x:200,y:100,textWidth:70},{id:3,x:200,y:100,textWidth:70},{id:4,x:200,y:100,textWidth:70},{id:5,x:50,y:50,textWidth:30},{id:6,x:-10,y:100,textWidth:60}];
  const labels=layoutNameLabels(candidates,400,300,reserved);assert.equal(labels.length,3);
  for(const a of labels){assert(!overlaps(a.box,reserved[0]));for(const b of labels)if(a!==b)assert(!overlaps(a.box,b.box));}
});
test('apex history distinguishes reacquisition, solo reign and coexisting holders',()=>{
  const h=new ApexHistory(),a=unit(1),b=unit(2);
  h.observe([],2,2);h.observe([a],0,2);h.observe([a],5,7);h.observe([a,b],0,7);h.observe([a,b],3,10);h.observe([b],0,10);h.observe([b],4,14);h.observe([],0,14);h.observe([a],0,14);h.observe([a],2,16);
  const s=h.summary(16);assert.equal(s.gains,3);assert.equal(s.losses,2);assert.equal(s.longestTenure,8);assert.equal(s.longestSolo,5);
  assert.deepEqual(s.secondsByCount,{absent:2,solo:11,coexist:3});assert.equal(s.current[0].seconds,2);
  assert.equal(s.completed[0].name,'AI 2');assert.equal(s.completed[0].seconds,7);
});
test('runtime history lists are bounded, preserve totals and cannot resurrect dead holders',()=>{
  const h=new ApexHistory();for(let i=0;i<40;i++){h.observe([unit(i)],0,i*2);h.observe([],0,i*2+1);}
  h.observe([unit(99,{alive:false}),unit(100,{behavior:'orb'})],1,81);
  const s=h.summary(81);assert.equal(s.gains,40);assert.equal(s.losses,40);assert.equal(s.recent.length,24);assert.equal(s.completed.length,12);assert.equal(s.current.length,0);
  assert.deepEqual(new ApexHistory().summary(0).secondsByCount,{absent:0,solo:0,coexist:0});
});
test('presentation preferences tolerate unavailable and malformed storage, preserve legacy keys',()=>{
  const old=globalThis.localStorage;
  try {
    globalThis.localStorage={getItem(){throw Error()},setItem(){throw Error()}};
    assert.deepEqual(loadPresentationPreferences(),{names:true,ranking:true,ecology:false,allyLinks:true,rankingMode:'score'});assert.doesNotThrow(()=>savePresentationPreferences({names:false}));
    const data=new Map([['ballgame_scoreboard_v1','keep'],['ballgamenext_presentation_v1','{"names":false,"ranking":"no","ecology":true}']]);
    globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
    assert.deepEqual(loadPresentationPreferences(),{names:false,ranking:true,ecology:true,allyLinks:true,rankingMode:'score'});
    savePresentationPreferences({names:true,ranking:false,ecology:false});assert.equal(data.get('ballgame_scoreboard_v1'),'keep');
    data.set('ballgamenext_presentation_v1','[');assert.equal(loadPresentationPreferences().ranking,true);
  } finally {globalThis.localStorage=old;}
});
test('human durations have consistent minute boundaries',()=>{
  assert.equal(durationLabel(-1),'0초');assert.equal(durationLabel(59.9),'59초');assert.equal(durationLabel(60),'1분 0초');assert.equal(durationLabel(142),'2분 22초');
});

test('size ranking is independent of score and preserves committed size ties',()=>{
  const all=[unit(1,{size:80,score:900}),unit(2,{size:140,score:10}),unit(3,{size:140,score:0}),unit(4,{size:200,alive:false})];
  assert.deepEqual(sizeRanking(all,[3,2,1]).map(e=>e.id),[3,2,1]);
  assert.deepEqual(scoreRanking(all).map(e=>e.id),[1,2,3]);
});

import {debugRoleLabel} from '../js/presentation.js';
test('debug roles show predator relationships only while the role is predator',()=>{
  assert.equal(debugRoleLabel({role:'prey',relationship:'challenger'}),'프레이');
  assert.equal(debugRoleLabel({role:'forager',relationship:'subordinate'}),'포레이저');
  for(const [relationship,label] of [['subordinate','종속'],['challenger','도전'],['independent','독립']])assert.equal(debugRoleLabel({role:'predator',relationship}),`프레데터 · ${label}`);
  assert.equal(debugRoleLabel({role:'predator',apex:true}),'★ 프레데터');
});
test('debug drawing includes player role and AI role/state as separate lines without changing gameplay',()=>{
  const g=createGame(5),a=g.entities.find(e=>e.behavior==='ai');a.role='predator';a.relationship='challenger';
  const texts=[],ctx=new Proxy({fillText:text=>texts.push(text)},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const before=g.snapshot();resetRandom(7);const expected=random('ai');resetRandom(7);
  g.drawAILabels(ctx,[g.player,a]);assert(texts.includes('프레데터 · 도전'));assert(texts.some(t=>t.includes(' · ')&&!t.includes('프레데터')));
  assert(texts.some(t=>t===debugRoleLabel(g.player)));assert.deepEqual(g.snapshot(),before);assert.equal(random('ai'),expected);
});
