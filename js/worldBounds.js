import {wrap} from './topology.js';
// Growing past a map dimension must not invert that dimension's clamp interval.
export function boundCenter(value,size,extent,wrapped=false){
 if(wrapped)return wrap(value,extent);
 return size>=extent?extent/2:Math.min(Math.max(value,size/2),extent-size/2);
}
export function clampEntity(entity,world){
 entity.x=boundCenter(entity.x,entity.size,world.worldWidth,world.wrap);
 entity.y=boundCenter(entity.y,entity.size,world.worldHeight,world.wrap);
 return entity;
}
