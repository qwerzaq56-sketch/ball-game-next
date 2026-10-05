import {drawAbilityRaster} from './abilityRasterArt.js?effects-direction-02';

// R-VIS-006: optional ornaments. Existing paths, timers and targets are authoritative.
export function drawAbilityPresentation(ctx,abilities,zoom,shape,paint=drawAbilityRaster){
 const game=abilities.game;
 if(game.abilityRasterEnabled===false||game.effectRasterEnabled===false||game.biomes?.terrainArt?.enabled===false)return;
 const now=game.gameTime;
 const circle=(id,x,y,radius,alpha)=>paint(ctx,id,{x,y,radius,alpha,clip:c=>c.arc(x,y,radius,0,Math.PI*2)});
 for(const flash of abilities.flashes){
  const cfg=flash.skill,fade=Math.min(1,flash.remaining/.25);if(!cfg||!(fade>0))continue;
  // Fired cones use the SAME path as the existing range fill/stroke. No windup benefit.
  if(cfg.effect==='chill'||cfg.effect==='frost-burst'||flash.color==='cyan'&&cfg.effect==='legacy'||cfg.effect==='ripple'){
   paint(ctx,flash.color==='blue'?'blue-wave':'cyan-sweep',{x:flash.x,y:flash.y,width:cfg.radius,height:cfg.radius*2,alpha:.22*fade,direction:flash.dir,clip:c=>shape(flash,flash.dir,flash.point)});
  }else if(['invite','summon'].includes(cfg.effect)||flash.color==='green'&&cfg.effect==='legacy'){
   // Coordination cue at caster, rather than a newly invented harmful area.
   circle('green-call',flash.x,flash.y,Math.min(cfg.radius,(flash.size??40)/2+24/zoom),.17*fade);
  }else if(cfg.effect==='vigor')circle('red-muster',flash.x,flash.y,(flash.size??40)/2+20/zoom,.15*fade);
 }
 for(const unit of abilities.units()){
  if((unit.shieldHp??0)>0&&(unit.shieldRemaining??0)>0&&unit.shieldTextureKind==='frost')circle('cyan-shield',unit.x,unit.y,unit.size/2+10/zoom,.22);
  if(unit.inviteBuffs?.some(b=>b.expires>now))circle('green-call',unit.x,unit.y,unit.size/2+12/zoom,.12);
  if((unit.dustUntil??0)>now)circle('yellow-dust',unit.x,unit.y,(unit.size/2+12/zoom)*(unit.dustVisualMultiplier??3),.17);
 }
 for(const f of abilities.embers)circle('red-embers',f.x,f.y,f.radius,.20);
 for(const f of abilities.fields)circle('yellow-dust',f.x,f.y,f.radius??360,.18);
 for(const f of abilities.vortices)circle('blue-vortex',f.owner.x,f.owner.y,f.skill.radius,.20);
 for(const r of abilities.musters)if(r.owner.alive)circle('red-muster',r.owner.x,r.owner.y,r.owner.size/2+20/zoom,.15);
 for(const rally of abilities.rallies)for(const ally of abilities.units())if(ally.rallyBuffs?.get(rally.owner.id)===rally)circle('red-muster',ally.x,ally.y,ally.size/2+10/zoom,.12);
 for(const wave of abilities.waves){
  const cfg=wave.skill??{},width=cfg.width??180;
  // The existing visible front is exactly this 20-world-unit strip, not the whole lane.
  const front=Math.max(0,wave.time/(cfg.waveDuration??.5)*(cfg.length??400)-20),dir=wave.dir;
  const x=wave.x+Math.cos(dir)*(front+10),y=wave.y+Math.sin(dir)*(front+10);
  paint(ctx,'blue-wave',{x,y,width:20,height:width,alpha:.30,direction:dir,clip:c=>{c.save();c.translate(wave.x,wave.y);c.rotate(dir);c.rect(front,-width/2,20,width);c.restore();}});
 }
}
