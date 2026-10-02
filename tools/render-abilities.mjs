import {createRequire} from 'node:module';
import fs from 'node:fs';
import {createGame} from './headless.mjs';
import {AIEntity} from '../js/ai.js';
const require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/\u0040napi-rs/canvas');
const sheet=createCanvas(1000,750),out=sheet.getContext('2d');out.fillStyle='#11151c';out.fillRect(0,0,1000,750);
for(const [i,color]of ['cyan','blue','green','red','yellow'].entries()){
 const g=createGame(20),canvas=createCanvas(500,250);g.canvas=canvas;g.ctx=canvas.getContext('2d');
 const p=g.player;p.x=2500;p.y=2500;p.size=100;p.color=color;p.colorHex=g.balance.colors.find(c=>c.id===color).color;p.apex=true;p._specialApex=true;p.specialCooldown=0;
 const target=new AIEntity({x:2630,y:2500,color:color==='red'?'blue':'red',colorHex:color==='red'?'#3b82f6':'#ef4444',balance:g.balance,startSize:50});
 const ally=new AIEntity({x:2460,y:2560,color,colorHex:p.colorHex,balance:g.balance,startSize:50});
 g.entities=[p,target,ally];g.camera={x:2500,y:2500,zoom:.48};g.abilities.start(p,0,{x:2630,y:2500});g.render();
 out.drawImage(canvas,(i%2)*500,Math.floor(i/2)*250);out.fillStyle='#fff';out.font='16px sans-serif';out.fillText(color+' · windup',(i%2)*500+16,Math.floor(i/2)*250+24);
}
fs.writeFileSync('reports/ability-telegraphs.png',sheet.toBuffer('image/png'));
console.log('Rendered actual Game.render in native Canvas; browser HUD/input is excluded.');
