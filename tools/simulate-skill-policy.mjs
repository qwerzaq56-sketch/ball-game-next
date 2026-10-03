// Same code/config/seeds; each arm changes one declared skill policy.
import {readFileSync,writeFileSync} from 'node:fs';
import {createGame} from './headless.mjs';
import {BalanceMetrics} from '../js/balanceMetrics.js';
import {SKILL_CATALOG} from '../js/skillCatalog.js';
const duration=Number(process.argv[2]??600),output=process.argv[3]??'reports/M44-skill-policy.json',seeds=(process.argv[4]??'7,11,23').split(',').map(Number),names=(process.argv[5]??'default,no-E,no-R,cooldown-fast,cooldown-slow,no-summons').split(',');
if(!(duration>0&&duration<=3600&&seeds.every(Number.isSafeInteger)))throw Error('Invalid duration or seeds');
const frozen=JSON.parse(readFileSync(new URL('../config/gameBalance.json',import.meta.url))),runs=[];
const arms={'default':{},'no-E':{disabledSlot:'E'},'no-R':{disabledSlot:'R'},'cooldown-fast':{cooldownFactor:.8},'cooldown-slow':{cooldownFactor:1.5},'no-summons':{summonCap:0}};
for(const variant of names)for(const seed of seeds){
 if(!arms[variant])throw Error(`Unknown arm ${variant}`);const policy=arms[variant],balance=structuredClone(frozen);balance.experiment={name:variant,...policy,meaning:'Each arm changes one skill policy; skills remain otherwise enabled. Same seed does not hold encounter trajectories fixed.'};balance.abilitySkills.overrides??={};
 if(policy.cooldownFactor)for(const [id,skill]of Object.entries(SKILL_CATALOG))balance.abilitySkills.overrides[id]={...balance.abilitySkills.overrides[id],cooldown:skill.cooldown*policy.cooldownFactor};
 if(policy.summonCap===0)balance.abilitySkills.overrides['green-summon']={...balance.abilitySkills.overrides['green-summon'],summonCount:0};
 const g=createGame(seed,balance);g.options.collect=false;g.ecology.collect=false;if(policy.disabledSlot){const original=g.abilities.canCast.bind(g.abilities);g.abilities.canCast=(e,slot='R')=>slot!==policy.disabledSlot&&original(e,slot);}
 g.autoplay.setEnabled(true);g.balanceLog=new BalanceMetrics(g,variant);g.balanceLog.observe();for(let i=1;i<=duration*30&&!g.gameOver;i++){g.update(1/30);if(i%150===0)g.balanceLog.observe();}
 runs.push(g.balanceLog.export());writeFileSync(output,JSON.stringify({format:'ball-next-balance-v1',policy:'Skill policy sweep; normal lives, no replenishment, 30Hz, sample5s. Config frozen at launch.',requestedSeconds:duration,runs}));process.stderr.write(`${variant} seed${seed}: ${g.gameTime.toFixed(0)}s Size${g.player.size.toFixed(1)}\n`);
}
