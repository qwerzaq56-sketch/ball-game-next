import {createGame} from './headless.mjs';
const rows=[];
for(const giant of [120,1000,2000,4000]){
 const g=createGame(1);g.entities=Array.from({length:80},(_,i)=>({id:i+1,alive:true,behavior:'ai',size:i===0?giant:120,color:['blue','red','green','cyan','yellow'][i%5],x:200+(i%10)*450,y:200+Math.floor(i/10)*450}));
 g.buildGrid();let start=performance.now();for(let i=0;i<200;i++)g.allyLinks.refresh();const ally=(performance.now()-start)/200;
 start=performance.now();let count=0;for(let i=0;i<1000;i++)count+=g.getNearbyEntities(g.entities[0],giant).length;const query=(performance.now()-start)/1000;
 rows.push({giant,allyMeanMs:+ally.toFixed(4),queryMeanMs:+query.toFixed(4),returnedPerQuery:count/1000,edges:g.allyLinks.edges.size});
}
console.log(JSON.stringify(rows,null,2));
