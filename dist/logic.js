export const centers=[[0,0],[14,0],[0,14],[14,14]];
export const gems=[[-3,0],[3,0],[14,-3],[17,1],[-2,14],[3,16]];
export function ground(x,z){return centers.some(([cx,cz])=>Math.hypot(x-cx,z-cz)<5.7)||([0,14].some(s=>x>=4&&x<=10&&Math.abs(z-s)<.94))||([0,14].some(s=>z>=4&&z<=10&&Math.abs(x-s)<.94));}
export function patrols(t){return [[7+Math.sin(t*1.2)*2.1,0],[0,7+Math.sin(t*1.2+1)*2.1],[14,7+Math.sin(t*1.2+2)*2.1]];}
const obstacles=centers.flatMap(([x,z])=>[[-2.8,2.5],[2.8,2.5]].map(([a,b])=>[x+a,z+b,.46])).concat([[-2,-2,.7],[11.5,12,.9]]);
export class Garden {
 constructor(){this.reset();}
 reset(){this.x=0;this.y=0;this.z=-2;this.vy=0;this.time=0;this.lives=3;this.collected=new Set();this.mode='ready';this.hurtUntil=0;this.events=[];}
 start(){if(this.mode==='won'||this.mode==='lost')this.reset();this.mode='playing';}
 pause(){if(this.mode==='playing')this.mode='paused';}
 damage(){this.lives--;this.x=0;this.y=0;this.z=-2;this.vy=0;this.hurtUntil=this.time+2;this.events.push('hurt');if(!this.lives)this.mode='lost';}
 step(dt,{x=0,z=0,jump=false,run=false}={}){
  this.events=[];if(this.mode!=='playing')return;dt=Math.min(dt,.05);this.time+=dt;
  const speed=run?6.2:4.2,n=Math.max(1,Math.hypot(x,z));
  let nx=this.x+x/n*speed*dt,nz=this.z+z/n*speed*dt;
  for(const [ox,oz,r] of obstacles){const dx=nx-ox,dz=nz-oz,d=Math.hypot(dx,dz);if(this.y<1.5&&d<r+.27){nx=ox+(dx||.01)/Math.max(d,.01)*(r+.27);nz=oz+dz/Math.max(d,.01)*(r+.27);}}
  this.x=nx;this.z=nz;
  if(jump&&this.y===0&&ground(this.x,this.z))this.vy=7;
  const previous=this.y;this.vy-=20*dt;this.y+=this.vy*dt;
  if(ground(this.x,this.z)&&previous>=0&&this.y<=0){this.y=0;this.vy=0;}
  if(this.y<-5){this.damage();return;}
  gems.forEach(([gx,gz],i)=>{if(!this.collected.has(i)&&Math.hypot(this.x-gx,this.z-gz)<.95&&this.y<1.7&&this.y>=0){this.collected.add(i);this.events.push('gem');}});
  if(this.time>=this.hurtUntil&&this.y<1.8&&this.y>-.5&&patrols(this.time).some(([dx,dz])=>Math.hypot(this.x-dx,this.z-dz)<.9)){this.damage();return;}
  if(this.collected.size===6&&Math.hypot(this.x-14,this.z-16)<1.35&&this.y>=0&&this.y<1.5){this.mode='won';this.events.push('win');}
 }
 snapshot(){return {mode:this.mode,crystals:this.collected.size,lives:this.lives,elapsed:Math.round(this.time),position:{x:this.x,y:this.y,z:this.z}};}
}
