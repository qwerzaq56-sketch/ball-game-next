import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfile,loadPlayerProfile,savePlayerProfile,PROFILE_KEY} from '../js/playerProfile.js';
import {createGame} from '../tools/headless.mjs';
import {Player} from '../js/player.js';
const colors=[{id:'blue',color:'#00f'},{id:'red',color:'#f00'}];
test('profile normalizes blank names, unsupported colors, control characters and length',()=>{
  assert.deepEqual(normalizeProfile(null,colors),{name:'나',color:'blue'});
  assert.deepEqual(normalizeProfile({name:'  늑대\n\u202e  ',color:'red'},colors),{name:'늑대',color:'red'});
  assert.equal(normalizeProfile({name:'가'.repeat(30),color:'purple'},colors).name.length,16);
  assert.equal(normalizeProfile({name:'별🐺',color:'green'},colors).name,'별🐺');
});
test('all five player colors and chosen names survive full reset and Life respawn',()=>{
  const g=createGame(11);
  for(const color of g.balance.colors) {
    g.options.profile={name:'나의 포식자',color:color.id};g.reset();
    assert.equal(g.player.color,color.id);assert.equal(g.player.colorHex,color.color);assert.equal(g.player.displayName,'나의 포식자');
    g.handlePlayerDefeat('DEFEATED');assert.equal(g.player.displayName,'나의 포식자');assert.equal(g.player.color,color.id);
  }
});
test('player selection changes identity without altering initial size, score or growth',()=>{
  const g=createGame(1),p=new Player(g.balance,{name:'테스트',color:'yellow'});
  assert.equal(p.size,g.player.size);assert.equal(p.score,0);assert.equal(p.growth,g.player.growth);assert.equal(p.color,'yellow');
});
test('profile storage is optional, handles corruption and uses its own NEXT key',()=>{
  const old=globalThis.localStorage;
  try {
    const data=new Map([['ballgame_muted_v1','keep']]);globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
    savePlayerProfile({name:'저장된 이름',color:'red'});assert.deepEqual(loadPlayerProfile(colors),{name:'저장된 이름',color:'red'});assert.equal(data.get('ballgame_muted_v1'),'keep');
    data.set(PROFILE_KEY,'[');assert.equal(loadPlayerProfile(colors).name,'나');
    globalThis.localStorage={getItem(){throw Error()},setItem(){throw Error()}};assert.doesNotThrow(()=>savePlayerProfile({name:'나'}));assert.equal(loadPlayerProfile(colors).color,'blue');
  } finally {globalThis.localStorage=old;}
});
