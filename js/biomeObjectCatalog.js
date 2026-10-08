export const OBJECT_REGIONS={grassland:'초원',forest:'숲',lake:'호수',snow:'설원',desert:'사막',volcano:'화산'};
export const ARCHIVED_BIOME_OBJECTS={
 'grass-flowers':{region:'grassland',name:'꽃무리',effect:'food',radius:55,cooldown:12,count:3,growth:45},
 'grass-windstone':{region:'grassland',name:'바람돌',effect:'speed',radius:65,cooldown:8,duration:4,power:.25},
 'forest-berries':{region:'forest',name:'열매 덤불',effect:'food',radius:60,cooldown:14,count:4,growth:50},
 'forest-tree':{region:'forest',name:'수호 고목',effect:'shield',radius:125,cooldown:12,duration:6,power:.08,visualScale:1.6,placed:5},
 'lake-pearls':{region:'lake',name:'진주 조개밭',effect:'food',radius:55,cooldown:16,count:3,growth:80},
 'lake-spring':{region:'lake',name:'맑은 샘',effect:'heal',radius:75,cooldown:8,power:.06},
 'snow-flowers':{region:'snow',name:'얼음꽃 군락',effect:'food',radius:76,cooldown:16,count:3,growth:65,blizzardMultiplier:2},
 'snow-shelter':{region:'snow',name:'서리 피난석',effect:'frost',radius:182,cooldown:10,duration:8,power:.15,visualScale:2},
 'desert-oasis':{region:'desert',name:'작은 오아시스',effect:'heal',radius:160,cooldown:10,power:.05,visualScale:1.89},
 'desert-obelisk':{region:'desert',name:'모래 비석',effect:'shield',radius:82,cooldown:14,duration:6,power:.1,visualScale:1.29},
 'volcano-obsidian':{region:'volcano',name:'흑요석 광맥',effect:'food',radius:55,cooldown:18,count:4,growth:85},
 'volcano-vent':{region:'volcano',name:'열기 분출구',effect:'speed',radius:65,cooldown:10,duration:4,power:.35,hpCost:.01},
};
export const BIOME_OBJECTS={
 ...ARCHIVED_BIOME_OBJECTS,
 'grass-garland':{region:'grassland',name:'꽃무리 · 꽃 치장',effect:'charm',radius:65,cooldown:12,duration:30,power:.15},
 'grass-wind-stack':{region:'grassland',name:'바람돌 · 이속 버프',effect:'wind-stack',radius:65,cooldown:8,stacksRequired:1,duration:15,power:.35,placed:3},
 'forest-berry-grove':{region:'forest',name:'열매 덤불 · 먹이/회복',effect:'berry-spawner',radius:70,cooldown:14,count:4,growth:50,healFraction:.08,visualScale:.74},
 'lake-garland':{region:'lake',name:'진주 조개밭 · 조개 치장',effect:'charm',radius:68,cooldown:16,duration:30,power:.2},
 'volcano-obsidian-stack':{region:'volcano',name:'흑요석 광맥 · 보호막',effect:'obsidian',radius:80,cooldown:12,stacksRequired:3,duration:20,power:.08,shieldFraction:.12},
 'volcano-vent-cycle':{region:'volcano',name:'열기 분출구 · 주기 분출',effect:'vent',radius:149,cooldown:2,activeDuration:4,cycleDuration:12,tickInterval:.5,hpFraction:.025,visualScale:2},
 'lake-current':{region:'lake',name:'해류',effect:'current',radius:100,cooldown:2,speed:100,widthMin:80,widthMax:160,pathSteps:3,placed:3,edgeMargin:400},
 'lake-vortex':{region:'lake',name:'소용돌이',effect:'vortex',radius:224,cooldown:2,speed:95,placed:2,visualScale:1.24},
};
export const DEFAULT_OBJECT_IDS=['grass-garland','grass-wind-stack','forest-berry-grove','forest-tree','lake-garland','lake-current','lake-vortex','snow-flowers','snow-shelter','desert-oasis','desert-obelisk','volcano-obsidian-stack','volcano-vent-cycle'];
// R-WORLD-015: the oasis heals twice its catalog power once placed (fewer, larger oases).
export function placedObjectConfig(id,cfg){return id==='desert-oasis'?{...cfg,power:cfg.power*2}:cfg;}
export const OBJECT_PRESET_KEY='ball-next-biome-objects-v1';
// v3 (object bench, planning 03_아트/32): per-object body and placement keys that BIOME_OBJECTS does not carry.
// visualScale/aspect: drawn body only (aspect stretches width); placed: instances in the region;
// edgeMargin/spacing/lavaMargin: placement clearance from the region border, from earlier-placed objects and from lava.
export const PLACEMENT_BOUNDS=Object.freeze({visualScale:[.3,4],aspect:[.5,2],placed:[1,20],edgeMargin:[0,400],spacing:[0,800],lavaMargin:[0,400]});
// Catalog keys an override may change (only when the object has that key).
export const OVERRIDE_BOUNDS=Object.freeze({radius:[20,250],cooldown:[2,120],count:[1,8],growth:[1,500],duration:[1,30],power:[.01,.5],hpCost:[0,.1],blizzardMultiplier:[1,3],stacksRequired:[1,10],healFraction:[.01,.3],shieldFraction:[.01,.5],activeDuration:[1,20],cycleDuration:[2,60],tickInterval:[.1,2],hpFraction:[.001,.1],speed:[20,300],widthMin:[40,220],widthMax:[40,250],pathSteps:[1,6]});
export const INTEGER_KEYS=Object.freeze(['count','stacksRequired','pathSteps','placed']);
export function defaultPlacedCount(id,countPerType){return ['lake-current','lake-vortex'].includes(id)?Math.max(1,Math.ceil(countPerType/6)):id==='desert-oasis'?Math.max(1,Math.ceil(countPerType/3)):countPerType;}
export function defaultObjectPreset(){return {format:'ball-next-objects-v3',countPerType:6,enabled:[...DEFAULT_OBJECT_IDS],overrides:{}};}
export function normalizeObjectPreset(raw){
 if(!raw||!['ball-next-objects-v1','ball-next-objects-v2','ball-next-objects-v3'].includes(raw.format)||!Array.isArray(raw.enabled)||!Number.isInteger(raw.countPerType)||raw.countPerType<1||raw.countPerType>20)throw Error('올바른 오브젝트 프리셋이 필요합니다.');
 const replacements={'grass-flowers':['grass-garland'],'grass-windstone':['grass-wind-stack'],'forest-berries':['forest-berry-grove'],'lake-pearls':['lake-garland'],'lake-spring':['lake-current','lake-vortex'],'volcano-obsidian':['volcano-obsidian-stack'],'volcano-vent':['volcano-vent-cycle']};
 const enabled=[...new Set(raw.format==='ball-next-objects-v1'?raw.enabled.flatMap(id=>Object.hasOwn(replacements,id)?replacements[id]:[id]):raw.enabled)];if(enabled.some(id=>!Object.hasOwn(BIOME_OBJECTS,id)))throw Error('알 수 없는 오브젝트 후보입니다.');
 const overrides={};for(const [id,values]of Object.entries(raw.overrides??{})){const base=BIOME_OBJECTS[id];if(!Object.hasOwn(BIOME_OBJECTS,id)||!base||!values||typeof values!=='object'||Array.isArray(values))throw Error('잘못된 후보 수치입니다.');overrides[id]={};for(const [key,value]of Object.entries(values)){const placement=Object.hasOwn(PLACEMENT_BOUNDS,key)?PLACEMENT_BOUNDS[key]:null,bounds=placement??(Object.hasOwn(OVERRIDE_BOUNDS,key)?OVERRIDE_BOUNDS[key]:null);if(!bounds||!placement&&!Object.hasOwn(base,key)||!Number.isFinite(value)||value<bounds[0]||value>bounds[1]||INTEGER_KEYS.includes(key)&&!Number.isInteger(value))throw Error(`잘못된 수치: ${id}.${key}`);overrides[id][key]=value;}}
 for(const [id,c]of Object.entries(BIOME_OBJECTS)){const v={...c,...overrides[id]};if(v.effect==='vent'&&v.activeDuration>=v.cycleDuration)throw Error('분출 시간은 전체 주기보다 짧아야 합니다.');if(v.effect==='current'&&v.widthMin>v.widthMax)throw Error('최소 폭은 최대 폭보다 작아야 합니다.');}
 return {format:'ball-next-objects-v3',countPerType:raw.countPerType,enabled,overrides};
}
export function objectPreset(balance){return normalizeObjectPreset(balance.biomeObjects??defaultObjectPreset());}
export function applyObjectPreset(balance,raw){const next=normalizeObjectPreset(raw);balance.biomeObjects=next;return next;}
export function loadObjectPreset(balance){try{const value=globalThis.localStorage?.getItem(OBJECT_PRESET_KEY);if(value)applyObjectPreset(balance,JSON.parse(value));}catch{/* Malformed local settings keep shipped defaults. */}}
