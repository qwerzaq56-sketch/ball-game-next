// R-WORLD-017: compare terrain counts per round with the autoplay policy so the default can be chosen from data.
// Usage: node tools/terrain-count-compare.mjs [seconds=300] [counts=2,3,4,5] [seeds=7,11,23]
import fs from 'node:fs';
import {createGame} from './headless.mjs';
const seconds=Number(process.argv[2]??300),counts=(process.argv[3]??'2,3,4,5').split(',').map(Number),seeds=(process.argv[4]??'7,11,23').split(',').map(Number);
if(!(seconds>0&&seconds<=3600&&counts.every(Number.isInteger)&&seeds.every(Number.isInteger)))throw Error('Provide seconds (1–3600), comma-separated terrain counts and integer seeds');
const base=JSON.parse(fs.readFileSync(new URL('../config/gameBalance.json',import.meta.url))).biomes;
const rows=[];
for(const count of counts)for(const seed of seeds){
 const g=createGame(seed,{biomes:{...base,terrainsPerRound:count}});g.autoplay.setEnabled(true);
 const time={},lives=g.lives;let sample=0;
 for(let frame=0;frame<seconds*60&&!g.gameOver;frame++){g.update(1/60);if(++sample>=60){sample=0;const id=g.biomes.regionAt(g.player)?.id??'none';time[id]=(time[id]??0)+1;}}
 rows.push({count,seed,terrains:g.biomes.regions.map(r=>r.id),seconds:+g.gameTime.toFixed(1),stop:g.gameOver?'game-over':'duration',livesLost:lives-g.lives,size:+g.player.size.toFixed(1),score:g.player.score,regionSeconds:time,objects:g.biomeObjects.objects.length});
}
const summary=counts.map(count=>{const r=rows.filter(x=>x.count===count),mean=k=>+(r.reduce((s,x)=>s+x[k],0)/r.length).toFixed(2);return {count,meanSize:mean('size'),meanLivesLost:mean('livesLost'),meanScore:mean('score'),regionsVisited:+(r.reduce((s,x)=>s+Object.keys(x.regionSeconds).length,0)/r.length).toFixed(2)};});
console.log(JSON.stringify({format:'terrain-count-compare-v1',seconds,counts,seeds,summary,rows},null,2));
