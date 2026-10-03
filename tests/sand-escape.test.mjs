import test from 'node:test';
import assert from 'node:assert/strict';
import {sandEscape} from '../tools/sand-escape.mjs';
test('small prey retain danger while growth reduces sand damage',()=>{
 for(const size of [20,40,60]){const r=sandEscape({size});assert(r.escaped);assert(r.alive);assert(r.lostFraction>=(size<=40?.75:.68)&&r.lostFraction<=.85,JSON.stringify(r));assert.equal(r.radius,360);}
});
test('near-edge placement allows a faster escape instead of forced 80 percent damage',()=>{
 const r=sandEscape({offset:330});assert(r.escaped);assert(r.lostFraction<.3);
});
test('slower prey take more damage; fast prey have a meaningful escape advantage',()=>{
 const fast=sandEscape({speed:155}),slow=sandEscape({speed:105});assert(fast.lostFraction<slow.lostFraction);assert(slow.lostFraction<=1);
});
test('sand escape calibration holds across the supported 20–120Hz frame range',()=>{
 for(const fps of [20,30,60,120])for(const size of [20,40,60]){const r=sandEscape({fps,size});assert(r.escaped&&r.alive);assert(r.lostFraction>=(size<=40?.75:.68)&&r.lostFraction<=.85,JSON.stringify(r));}
});

test('large prey suffer less HP fraction than small prey in the same field',()=>{const small=sandEscape({size:40}),large=sandEscape({size:400});assert(large.escaped&&large.alive);assert(large.lostFraction>0&&large.lostFraction<small.lostFraction*.5);});
