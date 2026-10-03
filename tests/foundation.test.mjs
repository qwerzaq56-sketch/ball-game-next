import test from 'node:test';
import assert from 'node:assert/strict';
import {run,createGame} from '../tools/headless.mjs';
import {random,resetRandom} from '../js/random.js';
import {saveMuted,submitScore,resetScoreboard} from '../js/storage.js';
test('same real Game update reproduces core checkpoints',()=>assert.deepEqual(run(42,10),run(42,10)));
test('presentation random consumption leaves gameplay stream intact',()=>{
 resetRandom(9); const expected=random('world'); resetRandom(9); for(let i=0;i<100;i++)random('visual'); assert.equal(random('world'),expected);
});
test('oversized viewport stays centered and coordinate mapping roundtrips',()=>{
 const g=createGame(1);g.canvas.width=20000;g.canvas.height=18000;g.updateCamera(1);
 assert.equal(g.camera.x,g.balance.world.worldWidth/2);assert.equal(g.camera.y,g.balance.world.worldHeight/2);
 const s=g.worldToScreen(123,456);const w=g.screenToWorld(s.x,s.y);assert.ok(Math.abs(w.x-123)<1e-8&&Math.abs(w.y-456)<1e-8);
});
test('new storage never writes or deletes legacy records',()=>{
 const data=new Map([['ballgame_scoreboard_v1','KEEP'],['ballgame_muted_v1','1']]);
 globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 submitScore(9);saveMuted(false);resetScoreboard();assert.equal(data.get('ballgame_scoreboard_v1'),'KEEP');assert.equal(data.get('ballgame_muted_v1'),'1');
});
