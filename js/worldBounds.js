// Growing past a map dimension must not invert that dimension's clamp interval.
export function boundCenter(value,size,extent){
 return size>=extent?extent/2:Math.min(Math.max(value,size/2),extent-size/2);
}
export function clampEntity(entity,world){
 entity.x=boundCenter(entity.x,entity.size,world.worldWidth);
 entity.y=boundCenter(entity.y,entity.size,world.worldHeight);
 return entity;
}
