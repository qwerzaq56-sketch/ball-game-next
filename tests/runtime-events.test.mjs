import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';

test('normal sessions bound raw events while lifetime special totals and apex history survive',()=>{
 const g=createGame(23);g.options.collect=false;g.reset();const initialEvents=g.ecology.events.length;assert.equal(initialEvents,0);
 for(let i=0;i<1000;i++){
  g.gameTime=i;g.abilities.log('special-fire',g.player,{cast:i});
  g.abilities.log('command-end',g.player,{reason:'expiry'});
  g.player.apex=true;g.apexHistory.observe([g.player],1,i);
  g.ecology.release(g.player,i,'death');g.apexHistory.observe([],0,i);
 }
 assert.equal(g.abilities.events.length,256);assert.equal(g.ecology.events.length,256);
 assert.equal(g.abilities.events.at(-1).time,999);assert.equal(g.ecology.events[0].time,744);
 assert.equal(g.snapshot().special.casts,1000);assert.equal(g.apexHistory.gains,1000);assert.equal(g.apexHistory.losses,1000);
 assert.equal(g.apexHistory.recent.length,24);assert.equal(g.apexHistory.completed.length,12);
 g.reset();assert.equal(g.abilities.specialFires,0);assert.equal(g.abilities.events.length,0);assert.equal(g.ecology.events.length,initialEvents);
});
test('explicit collection keeps complete raw traces for seeded analysis',()=>{
 const g=createGame(11);const initialEvents=g.ecology.events.length;assert.equal(initialEvents,0);
 for(let i=0;i<1000;i++){g.gameTime=i;g.abilities.log('special-fire',g.player);g.player.apex=true;g.ecology.release(g.player,i,'test');}
 assert.equal(g.abilities.events.length,1000);assert.equal(g.ecology.events.length,1000+initialEvents);assert.equal(g.snapshot().special.casts,1000);
 assert.equal(g.abilities.events[0].time,0);assert.equal(g.ecology.events[0].time,0);
});
