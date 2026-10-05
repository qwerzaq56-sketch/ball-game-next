import test from 'node:test';
import assert from 'node:assert/strict';
import {random,resetRandom} from '../js/random.js';
import {restrainEffectAlpha} from '../js/effectRasterArt.js';
test('display alpha curve suppresses broad bloom without editing source or RGB',()=>{
 const source=new Uint8ClampedArray([30,100,200,0,30,100,200,64,30,100,200,128,30,100,200,255]),before=[...source],result=restrainEffectAlpha(source);
 assert.deepEqual([...source],before);assert.equal(result[3],0);assert.equal(result[15],255);
 assert.ok(result[7]<source[7]);assert.ok(result[11]<source[11]);
 for(let i=0;i<source.length;i++)if(i%4!==3)assert.equal(result[i],source[i]);
});
const recorder=()=>{const commands=[];return {commands,ctx:new Proxy({globalAlpha:1},{get:(t,k)=>k in t?t[k]:(...args)=>commands.push([k,...args]),set:(t,k,v)=>{t[k]=v;commands.push(['set',k,v]);return true;}})};};
test('optional effect images fail independently and preserve vector fallback, entity state and RNG',async()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;
 try{
  globalThis.Image=class{naturalWidth=1024;naturalHeight=1024;async decode(){if(this.src.includes('impact-001'))throw Error('missing texture');}};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}})})};
  const art=await import('../js/effectRasterArt.js?partial-failure');assert.equal(await art.loadEffectRaster(),false);
  assert.equal(art.effectRasterStatus().loaded.length,6);assert.deepEqual(art.effectRasterStatus().failed,['impact']);
  assert.deepEqual(art.effectRasterStatus().requested,[],'settled loads are not reported as pending');
  const absent=recorder();assert.equal(art.drawEffectRaster(absent.ctx,'impact',{x:0,y:0,radius:20}),false);assert.deepEqual(absent.commands,[]);
  const e={alive:true,behavior:'ai',x:100,y:120,attackUnlocked:true,attackHoldProgress:.8,shieldHp:10,shieldRemaining:3,vigorUntil:8,dodgeState:'DODGING',dodgeDir:Math.PI/3,hitVisualUntil:5.1},game={gameTime:5,abilities:{rallyPower:()=>0}},before=JSON.stringify(e);
  resetRandom(87);const expected=random('ai');resetRandom(87);const drawn=recorder();
  assert.deepEqual(art.drawEntityEffectRaster(drawn.ctx,e,game,20,1),['charge','dodge','shield','strength']);assert.equal(JSON.stringify(e),before);assert.equal(random('ai'),expected);
  assert.equal(drawn.commands.filter(([k])=>k==='rotate').length,1,'only unlit directional dodge rotates');
  assert.equal(drawn.commands.some(([k,...args])=>k==='rotate'&&args[0]===Math.PI/3),true);
  const noActualBenefits=recorder(),idle={alive:true,behavior:'ai',x:0,y:0,attackUnlocked:false};assert.deepEqual(art.drawEntityEffectRaster(noActualBenefits.ctx,idle,game,20),[]);assert.deepEqual(noActualBenefits.commands,[]);
  const confirmed=recorder();assert.deepEqual(art.drawEntityEffectRaster(confirmed.ctx,idle,game,20,1,{healing:true,frostCured:true}),['heal','frost-clear']);
  const expired=recorder();assert.deepEqual(art.drawEntityEffectRaster(expired.ctx,{...idle,shieldHp:10,shieldRemaining:0,obsidianShieldHp:10,obsidianShieldUntil:4,vigorUntil:4},game,20),[]);assert.deepEqual(expired.commands,[],'expired buffs never imply a current recipient');
  const invalid=recorder();assert.equal(art.drawEffectRaster(invalid.ctx,'shield',{x:0,y:0,radius:0}),false);assert.deepEqual(invalid.commands,[]);
  const orb=recorder();assert.deepEqual(art.drawEntityEffectRaster(orb.ctx,{...e,behavior:'orb'},game,20),[]);assert.deepEqual(orb.commands,[]);
 }finally{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
