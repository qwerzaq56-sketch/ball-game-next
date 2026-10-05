import test from 'node:test';
import assert from 'node:assert/strict';
import {drawLavaSurface} from '../js/biomes.js';
import {random,resetRandom} from '../js/random.js';
test('lava rendering keeps the original corridor width and state without road dashes or RNG consumption',()=>{
 const points=[{x:100,y:80,hotRadius:62},{x:180,y:110,hotRadius:62},{x:260,y:120,hotRadius:62},{x:600,y:200,hotRadius:62}],before=JSON.stringify(points),commands=[];
 const ctx=new Proxy({}, {get:(_,key)=>(...args)=>commands.push([key,...args]),set:(_,key,value)=>{commands.push(['set',key,value]);return true;}});
 resetRandom(93);const expected=random('biomes');resetRandom(93);drawLavaSurface(ctx,points,12);
 assert.equal(random('biomes'),expected);assert.equal(JSON.stringify(points),before);
 assert.equal(commands.some(([kind,key,value])=>kind==='set'&&key==='lineWidth'&&value===124),true);
 assert.equal(commands.some(([kind,...args])=>kind==='setLineDash'&&args[0].length>0),false);
 assert.equal(commands.some(([kind,key])=>kind==='set'&&key==='lineDashOffset'),false);
 assert.equal(commands.some(([kind,x,y,r])=>kind==='arc'&&x===600&&y===200&&r===62),true,'isolated hazard keeps its 62 radius bank');
 assert.equal(commands.filter(([kind])=>kind==='fill').length>=4,true,'irregular planes replace center stripes');
});
