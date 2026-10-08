// Small non-interactive ground decals (planning 00_기준/master/데칼.md, user request 2026-10-08 "데칼 마스터").
// Presentation only: no rewards, collisions, AI targets or gameplay RNG. Placement is a hash of the
// 200-unit terrain tile, so the same seed always shows the same decals (R-VIS-001).
// src is relative to assets/art-packs/. Entries without src are planned decals that are not made yet;
// they are listed so the decal bench and the master doc show the whole production list.
export const DECALS=Object.freeze({
 'forest-leaf':{region:'forest',name:'낙엽',src:'forest-raster-v1/decal-001.svg'},
 'forest-twig':{region:'forest',name:'잔가지',src:'forest-raster-v1/decal-002.svg'},
 'forest-pebble':{region:'forest',name:'자갈',src:'forest-raster-v1/decal-003.svg'},
 'forest-moss':{region:'forest',name:'이끼'},
 'grass-short':{region:'grassland',name:'짧은 풀'},
 'grass-petals':{region:'grassland',name:'꽃잎'},
 'grass-dirt':{region:'grassland',name:'흙 얼룩'},
 'lake-weed':{region:'lake',name:'수초'},
 'lake-drift':{region:'lake',name:'물가 잔해'},
 'snow-tracks':{region:'snow',name:'눈 자국'},
 'snow-ice':{region:'snow',name:'얼음 조각'},
 'desert-stone':{region:'desert',name:'작은 돌'},
 'desert-dry-grass':{region:'desert',name:'마른 풀'},
 'volcano-ash':{region:'volcano',name:'재'},
 'volcano-shard':{region:'volcano',name:'암석 파편'},
});
// Per region: chance a 200-unit tile carries one decal, its world size range [min,max) and the inset from the tile edge.
// forest is the 2026-10-06 placement (one tile in three, 18~30, inset 35); others start at the same values.
export const DECAL_LAYOUT=Object.freeze({
 forest:{chance:1/3,size:[18,30],inset:35},
 grassland:{chance:1/3,size:[18,30],inset:35},
 lake:{chance:1/3,size:[18,30],inset:35},
 snow:{chance:1/3,size:[18,30],inset:35},
 desert:{chance:1/3,size:[18,30],inset:35},
 volcano:{chance:1/3,size:[18,30],inset:35},
});
export const DECAL_BOUNDS=Object.freeze({chance:[0,1],size:[6,120],inset:[0,90]});
export const DECAL_TILE=200;
export const madeDecals=(region)=>Object.entries(DECALS).filter(([,d])=>d.region===region&&d.src).map(([id])=>id);
// One decal (or null) for the tile whose corner is (x,y). layout overrides come from the decal bench preview.
export function decalAt(region,x,y,layout=DECAL_LAYOUT[region],ids=madeDecals(region)){
 if(!layout||!ids.length)return null;
 const h=(Math.imul(x/DECAL_TILE,73856093)^Math.imul(y/DECAL_TILE,19349663))>>>0;
 // forest keeps its original test (h%3===0) so existing captures stay identical.
 if(layout.chance===1/3?h%3!==0:(h%10007)/10007>=layout.chance)return null;
 const inset=layout.inset,span=Math.max(1,DECAL_TILE-2*inset),[min,max]=layout.size;
 return {id:ids[(h>>>5)%ids.length],x:x+inset+(h>>>8)%span,y:y+inset+(h>>>16)%span,size:min+(h>>>24)%Math.max(1,max-min)};
}
