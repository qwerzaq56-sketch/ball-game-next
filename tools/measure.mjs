import { run } from './headless.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const count = Number(process.argv[2] ?? 10), seconds = Number(process.argv[3] ?? 600);
const commit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const diff = execFileSync('git',['diff','HEAD'],{encoding:'utf8'});
const results = [];
for(let seed=1;seed<=count;seed++) {
  const started = performance.now();
  const result = run(seed,seconds);
  result.wallSeconds=(performance.now()-started)/1000;
  results.push(result);
  console.log(JSON.stringify({seed,time:result.actualSeconds,stop:result.stopped,wall:result.wallSeconds}));
}
fs.writeFileSync('reports/measurement.json',JSON.stringify({commit,diff,environment:{node:process.version,platform:process.platform,arch:process.arch},results}));
fs.writeFileSync('reports/measurement.csv','seed,game_seconds,stop,ai,food,player_size,wall_seconds\n'+results.map(r=>[r.seed,r.actualSeconds,r.stopped,r.checkpoint.ai,r.checkpoint.food,r.checkpoint.playerSize,r.wallSeconds].join(',')).join('\n')+'\n');
