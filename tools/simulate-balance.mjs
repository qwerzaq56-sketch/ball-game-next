import {readFileSync,writeFileSync} from 'node:fs';
import {createGame} from './headless.mjs';
import {BalanceMetrics} from '../js/balanceMetrics.js';
const duration=Number(process.argv[2]??300),output=process.argv[3]??'reports/M41-balance.json',baseline=JSON.parse(readFileSync(process.argv[4]??'reports/M41-baseline-config.json'));
const candidate=JSON.parse(readFileSync(process.argv[7]??new URL('../config/gameBalance.json',import.meta.url)));
const runs=[];
for(const variant of (process.argv[5]??'baseline,M41').split(','))for(const seed of (process.argv[6]??'7,11,23').split(',').map(Number)){
 const g=createGame(seed,variant==='baseline'?structuredClone(baseline):structuredClone(candidate));if(variant==='M41-growth'||variant==='M41-absorb95'){g.balance.killReward.retainedGrowthFraction=0;g.balance.killReward.growthPerSize=0;}if(variant==='M41-absorb95')g.balance.absorption.areaEfficiency=.95;g.options.collect=false;g.autoplay.setEnabled(true);g.balanceLog=new BalanceMetrics(g,variant);
 g.balanceLog.observe();for(let i=1;i<=duration*30&&!g.gameOver;i++){g.update(1/30);if(i%150===0)g.balanceLog.observe();}
 const result=g.balanceLog.export();runs.push(result);process.stderr.write(`${variant} seed ${seed}: ${g.gameTime.toFixed(0)}s player=${g.player.size.toFixed(1)} max=${result.timeline.at(-1).maxSize.toFixed(1)}\n`);
 writeFileSync(output,JSON.stringify({format:'ball-next-balance-v1',policy:'normal-life survival autoplay, all living AI, 30Hz; sample 5s; 20s bins',requestedSeconds:duration,runs}));
}
