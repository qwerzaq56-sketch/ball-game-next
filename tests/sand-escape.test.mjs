import test from 'node:test';
import assert from 'node:assert/strict';
import {sandEscape} from '../tools/sand-escape.mjs';
test('nominal prey of three sizes lose about 80 percent while escaping from sand centre',()=>{
 for(const size of [20,40,60]){const r=sandEscape({size});assert(r.escaped);assert(r.alive);assert(r.lostFraction>=.75&&r.lostFraction<=.85,JSON.stringify(r));assert.equal(r.radius,360);}
});
test('near-edge placement allows a faster escape instead of forced 80 percent damage',()=>{
 const r=sandEscape({offset:330});assert(r.escaped);assert(r.lostFraction<.3);
});
test('slower prey take more damage; fast prey have a meaningful escape advantage',()=>{
 const fast=sandEscape({speed:155}),slow=sandEscape({speed:105});assert(fast.lostFraction<slow.lostFraction);assert(slow.lostFraction<=1);
});
