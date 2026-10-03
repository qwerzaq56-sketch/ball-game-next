// Uses actual gameplay lives; duration ends naturally at Game Over.
import {createGame} from './headless.mjs';
const seconds=Number(process.argv[2]??600),seeds=(process.argv[3]??'7,11,23').split(',').map(Number);
if(!(seconds>0&&seconds<=3600&&seeds.every(Number.isInteger)))throw Error('Provide seconds (1–3600) and comma-separated integer seeds');
const results=[];
for(const seed of seeds){
 const g=createGame(seed);g.autoplay.setEnabled(true);let firstApex=null;
 for(let frame=0;frame<seconds*60&&!g.gameOver;frame++){g.update(1/60);if(g.player.apex&&firstApex===null)firstApex=g.gameTime;}
 results.push({seed,policy:g.autoplay.policy,lifePolicy:'ordinary gameplay; no replenishment',requestedSeconds:seconds,actualSeconds:+g.gameTime.toFixed(3),stop:g.gameOver?'game-over':'duration',lives:g.lives,size:+g.player.size.toFixed(2),score:g.player.score,defeats:g.player.defeatSerial??0,firstPlayerApexSeconds:firstApex===null?null:+firstApex.toFixed(3),apexDynamics:g.apexHistory.summary(g.gameTime),relicPickups:g.relics.pickups,attacks:g.runMetrics.attackStarts,byPhase:g.runMetrics.export(g).byPhase,samples:g.runMetrics.samples});
}
console.log(JSON.stringify({format:'autoplay-measure-v1',results},null,2));
