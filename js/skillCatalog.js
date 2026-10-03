import {skillOverrides} from './skillRules.js';
// Stable candidate IDs: selections affect future casts; existing casts keep their snapshot.
export const SKILL_CATALOG = {
 'cyan-chill':{color:'cyan',slot:'E',name:'냉기 찌르기',effect:'chill',windup:.25,cooldown:7,radius:200,damage:.35,freezeSeconds:.35},
 'blue-ripple':{color:'blue',slot:'E',name:'파도 밀치기',effect:'ripple',windup:.3,cooldown:8,radius:240,damage:.4,pushDuration:.15,pushSpeed:400},
 'green-invite':{color:'green',slot:'E',name:'동행 초대',effect:'invite',windup:.3,cooldown:9,radius:350,acceptChance:.8,buffDuration:30,buffDamage:.05,buffDefense:.05,buffStackCap:5},
 'red-embers':{color:'red',slot:'E',name:'불씨 장판',effect:'embers',windup:.25,cooldown:9,radius:260,fieldDuration:5,tickInterval:.5,damage:.65},
 'red-muster':{color:'red',slot:'R',name:'혈족 집결',effect:'muster',windup:.6,cooldown:16,gatherDuration:3,buffDuration:8,buffDamage:.3,buffSpeed:1.25},
 'red-vigor':{color:'red',slot:'E',name:'사냥 박동',effect:'vigor',windup:.25,cooldown:9,radius:260,buffDuration:4,buffDamage:.15,buffSpeed:1.12},
 'yellow-dust':{color:'yellow',slot:'E',name:'먼지 장막',effect:'dust',windup:.3,cooldown:9,buffDuration:3,missChance:.15},
 'cyan-freeze':{color:'cyan',slot:'R',name:'냉기 휘두르기',effect:'legacy',windup:.6,cooldown:10,radius:260,damage:.5,freezeSeconds:1},
 'blue-trident':{color:'blue',slot:'R',name:'삼중 파도',effect:'legacy',windup:.6,cooldown:10,length:400,width:180,damage:.5,pushDuration:.2,pushSpeed:600,waveDuration:.5,commandDuration:4,commandRadius:350},
 'green-summon':{color:'green',slot:'R',name:'숲의 부름',effect:'summon',windup:.5,cooldown:18,radius:350,summonCount:2,summonAbsorbDelay:30,summonSizeFraction:.16,summonSizeVariation:.2,summonSizeCapFraction:.2,summonAttackInheritance:.5,buffDuration:5,buffDamage:.15},
 'green-morale':{color:'green',slot:'R',name:'사기 진작 (복구 후보)',effect:'legacy',windup:.5,cooldown:12,radius:350,buffDuration:5,buffDamage:.15},
 'red-rally':{color:'red',slot:'R',name:'사냥 지휘',effect:'legacy',windup:.8,cooldown:12,radius:250,castRange:350,buffRadius:450,buffDuration:6,buffDamage:.3,buffSpeed:1.25},
 'yellow-storm':{color:'yellow',slot:'R',name:'모래바람',effect:'legacy',windup:.8,cooldown:14,radius:360,castRange:350,fieldDuration:5,tickInterval:.25,hpFraction:.2,missChance:.25},
};
export const DEFAULT_SKILLS={cyan:{E:'cyan-chill',R:'cyan-freeze'},blue:{E:'blue-ripple',R:'blue-trident'},green:{E:'green-invite',R:'green-summon'},red:{E:'red-embers',R:'red-muster'},yellow:{E:'yellow-dust',R:'yellow-storm'}};
export function selectedSkill(balance,color,slot){const selected=balance.abilitySkills?.loadout?.[color]?.[slot]??DEFAULT_SKILLS[color]?.[slot],valid=SKILL_CATALOG[selected]?.color===color&&SKILL_CATALOG[selected]?.slot===slot,id=valid?selected:DEFAULT_SKILLS[color]?.[slot],base=SKILL_CATALOG[id];return {...base,...skillOverrides(id,balance.abilitySkills?.overrides?.[id],base),id};}
export function apexTerritoryRadius(e,balance){return 900*Math.sqrt(Math.max(100,e.size)/100)*(balance.abilitySkills?.territoryMultiplier??1);}

export function scaledSkill(balance,e,slot){
 const cfg=selectedSkill(balance,e.color,slot),scale=Math.max(.6,e.size/(balance.abilitySkills?.rangeReferenceSize??100));
 for(const key of ['radius','length','width','castRange','buffRadius','commandRadius'])if(Number.isFinite(cfg[key]))cfg[key]*=scale;
 if(cfg.effect==='embers')cfg.radius=Math.max(cfg.radius,e.size/2+100);
 if(cfg.effect==='muster')cfg.radius=apexTerritoryRadius(e,balance);
 if(e.color==='green'&&slot==='E')cfg.radius=Math.max(cfg.radius,balance.ai.detectionRange*.65+Math.max(0,e.size-40)*.65);
 return cfg;
}
