import test from 'node:test';
import assert from 'node:assert/strict';
import {drawRevisedLandmark} from '../js/landmarkArt.js';
import {random,resetRandom} from '../js/random.js';

const capture=()=>{
 const commands=[];
 return {commands,ctx:new Proxy({}, {get:(_,key)=>(...args)=>commands.push([key,...args]),set:(_,key,value)=>{commands.push(['set',key,value]);return true;}})};
};
test('approved landmarks preserve gameplay and healthy shelter/oasis across cooldown',()=>{
 for(const candidate of ['forest-tree','snow-flowers','snow-shelter','desert-oasis']){
  const object={candidate,x:1,y:2,config:{power:.08,cooldown:12}},before=JSON.stringify(object),a=capture(),b=capture();
  resetRandom(92);const expected=random('ai');resetRandom(92);
  assert.equal(drawRevisedLandmark(a.ctx,object,true),true);assert.equal(drawRevisedLandmark(b.ctx,object,false),true);
  assert.equal(random('ai'),expected);assert.equal(JSON.stringify(object),before);
  if(['snow-shelter','desert-oasis'].includes(candidate))assert.deepEqual(a.commands,b.commands);
  else assert.notDeepEqual(a.commands,b.commands,'only transfer leaves or petals show readiness');
 }
 const unknown=capture();assert.equal(drawRevisedLandmark(unknown.ctx,{candidate:'lake-garland'}),false);assert.deepEqual(unknown.commands,[]);
});
