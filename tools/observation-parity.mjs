import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]??'.'),seconds=Number(process.argv[3]??600);
const {createGame}=await import(pathToFileURL(resolve(root,'tools/headless.mjs')));const {random}=await import(pathToFileURL(resolve(root,'js/random.js')));
const g=createGame(23);g.autoplay.setEnabled(true);for(let i=0;i<seconds*60&&!g.gameOver;i++)g.update(1/60);
const snapshot=g.snapshot();delete snapshot.observation;
console.log(JSON.stringify({snapshot,ecology:g.ecology.events,abilities:g.abilities.events,era:g.era.events,ally:g.allyLinks.stats,rng:{world:random('world'),ai:random('ai'),physics:random('physics')}}));
