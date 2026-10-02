import { Game } from '../js/game.js';
import fs from 'node:fs';
export function createGame(seed, overrides = {}) {
  globalThis.window = {};
  const balance = JSON.parse(fs.readFileSync(new URL('../config/gameBalance.json', import.meta.url)));
  Object.assign(balance, overrides);
  const canvas = {width:1280,height:720,getContext:()=>({})};
  const input = {keys:new Set(),mouseX:640,mouseY:360,mouseDown:false,consumeDodge:()=>false};
  const ui = {showUnlock(){},showDefeatMessage(){}};
  return new Game(balance,canvas,input,ui,{seed,collect:true});
}
export function run(seed, seconds = 600, overrides = {}) {
  const game = createGame(seed, overrides);
  for (let i = 0; i < seconds * 60 && !game.gameOver; i++) game.update(1/60);
  return {seed,policy:'stationary-v1',dt:1/60,requestedSeconds:seconds,actualSeconds:game.gameTime,
    events:{ecology:game.ecology.events,abilities:game.abilities.events,era:game.era.events},
    stopped:game.gameOver ? 'game-over' : 'duration',config:game.balance,snapshots:game.telemetry,checkpoint:game.snapshot()};
}
