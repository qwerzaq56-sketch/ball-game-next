import test from 'node:test';
import assert from 'node:assert/strict';
import {observationCSV} from '../js/observationCSV.js';
import {createGame} from '../tools/headless.mjs';
import {random,resetRandom} from '../js/random.js';
test('CSV keeps numeric/role fields, quotes commas and newlines and is read-only',()=>{
 const g=createGame(23);g.gameTime=1;g.player.score=7;g.runMetrics.observe(g,1);g.runMetrics.samples[0].region='숲, "가까움"\n안쪽';const before=JSON.stringify(g.snapshot()),samples=JSON.stringify(g.runMetrics.samples);resetRandom(17);const expected=random('ai');resetRandom(17);const csv=observationCSV(g);
 assert(csv.startsWith('\ufeffseed,policy,time,score,size,hp'));assert(csv.includes('23,local-survival-v2,1,7,20,100,100,'));assert(csv.includes('"숲, ""가까움""\n안쪽"'));assert.equal(csv.split('\r\n').length,3);assert.equal(JSON.stringify(g.snapshot()),before);assert.equal(JSON.stringify(g.runMetrics.samples),samples);assert.equal(random('ai'),expected);
});
test('empty sample CSV has a header and recent samples retain their 600-row limit',()=>{
 const g=createGame(7);assert.equal(observationCSV(g).split('\r\n').length,2);for(let i=0;i<601;i++){g.gameTime=i+1;g.runMetrics.observe(g,1);}const csv=observationCSV(g);assert.equal(csv.split('\r\n').length,602);assert(csv.split('\r\n')[1].startsWith('7,local-survival-v2,2,'));
});
