export const OBJECT_REGIONS={grassland:'초원',forest:'숲',lake:'호수',snow:'설원',desert:'사막',volcano:'화산'};
export const BIOME_OBJECTS={
 'grass-flowers':{region:'grassland',name:'꽃무리',effect:'food',radius:55,cooldown:12,count:3,growth:45},
 'grass-windstone':{region:'grassland',name:'바람돌',effect:'speed',radius:65,cooldown:8,duration:4,power:.25},
 'forest-berries':{region:'forest',name:'열매 덤불',effect:'food',radius:60,cooldown:14,count:4,growth:50},
 'forest-tree':{region:'forest',name:'수호 고목',effect:'shield',radius:75,cooldown:12,duration:6,power:.08},
 'lake-pearls':{region:'lake',name:'진주 조개밭',effect:'food',radius:55,cooldown:16,count:3,growth:80},
 'lake-spring':{region:'lake',name:'맑은 샘',effect:'heal',radius:75,cooldown:8,power:.06},
 'snow-flowers':{region:'snow',name:'얼음꽃 군락',effect:'food',radius:60,cooldown:16,count:3,growth:65,blizzardMultiplier:2},
 'snow-shelter':{region:'snow',name:'서리 피난석',effect:'frost',radius:80,cooldown:10,duration:8,power:.15},
 'desert-oasis':{region:'desert',name:'작은 오아시스',effect:'heal',radius:80,cooldown:10,power:.05},
 'desert-obelisk':{region:'desert',name:'모래 비석',effect:'shield',radius:65,cooldown:14,duration:6,power:.1},
 'volcano-obsidian':{region:'volcano',name:'흑요석 광맥',effect:'food',radius:55,cooldown:18,count:4,growth:85},
 'volcano-vent':{region:'volcano',name:'열기 분출구',effect:'speed',radius:65,cooldown:10,duration:4,power:.35,hpCost:.01},
};
export const OBJECT_PRESET_KEY='ball-next-biome-objects-v1';
export function defaultObjectPreset(){return {format:'ball-next-objects-v1',countPerType:6,enabled:Object.keys(BIOME_OBJECTS),overrides:{}};}
export function normalizeObjectPreset(raw){
 if(!raw||raw.format!=='ball-next-objects-v1'||!Array.isArray(raw.enabled)||!Number.isInteger(raw.countPerType)||raw.countPerType<1||raw.countPerType>20)throw Error('올바른 오브젝트 프리셋이 필요합니다.');
 const enabled=[...new Set(raw.enabled)];if(enabled.some(id=>!Object.hasOwn(BIOME_OBJECTS,id)))throw Error('알 수 없는 오브젝트 후보입니다.');
 const overrides={};for(const [id,values]of Object.entries(raw.overrides??{})){const base=BIOME_OBJECTS[id];if(!Object.hasOwn(BIOME_OBJECTS,id)||!base||!values||typeof values!=='object'||Array.isArray(values))throw Error('잘못된 후보 수치입니다.');overrides[id]={};for(const [key,value]of Object.entries(values)){const bounds={radius:[20,250],cooldown:[2,120],count:[1,8],growth:[1,500],duration:[1,30],power:[.01,.5],hpCost:[0,.1],blizzardMultiplier:[1,3]}[key];if(!bounds||!Object.hasOwn(base,key)||!Number.isFinite(value)||value<bounds[0]||value>bounds[1]||key==='count'&&!Number.isInteger(value))throw Error(`잘못된 수치: ${id}.${key}`);overrides[id][key]=value;}}
 return {format:raw.format,countPerType:raw.countPerType,enabled,overrides};
}
export function objectPreset(balance){return normalizeObjectPreset(balance.biomeObjects??defaultObjectPreset());}
export function applyObjectPreset(balance,raw){const next=normalizeObjectPreset(raw);balance.biomeObjects=next;return next;}
export function loadObjectPreset(balance){try{const value=globalThis.localStorage?.getItem(OBJECT_PRESET_KEY);if(value)applyObjectPreset(balance,JSON.parse(value));}catch{/* Malformed local settings keep shipped defaults. */}}
