import {createGame} from './headless.mjs';
const results=[];
for(const count of [80,160,320]){
 const g=createGame(1);g.entities=Array.from({length:count},(_,i)=>({id:i+1,alive:true,behavior:'ai',size:120,color:['blue','red','green','cyan','yellow'][i%5],x:500+(i%20)*90,y:500+Math.floor(i/20)*90}));
 const start=performance.now();for(let i=0;i<100;i++)g.allyLinks.refresh();
 results.push({count,refreshes:100,meanMilliseconds:Number(((performance.now()-start)/100).toFixed(3)),edges:g.allyLinks.edges.size});
}
console.log(JSON.stringify(results,null,2));
