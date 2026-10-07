import {readFileSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGame} from './headless.mjs';
import {BalanceMetrics} from '../js/balanceMetrics.js';
const config=JSON.parse(readFileSync(new URL('../config/gameBalance.json',import.meta.url))),duration=Number(process.argv[2]??600),output=new URL('../reports/M57-current-balance.json',import.meta.url);
if(process.argv[3]==='--worker'){
 const color=process.argv[4],seed=Number(process.argv[5]),g=createGame(seed,structuredClone(config));g.options.profile={name:'Simulation',color};g.options.collect=false;g.reset();g.autoplay.setEnabled(true);g.balanceLog=new BalanceMetrics(g,`M57-${color}`);g.balanceLog.observe();
 for(let frame=1;frame<=duration*30&&!g.gameOver;frame++){g.update(1/30);if(frame%150===0)g.balanceLog.observe();if(frame%1800===0)console.log(`${color} seed ${seed}: ${g.gameTime.toFixed(0)} / ${duration}s`);}
 if(g.balanceLog.timeline.at(-1).time<g.gameTime-1e-6)g.balanceLog.observe();writeFileSync(process.argv[6],JSON.stringify(g.balanceLog.export()));
}else{
 writeFileSync(new URL('../reports/M57-current-config.json',import.meta.url),JSON.stringify(config,null,2));
 const runs=[]; // Always rerun: matching config alone cannot identify changed simulation code.
 const jobs=['blue','green'].flatMap(color=>[7,23,701].map(seed=>({color,seed}))).filter(j=>!runs.some(r=>r.variant===`M57-${j.color}`&&r.seed===j.seed));
 const save=()=>writeFileSync(output,JSON.stringify({format:'ball-next-balance-v1',policy:'M57 blue/green normal-life survival autoplay, all living AI; 30Hz, 5s observations; autoplay uses instant uncharged attacks, not human charge timing',requestedSeconds:duration,runs:runs.sort((a,b)=>a.variant.localeCompare(b.variant)||a.seed-b.seed)}));
 async function worker(){for(let j;(j=jobs.shift());){const file=join(tmpdir(),`M57-${j.color}-${j.seed}.json`);await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(import.meta.url),String(duration),'--worker',j.color,String(j.seed),file],{stdio:['ignore','inherit','inherit']});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`worker exited ${code}`)));});const r=JSON.parse(readFileSync(file));runs.push(r);save();console.log(`DONE ${r.variant} seed ${r.seed}: ${r.seconds.toFixed(0)}s, size ${r.timeline.at(-1).playerSize.toFixed(1)}, defeats ${r.defeats}`);}}
 await Promise.all([worker(),worker(),worker()]);save();
}
