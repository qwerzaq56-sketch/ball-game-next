import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
test('large queries preserve numeric x/y cell order and insertion order within cells',()=>{
 const g=createGame(1),make=(id,x,y)=>({id,x,y,alive:true});g.balance.world.wrap=false;
 const a=make(1,440,0),b=make(2,-221,440),c=make(3,-440,-10),d=make(4,0,441);g.entities=[a,b,c,d];g.buildGrid();
 assert.deepEqual(g.getNearbyEntities({x:0,y:0},2200).map(e=>e.id),[3,2,4,1]);
 assert.deepEqual(g.getNearbyEntities(c,2200).map(e=>e.id),[2,4,1]);
 a.x=-440;a.y=-10;g.buildGrid();assert.deepEqual(g.getNearbyEntities({x:0,y:0},2200).map(e=>e.id),[1,3,2,4]);
 g.reset();assert.deepEqual(g.getNearbyEntities(g.player,2200),[]);
});
test('huge finite query radii visit occupied cells without an impractical coordinate loop',()=>{
 const g=createGame(1);g.buildGrid();const expected=g.entities.filter(e=>e.alive&&e!==g.player).length;
 assert.equal(g.getNearbyEntities(g.player,1e100).length,expected);
});
test('giant ally connections use color-specific candidates and preserve edge hysteresis',()=>{
 const g=createGame(1),a={id:1,x:1000,y:1000,size:4000,color:'blue',alive:true,behavior:'ai'},b={...a,id:2,x:3150,size:100},c={...a,id:3,x:1050,size:100,color:'red'};
 g.entities=[a,b,c];g.allyLinks.refresh();assert.equal(g.allyLinks.edges.size,1);assert.equal(g.allyLinks.neighbors(c).length,0);
 b.x=3180;g.allyLinks.refresh();assert.equal(g.allyLinks.edges.size,1);b.x=3191;g.allyLinks.refresh();assert.equal(g.allyLinks.edges.size,0);
});
