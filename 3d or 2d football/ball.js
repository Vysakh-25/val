export function createBall(initial){
  return Object.assign({
    x:14,y:0,z:300,vx:0,vy:0,vz:0,radius:4.5,color:'#ffd',spin:0
  }, initial || {});
}
