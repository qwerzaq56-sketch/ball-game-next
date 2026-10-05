import {drawActionArt} from './actionArt.js';
import {chargedAttackDistance} from './combat.js';
import {BiomeObjects} from './biomeObjects.js?art-boundary-02';
import {updateGrowthMotion} from './growthMotion.js';
import {updateSprint} from './sprint.js';
import {delta,angleTo,near,wrap} from './topology.js';
import {worldView,boxInView,segmentInView} from './renderVisibility.js';
import { clampEntity } from './worldBounds.js';
import { Autoplay } from './autoplay.js';
import { RunMetrics } from './runMetrics.js';
import { drawSpeciesMark,drawGrowthPulse,drawPlayerDirection,drawMatteBody } from './vectorArt.js';
import { Relics } from './relics.js';
import { Era } from './era.js';
import { Biomes } from './biomes.js?art-boundary-02';
import { AllyLinks } from './allyLinks.js';
import { ApexHistory } from './apexHistory.js';
import { scoreRanking, layoutNameLabels, debugRoleLabel, entityLabelRows } from './presentation.js';
import { Abilities } from './abilities.js';
import { acceptsAbsorption } from './species.js';
import { Ecology } from './ecology.js';
import { random, resetRandom } from './random.js';
import { resetEntityIds, growthRewardFor } from './entity.js';
import { Player } from './player.js';
import { AIEntity, updateAI } from './ai.js';
import { canEatOrb, canAbsorb, isHostile, circlesOverlap, dist } from './collision.js';
import {
  updateAttack, updateDodge, updateKnockback, updateHealthRegen,
  updateAttackStack, updateDodgeStack, attackChargeDistanceForSize,
  canStartAttack, startAttack, canStartDodge, startDodge,
} from './combat.js';
import { spawnOrb, spawnAI, spawnDeathOrbs } from './spawning.js';
import {apexTerritoryRadius} from './skillCatalog.js';
import { startAbsorption, cancelAbsorption, updateAbsorptions, maintainDistanceFor } from './absorption.js';
import { AudioManager } from './audio.js';

const AI_STATE_LABEL = { search: '탐색', chase_eat: '먹이추격', chase_fight: '전투', flee: '도주', relationship: '관계추종', companion:'대열 동행',war_move:'전선 이동', recover: '회복' };
const AI_PERSONALITY_LABEL = { growth: '성장형', cautious: '회피형', opportunist: '기회형' };

const CELL_SIZE = 220;

export class Game {
  constructor(balance, canvas, input, ui, options = {}) {
    this.options = options;
    this.seed = options.seed ?? Date.now();
    this.balance = balance;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.ui = ui;

    this.audio = new AudioManager(balance);
    this.onGameOver = null; // set by main.js — persists across reset()
    this._absorbDroneActive = false;

    this.reset();
  }

  // v0.6 spec §14: "전체 초기화" rebuilds every piece of runtime state exactly as a fresh page
  // load would, WITHOUT touching audio/canvas/input wiring (session-level, not run-level) or the
  // Top 10 scoreboard (which lives entirely in storage.js/localStorage and is a deliberately
  // separate action — see spec §14/§17). Also doubles as the constructor's own init path so
  // there's only one place that defines "what a fresh run looks like".
  reset() {
    resetRandom(this.seed);
    resetEntityIds();
    this.gameTime = 0;
    this.touchAim=null;
    this.showAILabels = false; // head-up state + personality labels over AI (debug aid, F3)
    this.ecology = new Ecology(this.options.collect);
    this.apexHistory = new ApexHistory();
    this.abilities = new Abilities(this);
    this.allyLinks = new AllyLinks(this);
    this.biomes = new Biomes(this);this.biomeObjects=new BiomeObjects(this);
    this.era = new Era(this);
    this.relics = new Relics(this);
    this.autoplay = new Autoplay(this);
    this.runMetrics = new RunMetrics();
    this.telemetry = [];
    this.player = new Player(this.balance, this.options.profile);
    this.player.onSkillUnlock = (type) => {
      this.ui.showUnlock(type);
      this.audio.unlock();
    };
    this.entities = [this.player];
    this.particles = [];this.playerHitUntil=0;
    this.floatingTexts = [];
    this.grid = new Map();
    this.gridOrder = null;
    this.orbSpawnTimer = 0;
    this.enemySpawnTimer = 0;
    this.paused = false;
    this.gameOver = false;
    this.lives = this.balance.lives.maxLives;
    this.player.score = 0;
    this.stopContinuousAudio();

    this.camera = {
      x: this.player.x,
      y: this.player.y,
      zoom: this.balance.camera.baseZoom,
    };

    this.initWorld();
    this.relics.spawn();
    this.ecology.update(this, 0);
    this.apexHistory.observe(this.entities, 0, this.gameTime);
  }

  initWorld() {
    const b = this.balance;

    for (let i = 0; i < b.spawning.initialOrbCount; i++) this.entities.push(spawnOrb(b));

    const perColor = Math.max(1, Math.floor(b.spawning.initialEnemyCount / b.colors.length));
    for (const c of b.colors) {
      for (let i = 0; i < perColor; i++) {
        this.entities.push(this.createSafeEnemy(c));
      }
    }
  }

  // Finds a random world position at least `safeRadius` away from the player, retrying a few
  // times; falls back to a fully random spot if it can't find one (keeps AI from spawning right
  // on top of the player — used both at world init and by the ongoing enemy spawn loop).
  pickSafeSpawnPos(safeRadius) {
    const b = this.balance;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = {
        x: random('world') * b.world.worldWidth,
        y: random('world') * b.world.worldHeight,
      };
      if (dist(this.player,candidate) >= safeRadius) return candidate;
    }
    return null;
  }

  createSafeEnemy(colorDef) {
    const world=this.balance.world,p=this.player;
    const newborn=spawnAI(this.balance,colorDef,this.pickSafeSpawnPos(350),p.size);
    clampEntity(newborn,world);
    const required=Math.max(350,(p.size+newborn.size)/2+80);
    if(dist(newborn,p)>=required)return newborn;
    // The legacy center-only gap is insufficient once either body grows. Retry only
    // unsafe births, then use the furthest legal corner if this map cannot fit the gap.
    let best={x:newborn.x,y:newborn.y,size:newborn.size};
    for(let i=0;i<10;i++){
      const point=clampEntity({x:random('world')*world.worldWidth,y:random('world')*world.worldHeight,size:newborn.size},world);
      if(dist(point,p)>dist(best,p))best=point;
      if(dist(point,p)>=required){newborn.x=point.x;newborn.y=point.y;return newborn;}
    }
    const far=world.wrap?{x:wrap(p.x+world.worldWidth/2,world.worldWidth),y:wrap(p.y+world.worldHeight/2,world.worldHeight)}:null;
    if(far&&dist(far,p)>dist(best,p))best=far;
    for(const x of [0,world.worldWidth])for(const y of [0,world.worldHeight]){
      const point=clampEntity({x,y,size:newborn.size},world);
      if(dist(point,p)>dist(best,p))best=point;
    }
    newborn.x=best.x;newborn.y=best.y;return newborn;
  }

  // ---------- spatial grid ----------

  buildGrid() {
    // R-META-005: compute the shared maximum once per spatial rebuild.
    this.maxUnitRadius=0;
    this.grid.clear();
    this.gridOrder=null;
    for (const e of this.entities) {
      if (!e.alive) continue;
      if(e.behavior!=='orb')this.maxUnitRadius=Math.max(this.maxUnitRadius,e.size/2);
      const cx = Math.floor(e.x / CELL_SIZE);
      const cy = Math.floor(e.y / CELL_SIZE);
      const key = cx + ',' + cy;
      let arr = this.grid.get(key);
      if (!arr) {
        arr = [];
        this.grid.set(key, arr);
      }
      arr.push(e);
    }
  }

  getNearbyEntities(entity, range) {
    const result = [];
    const w=this.balance.world;
    if(w.wrap&&(entity.x-range<0||entity.y-range<0||entity.x+range>w.worldWidth||entity.y+range>w.worldHeight))return this.entities.filter(e=>{
      if(!e.alive||e===entity)return false;const d=delta(entity,e,w);return Math.abs(d.x)<=range+CELL_SIZE&&Math.abs(d.y)<=range+CELL_SIZE;
    });
    const minCx = Math.floor((entity.x - range) / CELL_SIZE);
    const maxCx = Math.floor((entity.x + range) / CELL_SIZE);
    const minCy = Math.floor((entity.y - range) / CELL_SIZE);
    const maxCy = Math.floor((entity.y + range) / CELL_SIZE);
    // Large actors can cover thousands of empty cells. Keep the legacy x/y cell order
    // while visiting occupied cells only, so target selection and RNG paths stay identical.
    if((maxCx-minCx+1)*(maxCy-minCy+1)>64){
      if(!this.gridOrder)this.gridOrder=[...this.grid].map(([key,arr])=>{const [x,y]=key.split(',').map(Number);return {x,y,arr};}).sort((a,b)=>a.x-b.x||a.y-b.y);
      for(const cell of this.gridOrder)if(cell.x>=minCx&&cell.x<=maxCx&&cell.y>=minCy&&cell.y<=maxCy)for(const e of cell.arr)if(e!==entity)result.push(e);
      return result;
    }
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const arr = this.grid.get(cx + ',' + cy);
        if (!arr) continue;
        for (const e of arr) if (e !== entity) result.push(e);
      }
    }
    return result;
  }

  hostileTargetsFor(entity) {
    // R-META-005: READY/TELEGRAPH/RECOVERY never perform a contact hit scan.
    if(entity.attackState!=='CHARGING')return [];
    // v0.5: charge distance now scales with attack range (see combat.js), so the candidate
    // scan radius has to cover that instead of the old fixed chargeSpeed*duration distance.
    const largest=this.maxUnitRadius??this.entities.reduce((n,e)=>e.alive&&e.behavior!=='orb'?Math.max(n,e.size/2):n,0);
    const range = attackChargeDistanceForSize(entity.size, this.balance,entity.apex) + entity.size/2 + largest;
    return this.getNearbyEntities(entity, range).filter((o) => isHostile(entity, o));
  }

  updateAIEntity(e,dt,b){updateAI(e,dt,this,b);}

  // ---------- update ----------

  update(dt) {
    if (this.paused) {this.stopContinuousAudio();return;}
    const b = this.balance;
    this.gameTime += dt;
    this.era.update(dt);
    this.biomes.update(dt);
    this.relics.update(dt);

    this.buildGrid();
    this.biomeObjects.update(dt);
    this.allyLinks.update(dt);
    this.abilities.update(dt);
    for(const e of this.entities)if(e.alive&&e.behavior==='ai'&&e.apex&&(!this.options.simulationRoom||e.roomBehavior==='ai'))this.abilities.considerAI(e);
    this.autoplay.update(dt);
    this.updatePlayer(dt);

    for (const e of this.entities) {
      if (e.behavior === 'ai' && e.alive) this.updateAIEntity(e,dt,b);
    }

    for (const e of this.entities) {
      if (!e.alive || (e.behavior !== 'player' && e.behavior !== 'ai')) continue;
      updateGrowthMotion(e,dt);
      updateKnockback(e, dt);
      const regenerating = updateHealthRegen(e, dt, b,this.relics.regenMultiplier(e));
      if (regenerating && random('visual') < 0.15) this.spawnRegenParticle(e.x, e.y, e.size);
      if (e.scalePulseTimer > 0) e.scalePulseTimer = Math.max(0, e.scalePulseTimer - dt);
      // v0.6 spec §3: AI regenerates attack stacks on its own (slower) cooldown, separate from
      // the player's — see combat.js#updateAttackStack and gameBalance.json's `ai.attackCooldown`.
      const attackCooldown = e.behavior === 'ai' ? b.ai.attackCooldown : b.attack.attackCooldown;
      updateAttackStack(e, dt, attackCooldown);
      updateDodgeStack(e, dt, b);
    }

    this.allyLinks.refresh();
    this.buildGrid();
    this.resolveConsumption();
    updateAbsorptions(this, dt, b);
    this.resolvePushApart(dt);
    this.clampAllToWorld();
    this.updateCamera(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updatePlayerAbsorbDrone();
    this.orbSpawnLoop(dt);
    this.enemySpawnLoop(dt);
    this.cleanupDead();
    this.ecology.update(this, dt);
    this.allyLinks.refresh();
    this.era.observeDuels();
    this.abilities.metrics.reconcile();
    this.runMetrics.observe(this,dt);
    this.apexHistory.observe(this.entities, dt, this.gameTime);
    for(const e of this.entities)if(!e.apex&&e._specialApex){this.abilities.loseApex(e);}
    if (this.options.collect && Math.floor(this.gameTime + 1e-8) > this.telemetry.length) this.telemetry.push(this.snapshot());
  }

  get score() { return this.player.score; }
  set score(value) { this.player.score = value; }
  awardScore(entity, amount) { entity.score += Math.round(amount); }

  snapshot() {
    const units = this.entities.filter(e => e.alive && e.behavior !== 'orb');
    return { time: this.gameTime, lives: this.lives, playerSize: this.player.size,
      food: this.entities.filter(e => e.alive && e.behavior === 'orb').length,
      ai: units.filter(e => e.behavior === 'ai').length,
      sizes: [units.filter(e => e.size < 40).length, units.filter(e => e.size >= 40 && e.size < 100).length,
        units.filter(e => e.size >= 100 && e.size < 180).length, units.filter(e => e.size >= 180).length],
      unimplemented: ['full-vector-pack'],
      observation:{seconds:this.runMetrics.seconds,attackStarts:this.runMetrics.attackStarts,autoplay:this.autoplay.enabled},
      relics:{items:this.relics.items.length,pickups:this.relics.pickups},
      era:{phase:this.era.phase.id,cycle:this.era.cycle,duels:this.era.duels.size,duelStarts:this.era.duelStarts,apocalypses:this.era.completedApocalypses},
      biomes:{encounters:this.biomes.encounters,blizzard:this.biomes.blizzard()},
      special:{casts:this.abilities.specialFires,fields:this.abilities.fields.length,commands:units.filter(e=>e.command).length},
      units: units.map(e => ({id:e.id,x:e.x,y:e.y,hp:e.hp,size:e.size,growth:e.growth,score:e.score ?? 0,role:e.role ?? null,apex:e.apex ?? false})) };
  }

  // v0.6 spec §9: a continuous, progress-driven absorption drone plays whenever the player is
  // involved in an active absorption (either side), instead of only a start/success one-shot.
  // Checks at most once per frame; the drone itself is a persistent oscillator/gain/filter graph
  // whose parameters are eased in place (see audio.js), never recreated.
  updatePlayerAbsorbDrone() {
    const p = this.player;
    let progress = null;
    if (p.alive && p.beingAbsorbedByRef) {
      progress = p.absorptionRequired > 0 ? p.absorptionProgress / p.absorptionRequired : 0;
    } else if (p.alive) {
      const target = this.entities.find((e) => e.alive && e.beingAbsorbedByRef === p);
      if (target) progress = target.absorptionRequired > 0 ? target.absorptionProgress / target.absorptionRequired : 0;
    }

    if (progress !== null) {
      if (!this._absorbDroneActive) {
        this.audio.startAbsorbDrone();
        this._absorbDroneActive = true;
      }
      this.audio.updateAbsorbDrone(progress);
    } else if (this._absorbDroneActive) {
      this.audio.stopAbsorbDrone();
      this._absorbDroneActive = false;
    }
  }

  stopContinuousAudio() {
    this.audio.stopBlizzard?.();
    if(this._absorbDroneActive||this.audio.absorbDrone)this.audio.stopAbsorbDrone();
    this._absorbDroneActive=false;
  }

  updatePlayer(dt) {
    const b = this.balance;
    const p = this.player;
    const inp = this.input;
    p.companionVelocity={x:0,y:0};
    p.allyAbsorptionEnabled=this.autoplay.enabled||!!inp.absorbHeld||!!inp.absorbToggle;
    if(p.allyAbsorptionEnabled&&p.companionGroup)this.allyLinks.leave(p,'absorption-enabled');

    const releasedUltimate=inp._ultimateQueued;inp._ultimateQueued=false;
    const releasedAttack=inp._attackQueued;inp._attackQueued=null;
    const releasedDodgeAngle=inp._dodgeAngle;inp._dodgeAngle=null;
    if(p.frozen>0){p.autoChargeSeconds=0;inp.attackChargeSeconds=0;p.attackHoldProgress=0;if(releasedDodgeAngle!=null)inp.consumeDodge();inp.consumeSpecial?.();return;}
    updateAttack(p, dt, b, this.hostileTargetsFor(p), this);
    updateDodge(p, dt, b);

    // v0.3 spec §1: being absorbed no longer freezes player control — movement (and dodge)
    // still work, so the player can walk or dodge out of the grab.

    const auto=this.autoplay.enabled?this.autoplay.action:null;
    if(!auto&&inp.mouseDown&&canStartAttack(p))inp.attackChargeSeconds=(inp.attackChargeSeconds??0)+dt;
    p.attackHoldProgress=inp.mouseDown?Math.min(1,(inp.attackChargeSeconds??0)/(b.attack.manualChargeSeconds??1.5)):this.touchAim?.kind==='attack'?Math.min(1,(this.touchAim.chargeSeconds??0)/(b.attack.manualChargeSeconds??1.5)):0;
    let mouseWorld = auto?.aim??this.screenToWorld(inp.mouseX, inp.mouseY);

    let dx = 0;
    let dy = 0;
    if(auto){dx=auto.move.x;dy=auto.move.y;}else {
    if (inp.keys.has('w') || inp.keys.has('arrowup')) dy -= 1;
    if (inp.keys.has('s') || inp.keys.has('arrowdown')) dy += 1;
    if (inp.keys.has('a') || inp.keys.has('arrowleft')) dx -= 1;
    if (inp.keys.has('d') || inp.keys.has('arrowright')) dx += 1;
    dx+=inp.touchMove?.x??0;dy+=inp.touchMove?.y??0;
    }

    inp.spaceHeldSeconds=inp.keys.has(' ')?(inp.spaceHeldSeconds??0)+dt:0;
    const moving = dx !== 0 || dy !== 0;
    const sprintMultiplier=updateSprint(p,dt,b,{held:!auto&&((inp.keys.has(' ')&&(inp.spaceHeldSeconds??0)>=.18)||inp.sprintHeld),moving});
    const moveSpeed=p.moveSpeed*this.abilities.speedMultiplier(p)*this.biomes.moveMultiplier(p)*sprintMultiplier;
    const moveAngle = moving ? Math.atan2(dy, dx) : p.facing;p.sprintDirection=moveAngle;
    const dragAngle=this.touchAim?.dragged?this.touchAim.angle:Number.isFinite(releasedAttack?.angle)?releasedAttack.angle:Number.isFinite(releasedDodgeAngle)?releasedDodgeAngle:null;
    const mouseAiming=!inp.touchMode&&(inp.mouseDown||releasedAttack!=null);
    const aimAngle=auto?angleTo(p,mouseWorld):dragAngle??(mouseAiming?angleTo(p,mouseWorld):moveAngle);
    if(!auto&&!mouseAiming)mouseWorld={x:p.x+Math.cos(aimAngle)*350,y:p.y+Math.sin(aimAngle)*350};

    if (p.attackState === 'READY' && p.dodgeState !== 'DODGING') {
      if (moving) {
        const len = Math.hypot(dx, dy);
        const strength=Math.min(1,len);
        p.companionVelocity={x:(dx/len)*moveSpeed*strength,y:(dy/len)*moveSpeed*strength};
        p.x += (dx / len) * moveSpeed * strength * dt;
        p.y += (dy / len) * moveSpeed * strength * dt;
      }
      p.facing = aimAngle;
    }

    const special=auto?auto.special:inp.consumeSpecial?.();if(auto)auto.special=false;
    if(special)this.abilities.start(p,aimAngle,mouseWorld,null,auto?(auto.skillSlot??(p.apex?'R':'E')):'E');
    if(releasedUltimate&&!auto)this.abilities.start(p,Number.isFinite(releasedUltimate.angle)?releasedUltimate.angle:aimAngle,releasedUltimate.point??this.screenToWorld(inp.mouseX,inp.mouseY),null,'R');
    const autoLevel=b.attack.aiChargeFraction??.75;
    if(auto&&auto.attack&&canStartAttack(p))p.autoChargeSeconds=(p.autoChargeSeconds??0)+dt;else p.autoChargeSeconds=0;
    const autoReleased=!!auto&&p.autoChargeSeconds>=(b.attack.manualChargeSeconds??.9)*autoLevel;
    if(auto)p.attackHoldProgress=Math.min(1,p.autoChargeSeconds/(b.attack.manualChargeSeconds??.9));
    if ((auto?autoReleased:(releasedAttack!=null)) && p.attackUnlocked && canStartAttack(p)) {
      startAttack(p, !auto&&releasedAttack!=null?(typeof releasedAttack==='number'?releasedAttack:releasedAttack.angle??aimAngle):aimAngle, b,auto?autoLevel:typeof releasedAttack==='object'?releasedAttack.charge??0:0);
      p.autoChargeSeconds=0;this.audio.attackCharge();
    }
    const dodge=auto?auto.dodge:inp.consumeDodge();if(auto)auto.dodge=false;
    if (dodge && p.dodgeUnlocked && canStartDodge(p)) {
      startDodge(p, !auto&&releasedDodgeAngle!=null?releasedDodgeAngle:p.facing, b);
      this.audio.dodge();
    }
  }

  // Two separate consumption rules — instant color-independent orb pickup (still requires
  // physical overlap), and same-color entity absorption. v0.5 spec §10: absorption no longer
  // requires overlap to *start* — any smaller same-color ball within the absorber's
  // maintainDistance (Size-scaled) connects and begins draining (see absorption.js).
  resolveConsumption() {
    const b = this.balance;
    for (const eater of this.entities) {
      if (!eater.alive) continue;
      if (eater.behavior !== 'player' && eater.behavior !== 'ai') continue;
      if(eater.summoned)continue;
      if (eater.beingAbsorbedByRef) continue; // can't eat while being absorbed yourself

      const maintainDistance = maintainDistanceFor(eater, b);
      const scanRange = Math.max(eater.size + 40, maintainDistance);
      const nearby = this.getNearbyEntities(eater, scanRange);
      for (const target of nearby) {
        if (!target.alive) continue;

        if (target.behavior === 'orb') {
          if (!canEatOrb(eater, target, b)) continue;
          if (!circlesOverlap(eater, target)) continue;
          target.alive = false;
          if(target.healFraction){const healed=Math.min(eater.maxHp-eater.hp,eater.maxHp*target.healFraction);eater.hp+=healed;this.spawnFloatingText(eater.x,eater.y,`회복 +${Math.round(healed)}`,'#f9a8d4');this.spawnGrowthParticles(target.x,target.y,'#f472b6');if(eater===this.player)this.audio.growth();continue;}
          const received=growthRewardFor(target.growthValue*this.relics.growthMultiplier(eater),eater,b);
          this.balanceLog?.pickup(target,eater,received);
          eater.addGrowth(received, b);
          eater.scalePulseTimer=Math.max(eater.scalePulseTimer,.2);
          this.awardScore(eater, target.growthValue);
          this.spawnGrowthParticles(target.x, target.y, target.colorHex);
          if (eater === this.player) {
            this.audio.growth();

          }
          continue;
        }

        if (eater === this.player && !this.player.allyAbsorptionEnabled) continue; // v0.6 §7

        if (canAbsorb(eater, target) && dist(eater, target) <= maintainDistanceFor(eater,b,target) && acceptsAbsorption(eater,target,b) && this.abilities.absorptionAllowed(eater,target)) {
          startAbsorption(eater, target, b, this);
        }
      }
    }
  }

  // v0.5 spec §18: different-color Player/AI can't fully overlap — they physically push each
  // other apart, mass-weighted by Size (heavier balls give less ground). Only applies to normal
  // movement collision; an in-progress attack CHARGE or a DODGE passes straight through so the
  // hitbox/i-frames keep working exactly as before (spec §18-2 explicitly separates "movement
  // collision" from "attack hitbox"). Orbs are unaffected — they stay simple passive pickups.
  resolvePushApart(dt=1/60) {
    const radius=this.entities.reduce((n,e)=>e.alive&&e.behavior!=='orb'?Math.max(n,e.size/2):n,0);
    for (const a of this.entities) {
      if (!a.alive || (a.behavior !== 'player' && a.behavior !== 'ai')) continue;
      if (a.attackState === 'CHARGING' || a.dodgeState === 'DODGING') continue;

      const nearby = this.getNearbyEntities(a, a.size/2+radius);
      for (const b of nearby) {
        if (a.id >= b.id) continue; // each pair resolved once
        if (!b.alive || (b.behavior !== 'player' && b.behavior !== 'ai')) continue;
        if (!isHostile(a,b)) continue; // same-color relationships go through absorption
        if (b.attackState === 'CHARGING' || b.dodgeState === 'DODGING') continue;

        const d = dist(a, b);
        const minDist = a.size / 2 + b.size / 2;
        if (d >= minDist) continue;

        const angle = d > 0.001 ? angleTo(b,a) : random('physics') * Math.PI * 2;
        const overlap = Math.min((minDist-d)*(1-Math.exp(-10*dt)),250*dt);
        const totalSize = a.size + b.size;
        a.x += Math.cos(angle) * overlap * (b.size / totalSize);
        a.y += Math.sin(angle) * overlap * (b.size / totalSize);
        b.x -= Math.cos(angle) * overlap * (a.size / totalSize);
        b.y -= Math.sin(angle) * overlap * (a.size / totalSize);
      }
    }
  }

  clampAllToWorld() {
    const w = this.balance.world;
    for (const e of this.entities) {
      if (!e.alive) continue;
      const r = (e.visualSize??e.size) / 2;
      if(!w.wrap&&e.behavior==='ai'&&e.state==='search'&&(e.x<r||e.y<r||e.x>w.worldWidth-r||e.y>w.worldHeight-r)){e.wanderTimer=0;e.explorationPoint=null;}
      clampEntity(e,w);
    }
  }

  // v0.6 spec §5: the camera zooms out as Size grows so a bigger ball doesn't block the
  // player's own view of incoming threats — a direct payoff for growing, not just a side effect
  // of it. `zoomOutFactor` divides baseZoom down, capped at `maxZoomOut` so it can't zoom out
  // indefinitely at very high Size.
  updateCamera(dt) {
    const cfg = this.balance.camera;
    const w = this.balance.world;
    const p = this.player;

    const zoomOutFactor = Math.min(cfg.maxZoomOut, 1 + p.size * cfg.zoomOutPerSize);
    const targetZoom = Math.min(cfg.baseZoom / zoomOutFactor,Math.min(this.canvas.width,this.canvas.height)*(cfg.maxBodyScreenFraction??.42)/Math.max(1,p.size));

    const lerp = 1 - Math.pow(0.001, dt);
    this.camera.zoom += (targetZoom - this.camera.zoom) * lerp;
    this.camera.zoom=Math.min(this.camera.zoom,Math.min(this.canvas.width,this.canvas.height)*(cfg.maxBodyScreenFraction??.42)/Math.max(1,p.size));
    const toward=delta(this.camera,p,w);
    this.camera.x += toward.x*lerp;this.camera.y += toward.y*lerp;
    if(w.wrap){this.camera.x=wrap(this.camera.x,w.worldWidth);this.camera.y=wrap(this.camera.y,w.worldHeight);return;}

    const halfViewW = this.canvas.width / 2 / this.camera.zoom;
    const halfViewH = this.canvas.height / 2 / this.camera.zoom;
    this.camera.x = halfViewW * 2 >= w.worldWidth ? w.worldWidth / 2 : Math.min(Math.max(this.camera.x, halfViewW), w.worldWidth - halfViewW);
    this.camera.y = halfViewH * 2 >= w.worldHeight ? w.worldHeight / 2 : Math.min(Math.max(this.camera.y, halfViewH), w.worldHeight - halfViewH);
  }

  orbSpawnLoop(dt) {
    const s = this.balance.spawning;
    this.orbSpawnTimer -= dt;
    if (this.orbSpawnTimer > 0) return;
    this.orbSpawnTimer = s.orbSpawnInterval;

    const orbCount = this.entities.reduce((n, e) => n + (e.alive && e.behavior === 'orb' ? 1 : 0), 0);
    const floor=(s.minimumOrbDensity??0)*this.balance.world.worldWidth*this.balance.world.worldHeight/1e6;
    // Refill the actual deficit; proportional batches settled below the density target.
    const target=Math.min(s.maxOrbCount,Math.ceil(floor));
    const desired=orbCount<target?target-orbCount:1;
    const batch=Math.min(s.maximumReplenishBatch??1,desired,Math.max(0,s.maxOrbCount-orbCount));
    for(let i=0;i<batch;i++)this.entities.push(spawnOrb(this.balance));
  }

  // v0.3 spec §2: enemies are no longer a fixed one-time population — the world keeps
  // replenishing them up to maxEnemyCount, which also keeps the average enemy size down
  // (fresh spawns roll from the small-biased distribution in spawning.js#rollEnemySize).
  enemySpawnLoop(dt) {
    const s = this.balance.spawning;
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer > 0) return;
    this.enemySpawnTimer = s.enemySpawnInterval;

    const enemyCount = this.entities.reduce((n, e) => n + (e.alive && e.behavior === 'ai' ? 1 : 0), 0);
    if (enemyCount < s.maxEnemyCount) {
      const colorDef = this.balance.colors[Math.floor(random('world') * this.balance.colors.length)];
      const newborn=this.createSafeEnemy(colorDef);
      this.entities.push(newborn);
      this.ecology.initializeUnit(this,newborn);
    }
  }

  cleanupDead() {
    if (this.entities.length > 2000) {
      this.entities = this.entities.filter((e) => e.alive || e.behavior === 'player');
      return;
    }
    if (random('visual') < 0.02) {
      this.entities = this.entities.filter((e) => e.alive || e.behavior === 'player');
    }
  }

  // v0.3: takes the attacker so we can credit a Kill Count (spec §6) and play the right
  // death-adjacent sound only for events that matter to the player (spec §4).
  // v0.6 spec §16: player death now costs a Life instead of ending the run outright — Size/
  // Growth carry over unchanged into the respawn, and only running out of Lives triggers Game
  // Over (spec: "부활할 때 Size는 감소하지 않는다").
  onEntityDeath(entity, attacker) {
    // R-ABS-010: retain refunds even after the victim is removed from the world.
    cancelAbsorption(entity);
    for(const target of this.entities)if(target.beingAbsorbedByRef===entity)cancelAbsorption(target);
    Object.assign(entity,{windStoneStacks:0,obsidianStacks:0,obsidianShieldHp:0,obsidianShieldUntil:0,companionCharmUntil:0,objectSpeedUntil:0,objectFrostUntil:0});
    this.relics.release(entity);
    this.abilities.release(entity);
    this.ecology.release(entity, this.gameTime, "death");
    if (entity.behavior === 'player') {
      this.spawnDeathParticles(entity.x, entity.y, entity.colorHex);
      this.audio.death();
      this.handlePlayerDefeat('DEFEATED');
      return;
    }
    this.spawnDeathParticles(entity.x, entity.y, entity.colorHex);
    if(entity.summoned){this.allyLinks.leave(entity,'summon-death');return;}

    // v0.4 spec §31-36 / v0.6 spec §10-12: a direct, size-scaled growth reward for whoever
    // landed the killing attack, but cut down by `growthRewardMultiplier` — the bulk of a kill's
    // payoff now comes from the orb spray below instead, which has to be collected in person.
    let directGrowth=0;
    if (attacker && (attacker.behavior === 'player' || attacker.behavior === 'ai') && attacker.alive) {
      const kr = this.balance.killReward;
      const reward = growthRewardFor(kr.baseReward * Math.pow(entity.size / kr.referenceSize, kr.growthExponent) * kr.growthRewardMultiplier,attacker,this.balance);
      directGrowth=reward;
      attacker.addGrowth(reward, this.balance);
      this.awardScore(attacker, Math.round(reward) + 100);
      if (attacker === this.player) {
        this.player.kills += 1;
        // Score already credited once above; // flat per-kill score bonus, on top of the growth
        this.audio.death();
        this.audio.killReward();
        this.spawnFloatingText(attacker.x, attacker.y - attacker.size / 2 - 10, `+${Math.round(reward)} GROWTH`, '#4ade80');
        this.spawnFloatingText(attacker.x, attacker.y - attacker.size / 2 - 28, 'KILL +1', '#fbbf24');
      }
    }

    if (entity.behavior === 'ai') {
      const orbs = spawnDeathOrbs(entity, this.balance);
      const direct=directGrowth;
      this.balanceLog?.drop(entity,orbs,direct);
      this.entities.push(...orbs);
    }
  }

  respawnPlayer() {
    const p = this.player;
    p.x = this.balance.world.worldWidth / 2;
    p.y = this.balance.world.worldHeight / 2;
    // Size/Growth/stacks are deliberately left untouched (spec §16: a Life-based respawn keeps
    // Size — only a death with zero Lives left resets anything, and that goes through reset()).
    p.hp = p.maxHp;
    p.alive = true;
    p.attackState = 'READY';
    p.dodgeState = 'READY';
    p.attackStack = p.attackMaxStack;
    p.dodgeStack = p.dodgeMaxStack;
    p.invincible = false;
    p.beingAbsorbedByRef = null;
    p.kx = 0;
    p.ky = 0;
    p.knockbackTimer = 0;
    p.regenTimer = 999;
    p.scalePulseTimer = 0;
  }

  // v0.6 spec §16: shared by both ways the player can go down — combat death
  // (onEntityDeath) and being fully absorbed (absorption.js#completeAbsorption) — so a Life is
  // spent and Game Over triggers consistently regardless of which one happened.
  handlePlayerDefeat(reason) {
    this.relics.release(this.player);
    this.player.defeatSerial=(this.player.defeatSerial??0)+1;
    if(this.player.companionGroup)this.allyLinks.leave(this.player,'defeat');
    this.abilities.release(this.player);
    this.player._specialApex=false;
    this.player.frozen=0;this.player.dustInvulnerableRemaining=0;this.player.dustUntil=0;this.player.shieldHp=0;this.player.shieldRemaining=0;this.player.wavePush=null;this.player.morale?.clear();
    this.ecology.release(this.player, this.gameTime, reason);
    this.lives -= 1;
    if (this.lives > 0) {
      this.ui.showDefeatMessage(reason);
      this.respawnPlayer();
    } else {
      this.triggerGameOver();
    }
  }

  // v0.6 spec §16: all Lives spent — freeze the sim, submit the run's score to the local Top 10,
  // and hand off to whatever main.js wired up (the Game Over overlay) via onGameOver.
  triggerGameOver() {
    this.gameOver = true;
    this.paused = true;
    this.autoplay.action=null;this.autoplay.reason='게임 종료';
    if (this.onGameOver) this.onGameOver(this.score);
  }

  // ---------- particles ----------

  spawnHitImpact(target,attacker,lost,{field=false,shield=false}={}) {
    const now=this.gameTime;if(now<(target.nextImpactVisualAt??-1)||this.particles.length+16>900)return;
    target.nextImpactVisualAt=now+(field?.22:.075);target.hitVisualUntil=now+.18;target.hitVisualShield=shield;
    const z=Math.max(.08,this.camera.zoom),power=Math.min(1,Math.max(.2,lost/Math.max(1,target.maxHp)*5)),toward=attacker?delta(attacker,target,this.balance.world):{x:0,y:0},length=Math.hypot(toward.x,toward.y),angle=length?Math.atan2(toward.y,toward.x):0;
    const x=target.x-(length?toward.x/length*target.size/2:0),y=target.y-(length?toward.y/length*target.size/2:0),color=shield?'#a5f3fc':'#ffffff',count=field?4:8+Math.round(power*6),life=field?.18:.28;
    this.particles.push({x,y,vx:0,vy:0,life:.24,maxLife:.24,color,size:(10+power*12)/z,type:'impact-ring'});
    for(let i=0;i<count;i++){const a=angle+(random('visual')-.5)*Math.PI*1.6,speed=(70+random('visual')*160)*(1+power)/z;this.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,maxLife:life,color:i%3?color:target.colorHex,size:(1.5+power*2)/z,type:'impact-spark'});}
    if(target===this.player&&!shield)this.playerHitUntil=now+.18;
  }

  spawnHitParticles(x, y, color) {
    const life = this.balance.combat.hitParticleLifetime;
    for (let i = 0; i < 12; i++) {
      const a = random('visual') * Math.PI * 2;
      const speed = 80 + random('visual') * 160;
      this.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life, maxLife: life, color, size: 3 + random('visual') * 3, type: 'spark',
      });
    }
  }

  spawnDeathParticles(x, y, color) {
    for (let i = 0; i < 18; i++) {
      const a = random('visual') * Math.PI * 2;
      const speed = 40 + random('visual') * 180;
      this.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0.6, maxLife: 0.6, color, size: 3 + random('visual') * 4, type: 'burst',
      });
    }
  }

  spawnGrowthParticles(x, y, color) {
    this.particles.push({
      x, y, vx: 0, vy: -20, life: 0.4, maxLife: 0.4, color, size: 6, type: 'ring',
    });
  }

  // v0.4 spec §11: a subtle rising particle while HP is regenerating — deliberately understated.
  spawnRegenParticle(x, y, size) {
    const a = random('visual') * Math.PI * 2;
    const r = random('visual') * size * 0.4;
    this.particles.push({
      x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
      vx: 0, vy: -18, life: 0.5, maxLife: 0.5, color: '#4ade80', size: 2.5, type: 'spark',
    });
  }

  // v0.4 spec §35: short floating text popups ("+25 GROWTH", "KILL +1", etc).
  spawnFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
  }

  updateFloatingTexts(dt) {
    for (const t of this.floatingTexts) {
      t.life -= dt;
      t.y -= 28 * dt;
      if(this.balance.world.wrap){t.x=wrap(t.x,this.balance.world.worldWidth);t.y=wrap(t.y,this.balance.world.worldHeight);}
    }
    this.floatingTexts = this.floatingTexts.filter((t) => t.life > 0);
  }

  spawnAbsorptionParticles(x, y, color) {
    for (let i = 0; i < 24; i++) {
      const a = random('visual') * Math.PI * 2;
      const speed = 30 + random('visual') * 90;
      this.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0.5, maxLife: 0.5, color, size: 2 + random('visual') * 3, type: 'spark',
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    if(this.balance.world.wrap)for(const p of this.particles){p.x=wrap(p.x,this.balance.world.worldWidth);p.y=wrap(p.y,this.balance.world.worldHeight);}
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---------- camera transforms ----------

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x,
      y: (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: delta(this.camera,{x:wx,y:wy},this.balance.world).x*this.camera.zoom+this.canvas.width/2,
      y: delta(this.camera,{x:wx,y:wy},this.balance.world).y*this.camera.zoom+this.canvas.height/2,
    };
  }

  // ---------- render ----------

  render() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.fillStyle = '#11151c';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    const w=this.balance.world,view=worldView(this.canvas,this.camera);
    let margin=650;for(const e of this.entities)if(e.alive)margin=Math.max(margin,e.size/2+120);
    const minX=w.wrap?Math.floor((view.left-margin)/w.worldWidth):0,maxX=w.wrap?Math.floor((view.right+margin)/w.worldWidth):0;
    const minY=w.wrap?Math.floor((view.top-margin)/w.worldHeight):0,maxY=w.wrap?Math.floor((view.bottom+margin)/w.worldHeight):0;
    for(const layer of [0,1])for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
      const ox=x*w.worldWidth,oy=y*w.worldHeight;
      ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(0,0,w.worldWidth,w.worldHeight);
      this.renderCamera={...this.camera,x:this.camera.x-ox,y:this.camera.y-oy};
      if(layer===0){
      this.drawGrid(ctx);
      this.biomes.draw(ctx,this.camera.zoom);
      }else{
      this.biomeObjects.draw(ctx,this.camera.zoom);this.era.draw(ctx,this.camera.zoom);
      this.relics.draw(ctx,this.camera.zoom);
      this.drawTerritories(ctx);
      if(!this.balance.world.wrap)this.drawWorldBorder(ctx);
      this.abilities.draw(ctx,this.camera.zoom);
      if(this.showAllyLinks!==false)this.allyLinks.draw(ctx,this.camera.zoom);
      this.drawAbsorptionLinks(ctx);
      this.drawEntities(ctx);
      this.drawParticles(ctx);
      this.drawFloatingTexts(ctx);
      this.drawTouchAim(ctx);
      }
      ctx.restore();
    }
    this.renderCamera=null;
    ctx.restore();
    this.drawNames(ctx);
    this.biomes.drawBlizzardOverlay(ctx);
    if((this.playerHitUntil??0)>this.gameTime){ctx.save();ctx.globalAlpha=.4*Math.min(1,(this.playerHitUntil-this.gameTime)/.18);ctx.strokeStyle='#fb7185';ctx.lineWidth=6;ctx.strokeRect(3,3,this.canvas.width-6,this.canvas.height-6);ctx.restore();}
  }

  drawTouchAim(ctx) {
    if(!this.touchAim||!this.player.alive||this.paused||this.gameOver)return;
    const p=this.player,z=this.camera.zoom,length=p.size/2+28/z,head=8/z;
    if(this.touchAim.kind==='ultimate'&&this.touchAim.point&&['red','yellow'].includes(p.color)){const cfg=this.abilities.skill(p,'R'),point=cfg.effect==='muster'?p:near(p,this.touchAim.point,this.balance.world);ctx.save();ctx.beginPath();ctx.arc(point.x,point.y,cfg.radius,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.04)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.5/z;ctx.setLineDash([6/z,4/z]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(point.x-6/z,point.y);ctx.lineTo(point.x+6/z,point.y);ctx.moveTo(point.x,point.y-6/z);ctx.lineTo(point.x,point.y+6/z);ctx.stroke();ctx.restore();}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(this.touchAim.angle);
    ctx.strokeStyle='#ffffff';ctx.lineWidth=2/z;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);
    ctx.moveTo(length-head,-head*.65);ctx.lineTo(length,0);ctx.lineTo(length-head,head*.65);
    ctx.stroke();ctx.restore();
  }

  drawNames(ctx) {
    if (this.ui.preferences?.names === false) {this.visibleNameLabels=[]; return;}
    const ctxFont = "bold 12px system-ui, sans-serif";
    ctx.save(); ctx.font = ctxFont; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    const candidates = scoreRanking(this.entities, this.ecology.scoreOrder).slice(0,20)
      .filter(e => this.biomes.playerCanSee(e)&&this.isRoughlyVisible(this.balance.world.wrap?near(this.camera,e,this.balance.world):e)).map(e => {
        const point = this.worldToScreen(e.x, e.y-e.size/2);
        const text = `${e.apex ? "★ " : ""}${e.displayName}`;
        return {id:e.id, text, color:e.colorHex, x:point.x, y:point.y-entityLabelRows(e,this.showAILabels,this.abilities.unlocked(e,'E')).name, textWidth:ctx.measureText(text).width};
      });
    this.visibleNameLabels = layoutNameLabels(candidates, this.canvas.width, this.canvas.height, this.ui.overlayRects ?? []);
    for (const label of this.visibleNameLabels) {
      const r=label.box; ctx.fillStyle="rgba(10,15,24,.85)"; ctx.fillRect(r.left,r.top,r.right-r.left,r.bottom-r.top);
      ctx.fillStyle=label.color; ctx.fillText(label.text,label.x,label.y);
    }
    ctx.restore();
  }

  drawTerritories(ctx) {
    ctx.save();ctx.beginPath();ctx.rect(0,0,this.balance.world.worldWidth,this.balance.world.worldHeight);if(!this.balance.world.wrap)ctx.clip();
    for(const e of this.entities){if(!e.alive||!e.apex)continue;
      ctx.beginPath();ctx.arc(e.x,e.y,apexTerritoryRadius(e,this.balance),0,Math.PI*2);
      ctx.fillStyle=this.withAlpha(e.colorHex,.025);ctx.fill();
      ctx.strokeStyle=this.withAlpha(e.colorHex,.3);ctx.lineWidth=2/this.camera.zoom;ctx.stroke();
    }ctx.restore();
  }

  drawGrid(ctx) {
    const w = this.balance.world;
    const step = 200;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1 / this.camera.zoom;
    ctx.beginPath();
    for (let x = 0; x <= w.worldWidth; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, w.worldHeight);
    }
    for (let y = 0; y <= w.worldHeight; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w.worldWidth, y);
    }
    ctx.stroke();
  }

  drawWorldBorder(ctx) {
    const w = this.balance.world;
    ctx.strokeStyle = 'rgba(255,80,80,0.6)';
    ctx.lineWidth = 6 / this.camera.zoom;
    ctx.strokeRect(0, 0, w.worldWidth, w.worldHeight);
  }

  // v0.5 spec §13-14: the connection line's strength now also reflects distance — thin and
  // faint near the edge of maintainDistance, strong and pulsing once the balls are touching.
  drawAbsorptionLinks(ctx) {
    const view=worldView(this.canvas,this.renderCamera??this.camera);
    for (const target of this.entities) {
      if (!target.alive || !target.beingAbsorbedByRef) continue;
      const absorber = target.beingAbsorbedByRef,image=near(target,absorber);
      if(!segmentInView(view,target,image,6/this.camera.zoom))continue;
      const t = target.absorptionRequired > 0 ? Math.min(1, target.absorptionProgress / target.absorptionRequired) : 1;
      const maintainDistance = maintainDistanceFor(absorber, this.balance,target);
      const d = dist(target,absorber);
      const proximity = 1 - Math.min(1, d / maintainDistance);

      ctx.save();
      ctx.strokeStyle = this.withAlpha('#ffffff', 0.12 + proximity * 0.45 + t * 0.2);
      ctx.lineWidth = (1 + proximity * 3 + t * 1.5) / this.camera.zoom;
      ctx.beginPath();
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(image.x, image.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEntities(ctx) {
    const visible = this.entities
      .filter((e) => e.alive && this.biomes.playerCanSee(e) && this.isRoughlyVisible(e))
      .sort((a, b) => a.size - b.size);

    for (const e of visible) this.drawEntity(ctx, e);
    if (this.showAILabels) this.drawAILabels(ctx, visible);
  }

  isRoughlyVisible(e) {
    const camera=this.renderCamera??this.camera;
    const halfW = this.canvas.width / 2 / this.camera.zoom + Math.max(100,e.size/2+20);
    const halfH = this.canvas.height / 2 / this.camera.zoom + Math.max(100,e.size/2+20);
    return Math.abs(e.x-camera.x)<halfW&&Math.abs(e.y-camera.y)<halfH;
  }

  drawEntity(ctx, e) {
    const beingAbsorbed = !!e.beingAbsorbedByRef;
    const absorbT = beingAbsorbed && e.absorptionRequired > 0 ? Math.min(1, e.absorptionProgress / e.absorptionRequired) : (beingAbsorbed ? 1 : 0);
    // v0.4 spec §23: a short outward "grew bigger" pulse plays on a successful absorption.

    const r = (e.visualSize??e.size) / 2;
    if(e.behavior!=='orb'&&this.abilities.unlocked(e,'E')){
      ctx.save();ctx.font=`bold ${12/this.camera.zoom}px system-ui`;ctx.textAlign='center';ctx.lineWidth=3/this.camera.zoom;ctx.strokeStyle='#0f172a';
      for(const [i,slot] of ['E','R'].entries())if(this.abilities.unlocked(e,slot)){
        const ready=this.abilities.canCast(e,slot),label=e.specialCast?.slot===slot?`${slot} …`:this.abilities.cooldown(e,slot)>0?`${slot} ${Math.ceil(this.abilities.cooldown(e,slot))}`:ready?`${slot} ◆`:`${slot} ◇`;
        const x=e.x+(e.apex?(i?1:-1)*32/this.camera.zoom:0),y=e.y-r-entityLabelRows(e,this.showAILabels,true).skill/this.camera.zoom;ctx.strokeText(label,x,y);ctx.fillStyle=ready?'#fff':'#94a3b8';ctx.fillText(label,x,y);
      }ctx.restore();
    }
    if(e.frostbiteRemaining>0){const z=this.camera.zoom;ctx.save();ctx.strokeStyle='#a5f3fc';ctx.lineWidth=2/z;ctx.beginPath();ctx.arc(e.x,e.y,r+5/z,0,Math.PI*2);ctx.stroke();ctx.font=`bold ${12/z}px system-ui`;ctx.fillStyle='#cffafe';ctx.textAlign='center';ctx.fillText('❄ 동상',e.x,e.y+r+18/z);ctx.restore();}
    if(this.era.activeWar(e)){const z=this.camera.zoom;ctx.save();ctx.font=`bold ${13/z}px system-ui`;ctx.textAlign='center';ctx.strokeStyle='#0f172a';ctx.lineWidth=3/z;ctx.strokeText(`⚔ ${e.warTargets.size}`,e.x+r*.65,e.y-r*.65);ctx.fillStyle='#fb7185';ctx.fillText(`⚔ ${e.warTargets.size}`,e.x+r*.65,e.y-r*.65);ctx.restore();}
    if(e.apex){const z=this.camera.zoom;ctx.save();ctx.strokeStyle='#facc15';ctx.lineWidth=3/z;ctx.beginPath();ctx.arc(e.x,e.y,r+9/z,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<6;i++){const a=i*Math.PI/3+this.gameTime*.25,x=e.x+Math.cos(a)*(r+17/z),y=e.y+Math.sin(a)*(r+17/z);ctx.beginPath();ctx.moveTo(x,y-4/z);ctx.lineTo(x+3/z,y);ctx.lineTo(x,y+4/z);ctx.lineTo(x-3/z,y);ctx.closePath();ctx.fillStyle='#fde68a';ctx.fill();}
      ctx.font=`bold ${16/z}px system-ui`;ctx.textAlign='center';ctx.lineWidth=3/z;ctx.strokeStyle='#0f172a';ctx.strokeText('♛',e.x,e.y-r-74/z);ctx.fillStyle='#facc15';ctx.fillText('♛',e.x,e.y-r-74/z);ctx.restore();}

    if(e.attackHoldProgress>0){ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,r+14/this.camera.zoom,-Math.PI/2,-Math.PI/2+Math.PI*2*e.attackHoldProgress);ctx.strokeStyle='#fff';ctx.lineWidth=4/this.camera.zoom;ctx.stroke();ctx.restore();}

    // dodge afterimages — each fades independently over dodge.effectLifetime, then is pruned
    // (see combat.js#updateDodge), so they never linger on screen after the dodge ends.
    if (e.dodgeTrail.length) {
      const lifetime = this.balance.dodge.effectLifetime;
      for (const stored of e.dodgeTrail) {
        const t=this.balance.world.wrap?near(e,stored):stored;
        const alpha = Math.max(0, t.life / lifetime) * 0.3;
        ctx.beginPath();
        ctx.fillStyle = this.withAlpha(e.colorHex, alpha);
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // charge afterimages
    if (e.attackState === 'CHARGING' && e.trail.length) {
      for (let i = 0; i < e.trail.length; i++) {
        const t = this.balance.world.wrap?near(e,e.trail[i]):e.trail[i];
        const alpha = ((i + 1) / e.trail.length) * 0.3;
        ctx.beginPath();
        ctx.fillStyle = this.withAlpha('#ffffff', alpha);
        ctx.arc(t.x, t.y, r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const chargePreview=chargedAttackDistance(e.size,this.balance,e.apex,e.attackHoldProgress??0);
    const aiming=e===this.player&&(this.touchAim?.kind==='attack'||this.input.mouseDown||e.autoChargeSeconds>0)&&e.attackUnlocked&&['READY','RECOVERY'].includes(e.attackState)&&!(e.frozen>0)&&!e.specialCast&&e.dodgeState!=='DODGING';
    if(aiming||(e===this.player&&e.attackState==='TELEGRAPH')||e.attackState==='CHARGING'){
      const hitRadius=e.size/2;
      const direction=aiming?(this.touchAim?.angle??angleTo(e,this.autoplay.action?.aim??this.screenToWorld(this.input.mouseX,this.input.mouseY))):e.attackDir;
      const remaining=aiming?chargedAttackDistance(e.size,this.balance,e.apex,e.attackHoldProgress??0):e.attackState==='TELEGRAPH'?chargePreview:e.currentChargeDistance*Math.max(0,1-e.attackTimer/e.currentChargeDuration);
      ctx.save();ctx.translate(e.x,e.y);ctx.rotate(direction);ctx.beginPath();ctx.moveTo(0,-hitRadius);ctx.lineTo(remaining,-hitRadius);ctx.arc(remaining,0,hitRadius,-Math.PI/2,Math.PI/2);ctx.lineTo(0,hitRadius);ctx.arc(0,0,hitRadius,Math.PI/2,Math.PI*1.5);ctx.closePath();const blocked=aiming&&(e.attackStack<=0||e.attackState==='RECOVERY');ctx.fillStyle=blocked?'rgba(248,113,113,.09)':'rgba(255,255,255,.055)';ctx.fill();ctx.strokeStyle=blocked?'rgba(248,113,113,.85)':'rgba(255,255,255,.45)';ctx.lineWidth=1/this.camera.zoom;ctx.stroke();ctx.restore();
    }
    // telegraph indicator
    if (e===this.player&&e.attackState === 'TELEGRAPH') {
      const reach = chargePreview;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3 / this.camera.zoom;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.attackDir) * reach, e.y + Math.sin(e.attackDir) * reach);
      ctx.stroke();

      ctx.restore();
    }

    if(e.healFraction){ctx.save();ctx.strokeStyle='#ffffff';ctx.lineWidth=2/this.camera.zoom;ctx.beginPath();ctx.moveTo(e.x-5/this.camera.zoom,e.y);ctx.lineTo(e.x+5/this.camera.zoom,e.y);ctx.moveTo(e.x,e.y-5/this.camera.zoom);ctx.lineTo(e.x,e.y+5/this.camera.zoom);ctx.stroke();ctx.restore();}
    if(e.regionReward==='snow'&&e.behavior==='orb'){ctx.save();ctx.strokeStyle='#e0f2fe';ctx.lineWidth=1/this.camera.zoom;ctx.beginPath();for(let i=0;i<6;i++){const angle=i*Math.PI/3;ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(angle)*(r+5),e.y+Math.sin(angle)*(r+5));}ctx.stroke();ctx.restore();}
    if(e.attackState==='CHARGING'){ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.strokeStyle='#ffffff';ctx.lineWidth=4/this.camera.zoom;ctx.stroke();}
    // R-VIS-001: matte combat units, keep passive food rendering unchanged.
    const flashing=(e.hitVisualUntil!=null?e.hitVisualUntil-this.gameTime>.12:e.hitFlash>0);
    if(e.behavior!=='orb')drawMatteBody(ctx,e,r,this.camera.zoom,flashing);
    else {
      ctx.beginPath();ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.ellipse(e.x,e.y+r*.15,r*.95,r*.6,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.fillStyle=flashing?'#ffffff':e.colorHex;
      ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.fill();
      ctx.lineWidth=Math.max(1.5,r*.08);ctx.strokeStyle=beingAbsorbed?'#ffffff':'rgba(0,0,0,0.45)';ctx.stroke();
    }
    // Canvas save/restore does not restore the current path. Stroke the body before
    // decorative helpers replace it with their marks, pulse circles or arrow triangles.
    if((e.hitVisualUntil??0)>this.gameTime){ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,r+3/this.camera.zoom,0,Math.PI*2);ctx.strokeStyle=e.hitVisualShield?'#a5f3fc':'#ffffff';ctx.globalAlpha=Math.min(1,(e.hitVisualUntil-this.gameTime)/.18);ctx.lineWidth=4/this.camera.zoom;ctx.stroke();ctx.restore();}
    if((e.obsidianShieldHp??0)>0&&(e.obsidianShieldUntil??0)>this.gameTime){ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,r+13/this.camera.zoom,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,e.obsidianShieldHp/e.obsidianShieldMax));ctx.strokeStyle='#c4b5fd';ctx.lineWidth=5/this.camera.zoom;ctx.stroke();ctx.restore();}
    if((e.windStoneStacks??0)>0||(e.obsidianStacks??0)>0){ctx.save();ctx.fillStyle='#c4b5fd';ctx.font=`bold ${11/this.camera.zoom}px system-ui`;ctx.textAlign='center';ctx.fillText(`바람 ${e.windStoneStacks??0} · 흑요석 ${e.obsidianStacks??0}`,e.x,e.y+r+16/this.camera.zoom);ctx.restore();}
    if((e.companionCharmUntil??0)>this.gameTime){ctx.save();const shell=e.companionDecoration==='shell';ctx.strokeStyle=shell?'#fef3c7':'#f9a8d4';ctx.lineWidth=2/this.camera.zoom;for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=e.x+Math.cos(a)*(r+9/this.camera.zoom),y=e.y+Math.sin(a)*(r+9/this.camera.zoom);ctx.beginPath();if(shell){ctx.arc(x,y,6/this.camera.zoom,Math.PI,Math.PI*2);ctx.lineTo(x,y+3/this.camera.zoom);ctx.closePath();for(let j=-1;j<=1;j++){ctx.moveTo(x,y+3/this.camera.zoom);ctx.lineTo(x+j*4/this.camera.zoom,y-4/this.camera.zoom);}}else{for(let j=0;j<5;j++){const aa=j*Math.PI*2/5;ctx.moveTo(x+Math.cos(aa)*3/this.camera.zoom+2/this.camera.zoom,y+Math.sin(aa)*3/this.camera.zoom);ctx.arc(x+Math.cos(aa)*3/this.camera.zoom,y+Math.sin(aa)*3/this.camera.zoom,2/this.camera.zoom,0,Math.PI*2);}}ctx.stroke();}ctx.restore();}
    drawActionArt(ctx,e,this,r,this.camera.zoom);
    if((e.shieldHp??0)>0){ctx.beginPath();ctx.arc(e.x,e.y,r+7/this.camera.zoom,0,Math.PI*2);ctx.strokeStyle='#a5f3fc';ctx.lineWidth=3/this.camera.zoom;ctx.stroke();}
    if(this.abilities.frostMarks.some(m=>m.target===e)){ctx.beginPath();ctx.arc(e.x,e.y,r+12/this.camera.zoom,0,Math.PI*2);ctx.strokeStyle='#67e8f9';ctx.lineWidth=2/this.camera.zoom;ctx.setLineDash([5/this.camera.zoom,4/this.camera.zoom]);ctx.stroke();ctx.setLineDash([]);}
    if((e.frostbiteRemaining??0)>0||(this.biomes.enabled&&this.biomes.regionAt(e)?.id==='lake')){ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.fillStyle=(e.frostbiteRemaining??0)>0?'rgba(185,225,255,.42)':'rgba(25,110,230,.30)';ctx.fill();ctx.restore();}
    drawSpeciesMark(ctx,e,this.camera.zoom);
    drawGrowthPulse(ctx,e,this.camera.zoom);
    if((e===this.player||e.attackState!=='TELEGRAPH')&&(e!==this.player||!this.touchAim))drawPlayerDirection(ctx,e,this.camera.zoom);

    if (beingAbsorbed) {
      // absorption progress ring, pulsing as it nears completion
      ctx.beginPath();
      ctx.strokeStyle = this.withAlpha('#ffffff', 0.5 + Math.sin(absorbT * Math.PI * 6) * 0.2);
      ctx.lineWidth = 3 / this.camera.zoom;
      ctx.arc(e.x, e.y, r + 8, -Math.PI / 2, -Math.PI / 2 + absorbT * Math.PI * 2);
      ctx.stroke();
    }

    if (e.invincible || e.dustInvulnerableRemaining>0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2 / this.camera.zoom;
      ctx.arc(e.x, e.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // v0.6 follow-up: kill-reward orbs no longer get a cross-mark overlay — they're meant to
    // read as indistinguishable from a naturally-spawned field orb (see spawning.js#spawnDeathOrbs).

    if(e.frozen>0){ctx.save();ctx.strokeStyle='#dffaff';ctx.lineWidth=2/this.camera.zoom;ctx.setLineDash([4/this.camera.zoom,3/this.camera.zoom]);ctx.beginPath();ctx.arc(e.x,e.y,r+4,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if(e.morale?.size){ctx.beginPath();ctx.strokeStyle='#86efac';ctx.lineWidth=2/this.camera.zoom;ctx.arc(e.x,e.y,r+12,-Math.PI*.8,-Math.PI*.2);ctx.stroke();}
    if(e.command){ctx.save();ctx.strokeStyle='#ffffff';ctx.lineWidth=2/this.camera.zoom;ctx.setLineDash([3/this.camera.zoom,6/this.camera.zoom]);ctx.beginPath();ctx.arc(e.x,e.y,r+16,0,Math.PI*2);ctx.stroke();ctx.restore();}
    // hp bar for AI / player
    if ((e.behavior === 'ai' || e.behavior === 'player') && e.hp < e.maxHp) {
      const barW = Math.max(24/this.camera.zoom,r*1.6);
      const barH = 5/this.camera.zoom;
      const bx = e.x - barW / 2;
      const by = e.y-r-9/this.camera.zoom;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = e.hp / e.maxHp > 0.3 ? '#4ade80' : '#f87171';
      ctx.fillRect(bx, by, barW * Math.max(0, e.hp / e.maxHp), barH);
    }
  }

  // Two debug lines: role/relationship above state/personality. Read-only; constant on-screen font size.
  drawAILabels(ctx, visible) {
    const z = this.camera.zoom;
    ctx.save();
    ctx.font = `${11 / z}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 / z;
    for (const e of visible) {
      if (!e.alive || (e.behavior !== 'ai' && e.behavior !== 'player')) continue;
      const x=e.x,top=e.y-e.size/2,rows=entityLabelRows(e,true,this.abilities.unlocked(e,'E'));
      const roleY=top-rows.role/z,stateY=top-rows.state/z;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      const role = debugRoleLabel(e);
      ctx.strokeText(role,x,roleY);
      ctx.fillStyle = e.role==='predator' ? '#fda4af' : e.role==='prey' ? '#a5b4fc' : '#86efac';
      ctx.fillText(role,x,roleY);
      if(e.behavior==='player') continue;
      const state = this.era.activeWar(e)?`전쟁 ${e.warTargets.size}명` : e.guardMode?'경계':AI_STATE_LABEL[e.recovering ? 'recover' : e.state] ?? e.state;
      const text = `${state} · ${AI_PERSONALITY_LABEL[e.personality] ?? '-'}`;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(text,x,stateY);
      ctx.fillStyle = e.state === 'flee' ? '#fde68a' : e.state === 'chase_fight' ? '#fca5a5' : '#ffffff';
      ctx.fillText(text,x,stateY);
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();const view=worldView(this.canvas,this.renderCamera??this.camera);
    for (const p of this.particles) {
      const extent=p.type==='ring'||p.type==='impact-ring'?p.size*4+2:p.type==='impact-spark'?p.size+Math.hypot(p.vx,p.vy)*.025:p.size;
      if(!boxInView(view,p.x-extent,p.y-extent,p.x+extent,p.y+extent))continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.fillStyle = this.withAlpha(p.color, alpha);
      if (p.type === 'ring'||p.type==='impact-ring') {
        ctx.arc(p.x, p.y, p.size * (1 - alpha) * 3 + p.size, 0, Math.PI * 2);
        ctx.lineWidth = p.type==='impact-ring'?2.5/this.camera.zoom:2;
        ctx.strokeStyle = this.withAlpha(p.color, alpha);
        ctx.stroke();
      } else if(p.type==='impact-spark'){ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.strokeStyle=this.withAlpha(p.color,alpha);ctx.lineWidth=p.size*alpha;ctx.lineCap='round';ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawFloatingTexts(ctx) {
    if (!this.floatingTexts.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `bold ${14 / this.camera.zoom}px 'Segoe UI', system-ui, sans-serif`;
    for (const t of this.floatingTexts) {
      const alpha = Math.max(0, Math.min(1, t.life / t.maxLife) * 1.2);
      ctx.fillStyle = this.withAlpha(t.color, alpha);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  withAlpha(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
