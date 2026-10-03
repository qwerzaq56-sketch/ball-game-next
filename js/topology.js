export function wrap(value,extent){return ((value%extent)+extent)%extent;}
export function shortest(value,extent){return wrap(value+extent/2,extent)-extent/2;}
export function delta(a,b,world=a._world??b._world){
 const x=b.x-a.x,y=b.y-a.y;
 return world?.wrap?{x:shortest(x,world.worldWidth),y:shortest(y,world.worldHeight)}:{x,y};
}
export function angleTo(a,b,world){const d=delta(a,b,world);return Math.atan2(d.y,d.x);}
export function near(a,b,world){const d=delta(a,b,world);return {...b,x:a.x+d.x,y:a.y+d.y};}

export function wrappedIntervals(start,end,extent){
 const length=end-start;if(length>=extent)return [[0,extent]];
 const a=wrap(start,extent);return a+length<=extent?[[a,a+length]]:[[a,extent],[0,a+length-extent]];
}
