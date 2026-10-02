import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
test('analog touch input scales movement; keyboard diagonals and mixed input never exceed base speed',()=>{
 const g=createGame(7),p=g.player;g.entities=[p];g.input.touchMove={x:.5,y:0};
 const x=p.x,y=p.y;g.updatePlayer(.1);assert(Math.abs(p.x-x-p.moveSpeed*.05)<1e-8);assert.equal(p.y,y);
 g.input.touchMove={x:0,y:0};g.input.keys=new Set(['d','s']);const start={x:p.x,y:p.y};g.updatePlayer(.1);assert(Math.abs(Math.hypot(p.x-start.x,p.y-start.y)-p.moveSpeed*.1)<1e-8);
 g.input.touchMove={x:1,y:0};const before={x:p.x,y:p.y};g.updatePlayer(.1);assert(Math.abs(Math.hypot(p.x-before.x,p.y-before.y)-p.moveSpeed*.1)<1e-8);
});
