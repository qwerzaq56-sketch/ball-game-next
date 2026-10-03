import {createGame} from './headless.mjs';
import {evaluationSummary} from '../js/gameplayEvaluation.js';
const seconds=Number(process.argv[2]??60),results=[];
for(const size of [20,40,80,160])for(const seed of [7,11,23]){
 const g=createGame(seed),p=g.player;p.growth=Math.pow(Math.max(0,size-p.baseSize)/g.balance.growth.growthToSizeRatio,2);p.refreshFromGrowth(g.balance);p._recomputeStacks(g.balance,false);g.autoplay.setEnabled(true);
 const initialSize=p.size;
 for(let i=0;i<seconds*30&&!g.gameOver;i++)g.update(1/30);
 const summary=evaluationSummary(g.runMetrics.samples,g.balance.evaluation);
 results.push({seed,initialSize,actualSeconds:g.gameTime,finalSize:p.size,netSizeGain:p.size-initialSize,netSizeGainPerSecond:(p.size-initialSize)/g.gameTime,defeats:p.defeatSerial??0,summary});
}
console.log(JSON.stringify({policy:'controlled initial sizes; local survival autoplay; normal lives; no replenishment',requestedSeconds:seconds,results},null,2));
