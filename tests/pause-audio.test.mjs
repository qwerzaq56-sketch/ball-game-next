import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
test('paused updates stop continuous audio exactly once without progressing the world',()=>{
 const g=createGame(1);let stopped=0;g.audio.stopAbsorbDrone=()=>stopped++;g._absorbDroneActive=true;g.paused=true;
 const before=g.snapshot();g.update(.05);g.update(.05);assert.equal(stopped,1);assert.equal(g._absorbDroneActive,false);assert.deepEqual(g.snapshot(),before);
});
test('absorption audio restarts once after resume and stale audio is cleared on reset',()=>{
 const g=createGame(1),target=g.entities.find(e=>e.behavior==='ai');target.beingAbsorbedByRef=g.player;
 let starts=0,updates=0,stops=0;g.audio.startAbsorbDrone=()=>starts++;g.audio.updateAbsorbDrone=()=>updates++;g.audio.stopAbsorbDrone=()=>stops++;
 g.updatePlayerAbsorbDrone();g.updatePlayerAbsorbDrone();assert.equal(starts,1);assert.equal(updates,2);
 g.paused=true;g.update(.05);assert.equal(stops,1);g.paused=false;g.updatePlayerAbsorbDrone();assert.equal(starts,2);
 g.reset();assert.equal(stops,2);assert.equal(g._absorbDroneActive,false);
});
