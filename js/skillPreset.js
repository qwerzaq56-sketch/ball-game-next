import {SKILL_CATALOG,DEFAULT_SKILLS} from './skillCatalog.js';
import {SKILL_RULES} from './skillRules.js';
export {SKILL_RULES} from './skillRules.js';
export const PRESET_STORAGE_KEY='ball-next-skill-preset-v1';
const colors=Object.keys(DEFAULT_SKILLS),object=value=>value&&typeof value==='object'&&!Array.isArray(value);

export function defaultSkillPreset(){return {format:'ball-next-skills-preset-v1',settings:{unlockSize:100,territoryMultiplier:1,attackTimingSizeScale:200/350},loadout:structuredClone(DEFAULT_SKILLS),overrides:{}};}
function number(value,rule,name){if(typeof value!=='number'||!Number.isFinite(value)||value<rule.min||value>rule.max||name==='summonCount'&&!Number.isInteger(value))throw Error(`${name}: ${rule.min}~${rule.max} 범위의 숫자가 필요합니다.`);return value;}
export function normalizeSkillPreset(input){
 if(!object(input)||input.format!=='ball-next-skills-preset-v1')throw Error('스킬 프리셋 v1 JSON이 필요합니다.');
 for(const key of Object.keys(input))if(!['format','settings','loadout','overrides'].includes(key))throw Error(`알 수 없는 항목: ${key}`);
 const out=defaultSkillPreset(),settings=input.settings??{},loadout=input.loadout??{},overrides=input.overrides??{};
 if(!object(settings)||!object(loadout)||!object(overrides))throw Error('설정·후보·수치는 객체여야 합니다.');
 const settingsRules={unlockSize:{min:40,max:500},territoryMultiplier:{min:.5,max:2},attackTimingSizeScale:{min:.2,max:2}};
 for(const [key,value]of Object.entries(settings)){if(!settingsRules[key])throw Error(`알 수 없는 설정: ${key}`);out.settings[key]=number(value,settingsRules[key],key);}
 for(const [color,slots]of Object.entries(loadout)){if(!colors.includes(color)||!object(slots))throw Error(`알 수 없는 종족: ${color}`);for(const [slot,id]of Object.entries(slots)){if(!['E','R'].includes(slot)||SKILL_CATALOG[id]?.color!==color||SKILL_CATALOG[id]?.slot!==slot)throw Error(`${color} ${slot}: 맞는 실행 후보가 필요합니다.`);out.loadout[color][slot]=id;}}
 for(const [id,fields]of Object.entries(overrides)){const base=SKILL_CATALOG[id];if(!base||!object(fields))throw Error(`알 수 없는 후보: ${id}`);const values={};for(const [key,value]of Object.entries(fields)){if(!SKILL_RULES[key]||typeof base[key]!=='number')throw Error(`${id}: 지원하지 않는 수치 ${key}`);values[key]=number(value,SKILL_RULES[key],key);}if((values.summonMinSize??base.summonMinSize)>(values.summonMaxSize??base.summonMaxSize))throw Error('소환 최소 크기는 최대 크기 이하여야 합니다.');out.overrides[id]=values;}
 return out;
}
export function skillPresetFromBalance(balance){return normalizeSkillPreset({format:'ball-next-skills-preset-v1',settings:{unlockSize:balance.abilitySkills?.unlockSize??100,territoryMultiplier:balance.abilitySkills?.territoryMultiplier??1,attackTimingSizeScale:balance.combatScaling.attackTimingSizeScale??1},loadout:balance.abilitySkills?.loadout??DEFAULT_SKILLS,overrides:balance.abilitySkills?.overrides??{}});}
export function applySkillPreset(balance,input){const p=normalizeSkillPreset(input);balance.abilitySkills={...balance.abilitySkills,unlockSize:p.settings.unlockSize,territoryMultiplier:p.settings.territoryMultiplier,loadout:p.loadout,overrides:p.overrides};balance.combatScaling.attackTimingSizeScale=p.settings.attackTimingSizeScale;return p;}
export function loadSavedSkillPreset(balance,storage){try{const saved=(storage??globalThis.localStorage)?.getItem(PRESET_STORAGE_KEY);if(saved)applySkillPreset(balance,JSON.parse(saved));return null;}catch(error){return `저장한 스킬 설정을 불러오지 못해 기본 설정을 사용합니다: ${error.message}`;}}
