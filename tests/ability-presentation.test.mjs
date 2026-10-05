import test from 'node:test';
import assert from 'node:assert/strict';
import {drawAbilityPresentation} from '../js/abilityPresentation.js';
import {random,resetRandom} from '../js/random.js';
const fixture=units=>({game:{gameTime:20,biomes:{terrainArt:{enabled:true}}},units:()=>units,flashes:[],embers:[],fields:[],vortices:[],musters:[],rallies:[],waves:[]});
test('ability ornaments follow fired state, actual recipients and exact moving-front geometry',()=>{
 const inside={x:100,y:100,size:100,shieldHp:40,shieldRemaining:5,shieldTextureKind:'frost'},outside={x:500,y:100,size:100,shieldHp:0,shieldRemaining:0,shieldTextureKind:'frost'};
 const a=fixture([inside,outside]),calls=[],paths=[];
 a.flashes=[{x:100,y:100,color:'cyan',dir:Math.PI/2,remaining:.25,point:{x:100,y:100},skill:{effect:'chill',radius:240}}];
 a.waves=[{x:100,y:100,dir:Math.PI/2,time:.25,skill:{waveDuration:.5,length:440,width:160}}];
 const ctx={save(){},restore(){},translate(){},rotate(){},rect(...args){paths.push(args);}},shape=(...args)=>paths.push(args),paint=(c,id,p)=>{calls.push({id,...p});if(id==='blue-wave')p.clip(c);};
 const before=JSON.stringify({inside,outside,flashes:a.flashes,waves:a.waves});resetRandom(53);const expected=random('ai');resetRandom(53);
 drawAbilityPresentation(ctx,a,1,shape,paint);
 assert.equal(random('ai'),expected);assert.equal(JSON.stringify({inside,outside,flashes:a.flashes,waves:a.waves}),before);
 assert.equal(calls.filter(c=>c.id==='cyan-shield').length,1);assert.equal(calls.find(c=>c.id==='cyan-shield').x,100);
 const cone=calls.find(c=>c.id==='cyan-sweep');assert.equal(cone.width,240);cone.clip(ctx);assert.equal(paths.at(-1)[0],a.flashes[0]);
 const wave=calls.find(c=>c.id==='blue-wave');assert.equal(wave.width,20);assert.equal(wave.height,160);assert(Math.abs(wave.x-100)<1e-8);assert.equal(wave.y,310);assert.deepEqual(paths[0],[200,-80,20,160]);
 a.game.abilityRasterEnabled=false;calls.length=0;drawAbilityPresentation(ctx,a,1,shape,paint);assert.equal(calls.length,0);
});
test('non-damaging coordination texture stays at caster and never invents a hostile field',()=>{
 const a=fixture([]),calls=[];a.flashes=[{x:30,y:40,color:'green',size:100,remaining:.75,point:{x:400,y:400},skill:{effect:'invite',radius:500}}];
 drawAbilityPresentation({},a,1,()=>{},(c,id,p)=>calls.push({id,...p}));assert.equal(calls.length,1);assert.equal(calls[0].id,'green-call');assert.equal(calls[0].radius,74);assert.deepEqual([calls[0].x,calls[0].y],[30,40]);
});
